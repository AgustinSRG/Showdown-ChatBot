/**
 * Bot Module: Tour Leaderboards (Custom)
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');
const Text = Tools('text');
const Chat = Tools('chat');
const parseTourTree = Tools('tour-tree');
const checkDir = Tools('checkdir');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

exports.setup = function (App) {
	if (!App.config.modules.tourldbcustom) {
		App.config.modules.tourldbcustom = Object.create(null);
	}

	checkDir(Path.resolve(App.dataDir, 'tour-tables-custom/'));

	function getLanguage(room) {
		return App.config.language.rooms[room] || App.config.language['default'];
	}

	class TourLeaderBoardsModule {
		constructor() {
			this.db = App.dam.getDataBase('leaderloards-custom.json');
			this.data = this.db.data;
			this.tourData = Object.create(null);

			this.dbOfficial = App.dam.getDataBase('leaderloards-custom-official.json');
			this.isOfficial = this.dbOfficial.data;

			this.dbTourCache = App.dam.getDataBase('leaderloards-custom-tour-cache.json');
			this.tourCacheData = this.dbTourCache.data;

			if (!this.tourCacheData.cache) {
				this.tourCacheData.cache = [];
			}

			if (!this.tourCacheData.next) {
				this.tourCacheData.next = 1;
			}

			this.tourCache = this.tourCacheData.cache;
		}

		findAlias(alias) {
			if (!alias) {
				return "";
			}

			if (App.config.modules.tourldbcustom[alias]) {
				return alias;
			}

			for (let tableId of Object.keys(App.config.modules.tourldbcustom)) {
				const table = App.config.modules.tourldbcustom[tableId];
				if (!table || !table.aliases) continue;
				const aliases = (table.aliases + "").split(",").map(a => {
					return Text.toId(a);
				});
				if (aliases.includes(alias)) {
					return tableId;
				}
			}

			return alias;
		}

		addTourToCache(room, tourData) {
			if (!tourData || typeof tourData !== "object") {
				return;
			}

			const id = this.tourCacheData.next;
			this.tourCacheData.next++;

			this.tourCache.push({
				id: id,
				room: room,
				data: tourData,
				date: (new Date()).toISOString(),
			});

			while (this.tourCache.length > 50) {
				this.tourCache.shift();
			}

			this.dbTourCache.write();
		}

		addUser(leaderboardsId, user, type, auxData, isUndo) {
			let ladder = this.data;
			let userid = Text.toId(user);
			if (!ladder[leaderboardsId]) ladder[leaderboardsId] = Object.create(null);
			if (!ladder[leaderboardsId][userid]) {
				if (isUndo) {
					return;
				} else {
					ladder[leaderboardsId][userid] = [user, 0, 0, 0, 0, 0];
				}
			}
			switch (type) {
				case 'A':
					ladder[leaderboardsId][userid][0] = user; //update user name
					break;
				case 'W':
					if (isUndo) {
						ladder[leaderboardsId][userid][1] = Math.max(0, ladder[leaderboardsId][userid][1] - 1);
					} else {
						ladder[leaderboardsId][userid][1]++;
					}
					break;
				case 'F':
					if (isUndo) {
						ladder[leaderboardsId][userid][2] = Math.max(0, ladder[leaderboardsId][userid][2] - 1);
					} else {
						ladder[leaderboardsId][userid][2]++;
					}
					break;
				case 'S':
					if (isUndo) {
						ladder[leaderboardsId][userid][3] = Math.max(0, ladder[leaderboardsId][userid][3] - 1);
					} else {
						ladder[leaderboardsId][userid][3]++;
					}
					break;
				case 'B':
					let val = parseInt(auxData);
					if (!val) return;
					if (isUndo) {
						ladder[leaderboardsId][userid][4] -= val;
					} else {
						ladder[leaderboardsId][userid][4] += val;
					}
					break;
			}
		}

		getTop(leaderboardsId) {
			let ladder = this.data;
			let config = App.config.modules.tourldbcustom[leaderboardsId];
			if (!config) return null;
			let points = {
				winner: config.winner || 0,
				finalist: config.finalist || 0,
				semifinalist: config.semifinalist || 0,
			};
			if (!ladder[leaderboardsId]) return [];
			let top = [];
			let rank = 0;
			let bannedUsers = new Set((config.banned || "").split(",").map(Text.toId).filter(a => !!a));
			for (let u in ladder[leaderboardsId]) {
				if (bannedUsers.has(u)) {
					continue;
				}
				rank = (points.winner * ladder[leaderboardsId][u][1]) + (points.finalist * ladder[leaderboardsId][u][2]) +
					(points.semifinalist * ladder[leaderboardsId][u][3]) + (ladder[leaderboardsId][u][4]);
				top.push(ladder[leaderboardsId][u].concat([rank]));
			}
			return top.sort(function (a, b) {
				if (a[6] !== b[6]) return b[6] - a[6]; //Points
				if (a[1] !== b[1]) return b[1] - a[1]; //Wins
				if (a[2] !== b[2]) return b[2] - a[2]; //Finals
				if (a[3] !== b[3]) return b[3] - a[3]; //Semis
				if (a[4] !== b[4]) return b[4] - a[4]; //Extra
				return 0;
			});
		}

		getUserName(leaderboardsId, user) {
			let userid = Text.toId(user);
			let ladder = this.data;
			if (!ladder[leaderboardsId] || !ladder[leaderboardsId][userid]) return user;
			return ladder[leaderboardsId][userid][0] || user;
		}

		getUserPoints(leaderboardsId, user) {
			let userid = Text.toId(user);
			let ladder = this.data;
			let config = App.config.modules.tourldbcustom[leaderboardsId];
			if (!config) return null;
			let points = {
				winner: config.winner || 0,
				finalist: config.finalist || 0,
				semifinalist: config.semifinalist || 0,
			};
			let res = {
				name: user,
				wins: 0,
				finals: 0,
				semis: 0,
				extra: 0,
				points: 0,
			};
			if (!ladder[leaderboardsId] || !ladder[leaderboardsId][userid]) return res;
			res.name = ladder[leaderboardsId][userid][0];
			res.wins = ladder[leaderboardsId][userid][1];
			res.finals = ladder[leaderboardsId][userid][2];
			res.semis = ladder[leaderboardsId][userid][3];
			res.extra = ladder[leaderboardsId][userid][4];
			res.points = (points.winner * res.wins) + (res.finals * points.finalist) +
				(res.semis * points.semifinalist) + (res.extra);
			return res;
		}

		makeTableHTML(leaderboardsId) {
			let config = App.config.modules.tourldbcustom[leaderboardsId];
			if (!config) return "";
			let top = this.getTop(leaderboardsId);
			if (!top) return "";
			let html = '';
			html += '<html>';
			if (config.customTitle) {
				html += '<head><title>' + Text.escapeHTML(config.customTitle) + '</title>' +
					'<style>td {padding:5px;}</style></head>';
			} else {
				html += '<head><title>Leaderboards of ' + Text.escapeHTML(config.name || leaderboardsId) + '</title>' +
					'<style>td {padding:5px;}</style></head>';
			}

			html += '<body>';
			html += '<div align="center" style="padding:5px;">';
			if (config.customTitle) {
				html += '<h1>' + Text.escapeHTML(config.customTitle) + '</h1>';
			} else {
				html += '<h1>Tours Leaderboards</h1>';
				html += '<h2>' + Text.escapeHTML(config.name || leaderboardsId) + '</h2>';
			}

			if (config.description) {
				html += '<p style="text-align: center;">' + Chat.parseMessage(Text.escapeHTML(config.description)) + '</p>';
			}

			html += '<table width="100%" border="1">';
			html += '<tr><td><div align="center"><h3><strong>#</strong></h3></div></td>' +
				'<td><div align="center"><h3><strong>Name</strong></h3></div></td>' +
				'<td><div align="center"><h3><strong>Points</strong></h3></div></td>' +
				'<td><div align="center"><h3><strong>Winner </strong></h3></div></td>' +
				'<td><div align="center"><h3><strong>Finalist</strong></h3></div></td>' +
				'<td><div align="center"><h3><strong>Semi-Finalist</strong></h3></div></td>' +
				'<td><div align="center"><h3><strong>Extra Points</strong></h3></div></td></tr>';

			for (let i = 0; i < top.length && i < 1000; i++) {
				html += '<tr>';
				html += '<td><div align="center">' + (i + 1) + '</div></td>';
				html += '<td><div align="center">' + top[i][0] + '</div></td>';
				html += '<td><div align="center">' + top[i][6] + '</div></td>';
				html += '<td><div align="center">' + top[i][1] + '</div></td>';
				html += '<td><div align="center">' + top[i][2] + '</div></td>';
				html += '<td><div align="center">' + top[i][3] + '</div></td>';
				html += '<td><div align="center">' + top[i][4] + '</div></td>';
				html += '</tr>';
			}

			html += '</table>';

			let now = new Date();
			html += '<p><strong>Last Updated: ' + now.toString() + '</strong></p>';
			if (config.cleanPoint) {
				html += '<p><strong>Clear Point: ' + config.cleanPoint + '</strong></p>';
			}
			html += '</div>';
			html += '</body>';
			html += '</html>';
			return html;
		}

		generateTable(leaderboardsId) {
			let tableFile = Path.resolve(App.dataDir, 'tour-tables-custom', leaderboardsId + '.html');
			let html = this.makeTableHTML(leaderboardsId);
			FileSystem.writeFileSync(tableFile, html);
		}

		applyTourResults(leaderboardsId, data, undo) {
			let config = App.config.modules.tourldbcustom[leaderboardsId];
			if (!config) return;
			let results = getResults(data);
			if (!results) return;
			if (!this.data[leaderboardsId]) this.data[leaderboardsId] = Object.create(null);
			if (results.winner) {
				if (results.winner instanceof Array) {
					for (let win of results.winner) {
						this.addUser(leaderboardsId, results.players[win] || win, 'A', null, undo);
						this.addUser(leaderboardsId, win, 'W', null, undo);
					}
				} else {
					this.addUser(leaderboardsId, results.players[results.winner] || results.winner, 'A', null, undo);
					this.addUser(leaderboardsId, results.winner, 'W', null, undo);
				}
			}
			if (results.finalist) {
				if (results.finalist instanceof Array) {
					for (let finalist of results.finalist) {
						this.addUser(leaderboardsId, results.players[finalist] || finalist, 'A', null, undo);
						this.addUser(leaderboardsId, finalist, 'F', null, undo);
					}
				} else {
					this.addUser(leaderboardsId, results.players[results.finalist] || results.finalist, 'A', null, undo);
					this.addUser(leaderboardsId, results.finalist, 'F', null, undo);
				}
			}
			for (let i = 0; i < results.semiFinalists.length; i++) {
				this.addUser(leaderboardsId, results.players[results.semiFinalists[i]] || results.semiFinalists[i], 'A', null, undo);
				this.addUser(leaderboardsId, results.semiFinalists[i], 'S', null, undo);
			}
			this.db.write();
			this.generateTable(leaderboardsId);
			return results;
		}

		parseTourResults(room, data) {
			let officialApplied = null;
			if (this.isOfficial[room]) {
				const leaderboardsId = Text.toId(this.isOfficial[room] + "");
				officialApplied = leaderboardsId;
				const config = App.config.modules.tourldbcustom[leaderboardsId];
				if (config) {
					const results = this.applyTourResults(leaderboardsId, data);

					if (!config.silent) {
						this.sendResultsTable(room, leaderboardsId, results);
					}
				}
			}

			// Check auto
			for (let leaderboardsId of Object.keys(App.config.modules.tourldbcustom)) {
				if (leaderboardsId === officialApplied) {
					continue;
				}
				const config = App.config.modules.tourldbcustom[leaderboardsId];

				if (!config || !config.automated || config.room !== room) {
					continue;
				}

				const results = this.applyTourResults(leaderboardsId, data);

				if (!config.silent) {
					this.sendResultsTable(room, leaderboardsId, results);
				}
			}
		}

		sendResultsTable(room, leaderboardsId, results) {
			let top = this.getTop(leaderboardsId);
			if (!top || !top.length) {
				return;
			}

			const maxTableLength = 10;

			let config = App.config.modules.tourldbcustom[leaderboardsId];

			if (!config) {
				return;
			}

			function mlt(key) {
				return App.multilang.mlt(Lang_File, getLanguage(room), key);
			}

			let server = App.config.server.url;

			let html = '';

			if (config.customTitle) {
				html += '<h3 style="text-align:center;">' + Text.escapeHTML(config.customTitle) + '</h3>';
			} else {
				html += '<h3 style="text-align:center;">' + Text.escapeHTML(config.name || leaderboardsId) + " | " + Text.escapeHTML(mlt(28)) + '</h3>';
			}

			if (config.description) {
				html += '<p style="text-align:center;">' + Chat.parseMessage(Text.escapeHTML(config.description)) + '</p>';
			}

			html += '<div style="overflow: auto; height: 120px; width: 100%;">';

			if (config.winner > 0 && results.winner) {
				let winners = results.winner;
				if (!(winners instanceof Array)) {
					winners = [winners];
				}

				if (winners.length > 0) {
					html += '<p style="text-align:center;"><b>+' + Text.escapeHTML(config.winner) + "</b> " + Text.escapeHTML(mlt(5)) + ": " + winners.map(winner => {
						return "<b>" + Text.escapeHTML(this.getUserName(leaderboardsId, winner)) + "</b>";
					}).join(", ") + "</p>";
				}
			}

			if (config.finalist > 0 && results.finalist) {
				let finalists = results.finalist;
				if (!(finalists instanceof Array)) {
					finalists = [finalists];
				}

				if (finalists.length > 0) {
					html += '<p style="text-align:center;"><b>+' + Text.escapeHTML(config.finalist) + "</b> " + Text.escapeHTML(mlt(6)) + ": " + finalists.map(finalist => {
						return "<b>" + Text.escapeHTML(this.getUserName(leaderboardsId, finalist)) + "</b>";
					}).join(", ") + "</p>";
				}
			}

			if (config.semifinalist > 0 && results.semiFinalists) {
				let finalists = results.semiFinalists;
				if (!(finalists instanceof Array)) {
					finalists = [finalists];
				}

				if (finalists.length > 0) {
					html += '<p style="text-align:center;"><b>+' + Text.escapeHTML(config.semifinalist) + "</b> " + Text.escapeHTML(mlt(7)) + ": " + finalists.map(finalist => {
						return "<b>" + Text.escapeHTML(this.getUserName(leaderboardsId, finalist)) + "</b>";
					}).join(", ") + "</p>";
				}
			}

			html += '<table border="1" cellspacing="0" cellpadding="3" style="min-width:100%;">';

			html += '<tr>';
			html += '<th>#</th>';
			html += '<th>' + Text.escapeHTML(mlt("user")) + '</th>';
			html += '<th>' + Text.escapeHTML(mlt(19)) + '</th>';
			html += '<th>' + Text.escapeHTML(mlt(20)) + '</th>';
			html += '<th>' + Text.escapeHTML(mlt(21)) + '</th>';
			html += '<th>' + Text.escapeHTML(mlt(22)) + '</th>';
			html += '<th>' + Text.escapeHTML(mlt("extra")) + '</th>';
			html += '</tr>';

			for (let i = 0; i < maxTableLength && i < top.length; i++) {
				html += '<tr>';

				html += '<td style="text-align:center;"><b>' + (i + 1) + '</b></td>';

				html += '<td><b>' + Text.escapeHTML(top[i][0]) + '</b></td>';

				html += '<td>' + Text.escapeHTML(top[i][6] + "") + '</td>';

				html += '<td>' + top[i][1] + '</td>';

				html += '<td>' + top[i][2] + '</td>';

				html += '<td>' + top[i][3] + '</td>';

				html += '<td>' + top[i][4] + '</td>';

				html += '</tr>';
			}

			html += '</table>';

			html += '<p>' + Text.escapeHTML(mlt(31)) + ': ' + Text.escapeHTML(config.cleanPoint || "-") + '</p>';

			if (server) {
				let fullTablelink;
				if (server.charAt(server.length - 1) === '/') {
					fullTablelink = App.config.server.url + 'tourtablecustom/' + leaderboardsId + '/get';
				} else {
					fullTablelink = App.config.server.url + '/tourtablecustom/' + leaderboardsId + '/get';
				}

				html += '<p>' + Text.escapeHTML(mlt(32)) + ': <a href="' + fullTablelink + '">' + fullTablelink + '</a></p>';
			}

			html += '</div>';

			App.bot.sendTo(room, "/addhtmlbox " + html);
		}
	}

	const TourLeaderBoardsMod = new TourLeaderBoardsModule();

	const tourData = TourLeaderBoardsMod.tourData;
	const isOfficial = TourLeaderBoardsMod.isOfficial;

	function getResults(data) {
		let generator = Text.toId(data.generator || "");
		if ((generator + "").endsWith("elimination")) {
			let res = Object.create(null);
			let parsedTree = parseTourTree(data.bracketData.rootNode);
			res.players = Object.create(null);
			for (let player of Object.keys(parsedTree)) {
				res.players[Text.toId(player)] = player;
			}
			res.general = Object.create(null);
			for (let i in parsedTree) {
				res.general[Text.toId(i)] = parsedTree[i];
			}
			res.winner = Text.toId(data.results[0][0]);
			res.finalist = "";
			res.semiFinalists = [];
			let aux, aux2;
			if (data.bracketData.rootNode.children) {
				for (let f = 0; f < data.bracketData.rootNode.children.length; f++) {
					aux = Text.toId(data.bracketData.rootNode.children[f].team || "");
					if (aux && aux !== res.winner) {
						res.finalist = aux;
					}
					if (data.bracketData.rootNode.children[f].children) {
						for (let j = 0; j < data.bracketData.rootNode.children[f].children.length; j++) {
							aux2 = Text.toId(data.bracketData.rootNode.children[f].children[j].team || "");
							if (aux2 && aux2 !== res.winner && aux2 !== res.finalist && res.semiFinalists.indexOf(aux2) < 0) {
								res.semiFinalists.push(aux2);
							}
						}
					}
				}
			}
			return res;
		} else if ((generator + "").endsWith("roundrobin")) {
			let res = Object.create(null);
			res.players = Object.create(null);
			for (let player of data.bracketData.tableHeaders.cols) {
				res.players[Text.toId(player)] = player;
			}
			res.general = Object.create(null);
			for (let i = 0; i < data.bracketData.tableHeaders.cols.length; i++) {
				res.general[Text.toId(data.bracketData.tableHeaders.cols[i])] = data.bracketData.scores[i];
			}
			res.winner = data.results[0];
			res.finalist = data.results[1];
			res.semiFinalists = data.results[2] || [];
			return res;
		} else {
			App.log("Incompatible generator: " + data.generator);
			return null; //Not compatible generator
		}
	}

	App.bot.on('line', (room, line, spl, isIntro) => {
		if (spl[0] !== 'tournament') return;

		if (spl[1] === "end") {
			let data = null;
			try {
				data = JSON.parseNoPrototype(spl.slice(2).join("|"));
			} catch (e) {
				App.log("INVALID TOUR DATA: " + spl.slice(2).join("|"));
			}
			TourLeaderBoardsMod.addTourToCache(room, data);
		}

		if (isIntro) return;
		if (!tourData[room]) tourData[room] = Object.create(null);
		switch (spl[1]) {
			case 'update':
				try {
					let data = JSON.parseNoPrototype(spl.slice(2).join("|"));
					for (let i in data) {
						tourData[room][i] = data[i];
					}
				} catch (e) {
					App.log("INVALID TOUR DATA: " + spl.slice(2).join("|"));
				}
				break;
			case 'end':
				try {
					let data = JSON.parseNoPrototype(spl[2]);
					for (let i in data) {
						tourData[room][i] = data[i];
					}
				} catch (e) {
					App.log("INVALID TOUR DATA: " + spl[2]);
				}
				TourLeaderBoardsMod.parseTourResults(room, tourData[room]);
				delete tourData[room];
				delete isOfficial[room];
				TourLeaderBoardsMod.dbOfficial.write();
				break;
			case 'forceend':
				delete tourData[room];
				delete isOfficial[room];
				TourLeaderBoardsMod.dbOfficial.write();
				break;
		}
	});

	App.bot.on('disconnect', () => {
		for (let room in tourData) {
			delete tourData[room];
		}
	});

	return TourLeaderBoardsMod;
};
