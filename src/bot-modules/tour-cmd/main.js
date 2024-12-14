/**
 * Bot Module: Tour Command
 */

'use strict';

const Text = Tools('text');
const Path = require('path');
const randomize = Tools('randomize');
const Tournament = require(Path.resolve(__dirname, 'tournament.js'));

const Lang_File = Path.resolve(__dirname, 'tournaments.translations');
const Lang_File_Err = Path.resolve(__dirname, 'errors.translations');

const MAX_TOUR_LOG_LENGTH = 20;

exports.setup = function (App) {
	if (!App.config.modules.tourcmd) {
		App.config.modules.tourcmd = {
			format: 'randombattle',
			type: 'elimination',
			maxUsers: 0,
			time: (30 * 1000),
			autodq: 2,
			scoutProtect: false,
			createMessage: '',
			aliases: Object.create(null),
			finalAnnouncement: Object.create(null),
			congratsWinner: Object.create(null),
		};
	}

	const Config = App.config.modules.tourcmd;

	class TourCommandModule {
		constructor() {
			this.tourData = Object.create(null);
			this.tournaments = Object.create(null);

			this.tourLogDB = App.dam.getDataBase('tournaments-log.json');
			this.tourLog = this.tourLogDB.data;

			this.tourPollDB = App.dam.getDataBase('tournaments-poll.json');
			this.tourPoll = this.tourPollDB.data;
			this.tourPollWait = Object.create(null);

			this.tourPollSetsDB = App.dam.getDataBase('tournaments-poll-sets.json');
			this.tourPollSets = this.tourPollSetsDB.data;
		}

		newTour(room, details) {
			if (this.tournaments[room]) {
				if (this.tournaments[room].startTimer) clearTimeout(this.tournaments[room].startTimer);
				delete this.tournaments[room];
			}
			this.tournaments[room] = new Tournament(App, room, details);
			this.tournaments[room].create();
		}

		getPollSet(setId) {
			if (!setId) {
				setId = "default";
			}

			if (!this.tourPollSets[setId]) {
				if (setId === "default" || setId === "rand" || setId === "random") {
					// All formats
					return randomize(Object.values(App.bot.formats).filter(f => !f.team && !f.disableTournaments && f.chall).map(f => f.name));
				}

				if (setId === "all") {
					// Random formats
					return randomize(Object.values(App.bot.formats).filter(f => !f.disableTournaments && f.chall).map(f => f.name));
				}

				if (setId === "team" || setId === "build") {
					// Team formats
					return randomize(Object.values(App.bot.formats).filter(f => f.team && !f.disableTournaments && f.chall).map(f => f.name));
				}

				return [];
			}

			return randomize((this.tourPollSets[setId].formats || []).map(f => {
				const formatData = App.bot.formats[Text.toId(f)];

				if (!formatData || formatData.disableTournaments || !formatData.chall) {
					return "";
				}

				return App.bot.formats[Text.toId(f)].name;
			}).filter(f => !!f));
		}

		setupPoolWait(room, details) {
			this.tourPollWait[room] = {
				details: details,
			};
		}

		addToTournamentLog(room, data) {
			let winner = "-";

			if (data.results && Array.isArray(data.results) && data.results.length > 0) {
				winner = Array.isArray(data.results[0]) ? data.results[0].join(", ") : (data.results[0] || "-");
			}

			let generator = data.generator || "-";
			let format = data.format || "";

			if (App.bot.formats[Text.toId(format)]) {
				format = App.bot.formats[Text.toId(format)].name;
			}

			if (!this.tourLog[room]) {
				this.tourLog[room] = [];
			}

			if (this.tourLog[room].length >= MAX_TOUR_LOG_LENGTH) {
				this.tourLog[room].pop();
			}

			this.tourLog[room].unshift({
				time: Date.now(),
				generator: generator,
				format: format,
				winner: winner,
			});

			this.tourLogDB.write();
		}

		getTournamentLog(room) {
			if (!this.tourLog[room]) {
				return [];
			}

			return this.tourLog[room];
		}
	}

	const TourCommandMod = new TourCommandModule();
	const tourData = TourCommandMod.tourData;
	const tournaments = TourCommandMod.tournaments;

	function getLanguage(room) {
		return App.config.language.rooms[room] || App.config.language['default'];
	}

	function parseErrorMessage(room, spl) {
		let msg = spl.slice(1).join('|');

		if (TourCommandMod.tourPollWait[room]) {
			delete TourCommandMod.tourPollWait[room];
			App.bot.sendTo(room, App.multilang.mlt(Lang_File_Err, getLanguage(room), 4) + ": " + msg);
			return;
		}

		if (!tournaments[room] || tourData[room]) {
			if (tourData[room] && msg.startsWith("Custom rule error:")) {
				App.bot.sendTo(room, App.multilang.mlt(Lang_File_Err, getLanguage(room), 3) + " / " + msg.substr("Custom rule error:".length));
			}
			return;
		}
		/* Specific error messages, may be updated frequently */
		if (msg.indexOf("Tournaments are disabled in this room") === 0) {
			App.bot.sendTo(room, App.multilang.mlt(Lang_File_Err, getLanguage(room), 0));
		} else if (msg === "/tournament - Access denied." || msg === "/tournament create - Access denied.") {
			App.bot.sendTo(room, App.multilang.mlt(Lang_File_Err, getLanguage(room), 1));
		} else if (msg === "The server is restarting soon, so a tournament cannot be created.") {
			App.bot.sendTo(room, App.multilang.mlt(Lang_File_Err, getLanguage(room), 2));
		} else {
			return;
		}
		if (tournaments[room].startTimer) clearTimeout(tournaments[room].startTimer);
		delete tournaments[room];
		delete tourData[room];
	}

	function onPollStarted(room) {
		if (TourCommandMod.tourPollWait[room]) {
			TourCommandMod.tourPoll[room] = {
				details: TourCommandMod.tourPollWait[room].details,
			};

			TourCommandMod.tourPollDB.write();

			delete TourCommandMod.tourPollWait[room];

			// Set timer
			App.bot.sendTo(room, "/poll timer " + TourCommandMod.tourPoll[room].details.pollTime);

			return;
		}
	}

	function parsePollResults(html) {
		const results = [];
		for (let i = 0; i < 10; i++) {
			const optionPrefix = (i + 1) + '. <strong>';

			const optionHtmlIndex = html.indexOf(optionPrefix);

			if (optionHtmlIndex === -1) {
				continue;
			}

			let htmlPart = html.substring(optionHtmlIndex + optionPrefix.length);

			const endTagIndex = htmlPart.indexOf("</strong>");

			if (endTagIndex === -1) {
				return;
			}

			const format = htmlPart.substring(0, endTagIndex);

			const smallTagIndex = htmlPart.indexOf("<small>(");

			if (smallTagIndex === -1) {
				return;
			}

			htmlPart = htmlPart.substring(smallTagIndex + "<small>(".length);

			const votes = parseInt(htmlPart.split(" ")[0]);

			if (!votes) {
				continue;
			}

			results.push({
				format: format,
				votes: votes,
			});
		}

		return results;
	}

	function onPollEnded(room, spl) {
		if (!room) {
			return;
		}

		if (!TourCommandMod.tourPoll[room]) {
			return;
		}

		const details = TourCommandMod.tourPoll[room].details;
		const html = spl.slice(1).join('|');

		if (!html.startsWith('<div class="infobox">') || html.indexOf('<i class="fa fa-bar-chart"></i>') === -1) {
			return; // No poll
		}

		delete TourCommandMod.tourPoll[room];
		TourCommandMod.tourPollDB.write();

		const pollResults = parsePollResults(html);

		if (pollResults.length === 0) {
			return;
		}

		let mostVotesFormat = "";
		let mostVotes = 0;

		for (let result of pollResults) {
			if (result.votes <= mostVotes) {
				continue;
			}

			mostVotesFormat = Text.toId(result.format);
			mostVotes = result.votes;
		}

		if (!mostVotesFormat || !App.bot.formats[mostVotesFormat]) {
			// Format not found
			return;
		}

		details.format = mostVotesFormat;

		// Start the tournament
		TourCommandMod.newTour(room, details);
	}

	function botCanWall(room) {
		let roomData = App.bot.rooms[room];
		let botid = Text.toId(App.bot.getBotNick());
		return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'driver'));
	}

	function announceTournamentFinal(room, link) {
		if (botCanWall) {
			App.bot.sendTo(room, "/wall " + App.multilang.mlt(Lang_File, getLanguage(room), 'final', { battle: link }));
		} else {
			App.bot.sendTo(room, App.multilang.mlt(Lang_File, getLanguage(room), 'final', { battle: link }));
		}
	}

	function congratulateTournamentWinner(room, players) {
		if (!players || !players.length) return;

		let text = "" + players[0];
		for (let i = 1; i < players.length; i++) {
			if (i === players.length - 1) {
				text += " " + App.multilang.mlt(Lang_File, getLanguage(room), 'and') + " " + players[i];
			} else {
				text += ", " + players[i];
			}
		}

		if (botCanWall) {
			App.bot.sendTo(room, "/wall " + App.multilang.mlt(Lang_File, getLanguage(room), 'winner', { winners: text }));
		} else {
			App.bot.sendTo(room, App.multilang.mlt(Lang_File, getLanguage(room), 'winner', { winners: text }));
		}
	}

	App.bot.on('line', (room, line, spl, isIntro) => {
		if (isIntro) return;
		if (spl[0] === 'error') return parseErrorMessage(room, spl);
		if (spl[0] === 'uhtml' && (spl[1] + "").startsWith("poll")) return onPollStarted(room);
		if (spl[0] === 'html') return onPollEnded(room, spl);
		if (spl[0] !== 'tournament') return;
		if (!tourData[room]) tourData[room] = Object.create(null);
		switch (spl[1]) {
			case 'create':
				if (!tournaments[room]) break;
				tournaments[room].startTimeout();
				break;
			case 'join':
				if (!tournaments[room]) break;
				tournaments[room].users++;
				tournaments[room].checkUsers();
				break;
			case 'leave':
				if (!tournaments[room]) break;
				tournaments[room].users--;
				tournaments[room].checkUsers();
				break;
			case 'start':
				if (!tournaments[room]) break;
				if (tournaments[room].signups) {
					tournaments[room].signups = false;
				}
				break;
			case 'update':
				try {
					let data = JSON.parseNoPrototype(spl[2]);
					for (let i in data) {
						tourData[room][i] = data[i];
					}
				} catch (e) { }
				break;
			case 'updateEnd':
				if (!tournaments[room]) break;
				if (tournaments[room].started && !tourData[room].isStarted) {
					tournaments[room].start();
				}
				break;
			case 'battlestart':
				let p1 = Text.toId(spl[2]);
				let p2 = Text.toId(spl[3]);
				let link = Text.toRoomid(spl[4]);
				if (p1 && p2 && link) {
					if (Config.finalAnnouncement && Config.finalAnnouncement[room]) {
						if (tourData[room] && Text.toId(tourData[room].generator) === "singleelimination") {
							let data = tourData[room];
							let p1C = false, p2C = false;
							if (data && data.bracketData && data.bracketData.rootNode && data.bracketData.rootNode.children) {
								for (let f = 0; f < data.bracketData.rootNode.children.length; f++) {
									let team = Text.toId(data.bracketData.rootNode.children[f].team || "");
									if (p1 === team) {
										p1C = true;
									}
									if (p2 === team) {
										p2C = true;
									}
								}
							}
							if (p1C && p2C) {
								announceTournamentFinal(room, link);
							}
						}
					}
				}
				break;
			case 'end':
				try {
					let data = JSON.parseNoPrototype(spl[2]);
					for (let i in data) {
						tourData[room][i] = data[i];
					}
				} catch (e) { }
				if (Config.congratsWinner && Config.congratsWinner[room]) {
					if (tourData[room] && tourData[room].results && tourData[room].results[0]) {
						congratulateTournamentWinner(room, tourData[room].results[0]);
					}
				}
				TourCommandMod.addToTournamentLog(room, tourData[room]);
				delete tourData[room];
				if (tournaments[room] && tournaments[room].startTimer) clearTimeout(tournaments[room].startTimer);
				if (tournaments[room]) delete tournaments[room];
				break;
			case 'forceend':
				delete tourData[room];
				if (tournaments[room] && tournaments[room].startTimer) clearTimeout(tournaments[room].startTimer);
				if (tournaments[room]) delete tournaments[room];
				break;
		}
	});

	App.bot.on('disconnect', () => {
		for (let room in tourData) {
			delete tourData[room];
		}
		for (let room in tournaments) {
			if (tournaments[room].startTimer) clearTimeout(tournaments[room].startTimer);
			delete tournaments[room];
		}
		TourCommandMod.tourPollWait = Object.create(null);
	});

	return TourCommandMod;
};
