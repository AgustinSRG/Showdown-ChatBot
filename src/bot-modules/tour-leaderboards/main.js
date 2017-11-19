/**
 * Bot Module: Tour Leaderboards
 */

'use strict';

const Top_Table_Length = 100;

const Path = require('path');
const FileSystem = require('fs');
const Text = Tools('text');
const parseTourTree = Tools('tour-tree');
const checkDir = Tools('checkdir');

function toDecimalFormat(num) {
	num = Math.floor(num * 100) / 100;
	num = "" + num;
	let decimal = num.split(".")[1];
	if (decimal) {
		while (decimal.length < 2) {
			decimal += "0";
			num += "0";
		}
		return num;
	} else {
		return num + ".00";
	}
}

exports.setup = function (App) {
	if (!App.config.modules.tourleaderboards) {
		App.config.modules.tourleaderboards = {};
	}

	checkDir(Path.resolve(App.dataDir, 'tour-tables/'));

	class TourLeaderBoardsModule {
		constructor() {
			this.db = App.dam.getDataBase('leaderloards.json');
			this.data = this.db.data;
			this.tourData = {};
			this.isOfficial = {};
		}

		addUser(room, user, type, auxData) {
			let ladder = this.data;
			let userid = Text.toId(user);
			if (!ladder[room]) ladder[room] = {};
			if (!ladder[room][userid]) ladder[room][userid] = [user, 0, 0, 0, 0, 0];
			switch (type) {
			case 'A':
				ladder[room][userid][0] = user; //update user name
				ladder[room][userid][5]++;
				break;
			case 'W':
				ladder[room][userid][1]++;
				break;
			case 'F':
				ladder[room][userid][2]++;
				break;
			case 'S':
				ladder[room][userid][3]++;
				break;
			case 'B':
				let val = parseInt(auxData);
				if (!val) return;
				ladder[room][userid][4] += val;
				break;
			}
		}

		getTop(room) {
			let ladder = this.data;
			let config = App.config.modules.tourleaderboards[room];
			if (!config) return null;
			let points = {
				winner: config.winner || 0,
				finalist: config.finalist || 0,
				semifinalist: config.semifinalist || 0,
				battle: config.battle || 0,
			};
			if (!ladder[room]) return [];
			let top = [];
			let rank = 0;
			for (let u in ladder[room]) {
				rank = (points.winner * ladder[room][u][1]) + (points.finalist * ladder[room][u][2]) +
				(points.semifinalist * ladder[room][u][3]) + (points.battle * ladder[room][u][4]);
				if (config.useratio) {
					rank = rank * (ladder[room][u][4] / ladder[room][u][5]);
				}
				top.push(ladder[room][u].concat([rank]));
			}
			return top.sort(function (a, b) {
				if (a[6] !== b[6]) return b[6] - a[6]; //Points
				if (a[1] !== b[1]) return b[1] - a[1]; //Wins
				if (a[2] !== b[2]) return b[2] - a[2]; //Finals
				if (a[3] !== b[3]) return b[3] - a[3]; //Semis
				if (a[4] !== b[4]) return b[4] - a[4]; //Battles
				if (a[5] !== b[5]) return b[5] - a[5]; //Tours played
				return 0;
			});
		}

		getUserPoints(room, user) {
			let userid = Text.toId(user);
			let ladder = this.data;
			let config = App.config.modules.tourleaderboards[room];
			if (!config) return null;
			let points = {
				winner: config.winner || 0,
				finalist: config.finalist || 0,
				semifinalist: config.semifinalist || 0,
				battle: config.battle || 0,
			};
			let res = {
				name: user,
				room: room,
				wins: 0,
				finals: 0,
				semis: 0,
				battles: 0,
				tours: 0,
				points: 0,
				ratio: 0,
			};
			if (!ladder[room] || !ladder[room][userid]) return res;
			res.name = ladder[room][userid][0];
			res.wins = ladder[room][userid][1];
			res.finals = ladder[room][userid][2];
			res.semis = ladder[room][userid][3];
			res.battles = ladder[room][userid][4];
			res.tours = ladder[room][userid][5];
			res.ratio = ladder[room][userid][4] / ladder[room][userid][5];
			res.points = (points.winner * res.wins) + (res.finals * points.finalist) +
			(res.semis * points.semifinalist) + (res.battles * points.battle);
			if (config.useratio) {
				res.points = res.points * (ladder[room][userid][4] / ladder[room][userid][5]);
			}
			return res;
		}

		generateTable(room) {
			let tableFile = Path.resolve(App.dataDir, 'tour-tables', room + '.html');
			let config = App.config.modules.tourleaderboards[room];
			if (!config) return;
			let top = this.getTop(room);
			if (!top) return;
			let html = '';
			html += '<html>';
			html += '<head><title>Leaderboards of ' + Text.escapeHTML(App.parser.getRoomTitle(room)) + '</title>' +
			'<style>td {padding:5px;}</style></head>';
			html += '<body>';
			html += '<div align="center" style="padding:5px;">';
			html += '<h1>Tours Leaderboards</h1>';
			html += '<h2>Room: ' + Text.escapeHTML(App.parser.getRoomTitle(room)) + '</h2>';
			html += '<table width="100%" border="1">';
			html += '<tr><td><div align="center"><h3><strong>#</strong></h3></div></td>' +
			'<td><div align="center"><h3><strong>Name</strong></h3></div></td>' +
			'<td><div align="center"><h3><strong>Points</strong></h3></div></td>' +
			'<td><div align="center"><h3><strong>Winner </strong></h3></div></td>' +
			'<td><div align="center"><h3><strong>Finalist</strong></h3></div></td>' +
			'<td><div align="center"><h3><strong>Semi-Finalist</strong></h3></div></td>' +
			'<td><div align="center"><h3><strong>Battles Won </strong></h3></div></td>' +
			'<td><div align="center"><h3><strong>Tours Played </strong></h3></div></td>' +
			'<td><div align="center"><h3><strong>Ratio </strong></h3></div></td></tr>';

			for (let i = 0; i < top.length && i < Top_Table_Length; i++) {
				html += '<tr>';
				html += '<td><div align="center">' + (i + 1) + '</div></td>';
				html += '<td><div align="center">' + top[i][0] + '</div></td>';
				html += '<td><div align="center">' + toDecimalFormat(top[i][6]) + '</div></td>';
				html += '<td><div align="center">' + top[i][1] + '</div></td>';
				html += '<td><div align="center">' + top[i][2] + '</div></td>';
				html += '<td><div align="center">' + top[i][3] + '</div></td>';
				html += '<td><div align="center">' + top[i][4] + '</div></td>';
				html += '<td><div align="center">' + top[i][5] + '</div></td>';
				html += '<td><div align="center">' + toDecimalFormat(top[i][4] / top[i][5]) + '</div></td>';
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
			FileSystem.writeFileSync(tableFile, html);
		}

		parseTourResults(room, data) {
			let config = App.config.modules.tourleaderboards[room];
			if (!config) return;
			if (config.onlyOfficial && !this.isOfficial[room]) return;
			let results = getResults(data);
			if (!results) return;
			if (!this.data[room]) this.data[room] = {};
			for (let i = 0; i < results.players.length; i++) {
				this.addUser(room, results.players[i], 'A');
			}
			if (results.winner) {
				if (results.winner instanceof Array) {
					for (let win of results.winner) {
						this.addUser(room, win, 'W');
					}
				} else {
					this.addUser(room, results.winner, 'W');
				}
			}
			if (results.finalist) {
				if (results.finalist instanceof Array) {
					for (let finalist of results.finalist) {
						this.addUser(room, finalist, 'F');
					}
				} else {
					this.addUser(room, results.finalist, 'F');
				}
			}
			for (let i = 0; i < results.semiFinalists.length; i++) {
				this.addUser(room, results.semiFinalists[i], 'S');
			}
			for (let user in results.general) {
				this.addUser(room, user, 'B', results.general[user]);
			}
			this.db.write();
			this.generateTable(room);
		}
	}

	const TourLeaderBoardsMod = new TourLeaderBoardsModule();

	const tourData = TourLeaderBoardsMod.tourData;
	const isOfficial = TourLeaderBoardsMod.isOfficial;

	function getResults(data) {
		let generator = Text.toId(data.generator || "");
		if (generator === "singleelimination") {
			let res = {};
			let parsedTree = parseTourTree(data.bracketData.rootNode);
			res.players = Object.keys(parsedTree);
			res.general = {};
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
		} else if (generator === "roundrobin") {
			let res = {};
			res.players = data.bracketData.tableHeaders.cols;
			res.general = {};
			for (let i = 0; i < res.players.length; i++) {
				res.general[Text.toId(res.players[i])] = data.bracketData.scores[i];
			}
			res.winner = data.results[0];
			res.finalist = data.results[1];
			res.semiFinalists = data.results[2];
			return res;
		} else {
			App.log("Incompatible generator: " + data.generator);
			return null; //Not compatible generator
		}
	}

	App.bot.on('line', (room, line, spl, isIntro) => {
		if (spl[0] !== 'tournament') return;
		if (isIntro) return;
		if (!tourData[room]) tourData[room] = {};
		switch (spl[1]) {
		case 'update':
			try {
				let data = JSON.parse(spl[2]);
				for (let i in data) {
					tourData[room][i] = data[i];
				}
			} catch (e) {
				App.log("INVALID TOUR DATA: " + spl[2]);
			}
			break;
		case 'end':
			try {
				let data = JSON.parse(spl[2]);
				for (let i in data) {
					tourData[room][i] = data[i];
				}
			} catch (e) {
				App.log("INVALID TOUR DATA: " + spl[2]);
			}
			TourLeaderBoardsMod.parseTourResults(room, tourData[room]);
			delete tourData[room];
			delete isOfficial[room];
			break;
		case 'forceend':
			delete tourData[room];
			delete isOfficial[room];
			break;
		}
	});

	App.bot.on('disconnect', () => {
		for (let room in tourData) {
			delete tourData[room];
		}
		for (let room in isOfficial) {
			delete isOfficial[room];
		}
	});

	return TourLeaderBoardsMod;
};
