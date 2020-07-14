/**
 * Bot Module: Tour Command
 */

'use strict';

const Text = Tools('text');
const Path = require('path');
const Tournament = require(Path.resolve(__dirname, 'tournament.js'));

const Lang_File = Path.resolve(__dirname, 'tournaments.translations');
const Lang_File_Err = Path.resolve(__dirname, 'errors.translations');

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
			aliases: {},
			finalAnnouncement: {},
			congratsWinner: {},
		};
	}

	const Config = App.config.modules.tourcmd;

	class TourCommandModule {
		constructor() {
			this.tourData = {};
			this.tournaments = {};
		}

		newTour(room, details) {
			if (this.tournaments[room]) {
				if (this.tournaments[room].startTimer) clearTimeout(this.tournaments[room].startTimer);
				delete this.tournaments[room];
			}
			this.tournaments[room] = new Tournament(App, room, details);
			this.tournaments[room].create();
		}
	}

	const TourCommandMod = new TourCommandModule();
	const tourData = TourCommandMod.tourData;
	const tournaments = TourCommandMod.tournaments;

	function getLanguage(room) {
		return App.config.language.rooms[room] || App.config.language['default'];
	}

	function parseErrorMessage(room, spl) {
		if (!tournaments[room] || tourData[room]) return;
		let msg = spl.slice(1).join('|');
		console.log("Error: " + msg);
		/* Specific error messages, may be updated frecuently */
		if (msg.indexOf("Tournaments are disabled in this room") === 0) {
			App.bot.sendTo(room, App.multilang.mlt(Lang_File_Err, getLanguage(room), 0));
		} else if (msg === "/tournament - Access denied.") {
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
		if (spl[0] !== 'tournament') return;
		if (!tourData[room]) tourData[room] = {};
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
					let data = JSON.parse(spl[2]);
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
							if (data.bracketData.rootNode.children) {
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
					let data = JSON.parse(spl[2]);
					for (let i in data) {
						tourData[room][i] = data[i];
					}
				} catch (e) { }
				if (Config.congratsWinner && Config.congratsWinner[room]) {
					if (tourData[room] && tourData[room].results && tourData[room].results[0]) {
						congratulateTournamentWinner(room, tourData[room].results[0]);
					}
				}
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
	});

	return TourCommandMod;
};
