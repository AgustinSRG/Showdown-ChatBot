/**
 * Commands File
 *
 * tourldbcustom - Manages tournaments leaderboards
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Chat = Tools('chat');
const LineSplitter = Tools('line-splitter');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

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

function botCanHtml(room, App) {
	let roomData = App.bot.rooms[room];
	let botid = Text.toId(App.bot.getBotNick());
	return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'bot'));
}

module.exports = {
	tourldbcustom: function (App) {
		this.setLangFile(Lang_File);
		const Config = App.config.modules.tourldbcustom;
		let Mod = App.modules.tourldbcustom.system;

		const option = Text.toId(this.args[0]);

		switch (option) {
			case "create":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					if (this.args.length !== 2) {
						return this.errorReply(this.usage({ desc: "create" }, { desc: this.mlt('name') }) + " - " + this.mlt(0));
					}

					const tableName = (this.args[1] + "").trim();
					const tableId = Text.toId(tableName);

					if (!tableId) {
						return this.errorReply(this.usage({ desc: "create" }, { desc: this.mlt('name') }) + " - " + this.mlt(0));
					}

					if (Config[tableId]) {
						return this.errorReply(this.mlt(1));
					}

					const now = new Date();

					Config[tableId] = {
						name: tableName,
						winner: 5,
						finalist: 3,
						semifinalist: 1,
						battle: 0,
						useratio: true,
						cleanPoint: now.toString(),
					};

					Mod.data[tableId] = Object.create(null);

					App.db.write();
					Mod.db.write();
					Mod.generateTable(tableId);

					this.reply(this.mlt(2) + ": " + Chat.bold(tableName));
					this.addToSecurityLog();
				}
				break;
			case "config":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					let leaderboardsId = Text.toId(this.args[1]);
					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "config" }, { desc: this.mlt('table') }, { desc: 'win: N', optional: true }, { desc: 'final: N', optional: true }, { desc: 'semi_final: N', optional: true }, { desc: 'battle_win: N', optional: true }, { desc: 'use_ratio: yes/no', optional: true }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					if (this.args.length > 2) {
						let newConfig = {
							winner: Config[leaderboardsId].winner,
							finalist: Config[leaderboardsId].finalist,
							semifinalist: Config[leaderboardsId].semifinalist,
							battle: Config[leaderboardsId].battle,
							useratio: Config[leaderboardsId].useratio,
						};

						for (let i = 2; i < this.args.length; i++) {
							let arg = this.args[i].trim();
							let parts = arg.split(":");

							if (parts.length < 2) {
								return this.errorReply(this.usage({ desc: "config" }, { desc: this.mlt('table') }, { desc: 'win: N', optional: true }, { desc: 'final: N', optional: true }, { desc: 'semi_final: N', optional: true }, { desc: 'battle_win: N', optional: true }, { desc: 'use_ratio: yes/no', optional: true }));
							}

							let key = Text.toId(parts[0]);
							let val = parseInt(parts[1].trim()) || 0;
							let valBool = ['y', 'yes', 'true', '1'].indexOf(Text.toId(parts[1])) >= 0;

							switch (key) {
								case "win":
								case "winner":
									newConfig.winner = val;
									break;
								case "final":
								case "finalist":
									newConfig.finalist = val;
									break;
								case "semi":
								case "semifinal":
								case "semifinalist":
									newConfig.semifinalist = val;
									break;
								case "battle":
								case "battlewin":
									newConfig.battle = val;
									break;
								case "ratio":
								case "useratio":
									newConfig.useratio = valBool;
									break;
								default:
									return this.errorReply(this.usage({ desc: "config" }, { desc: this.mlt('table') }, { desc: 'win: N', optional: true }, { desc: 'final: N', optional: true }, { desc: 'semi_final: N', optional: true }, { desc: 'battle_win: N', optional: true }, { desc: 'use_ratio: yes/no', optional: true }));
							}
						}

						Config[leaderboardsId].winner = newConfig.winner;
						Config[leaderboardsId].finalist = newConfig.finalist;
						Config[leaderboardsId].semifinalist = newConfig.semifinalist;
						Config[leaderboardsId].battle = newConfig.battle;
						Config[leaderboardsId].useratio = newConfig.useratio;

						App.db.write();
						Mod.generateTable(leaderboardsId);
						this.addToSecurityLog();
					}

					this.restrictReply(this.mlt(4) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + ": " +
						Chat.bold(Config[leaderboardsId].winner) + " " + this.mlt(5) + ", " + Chat.bold(Config[leaderboardsId].finalist) +
						" " + this.mlt(6) + ", " + Chat.bold(Config[leaderboardsId].semifinalist) + " " + this.mlt(7) +
						", " + Chat.bold(Config[leaderboardsId].battle) + " " + this.mlt(8) + "." +
						(Config[leaderboardsId].useratio ? (" " + this.mlt(9) + ".") : ""), "ldbcustomrank");
				}
				break;
			case "list":
				{
					let list = Object.keys(Config).sort();
					if (list.length === 0) {
						return this.errorReply(this.mlt(10));
					}
					let text = this.mlt(10) + ":\n";

					for (let tableId of list) {
						text += "\n    " + (Config[tableId].name || tableId);
					}

					this.replyCommand("!code " + text);
				}
				break;
			case "info":
				{
					let leaderboardsId = Text.toId(this.args[1]);
					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "info" }, { desc: this.mlt('table') }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					this.restrictReply(this.mlt(4) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + ": " +
						Chat.bold(Config[leaderboardsId].winner) + " " + this.mlt(5) + ", " + Chat.bold(Config[leaderboardsId].finalist) +
						" " + this.mlt(6) + ", " + Chat.bold(Config[leaderboardsId].semifinalist) + " " + this.mlt(7) +
						", " + Chat.bold(Config[leaderboardsId].battle) + " " + this.mlt(8) + "." +
						(Config[leaderboardsId].useratio ? (" " + this.mlt(9) + ".") : ""), "ldbcustomrank");
				}
				break;
			case "rename":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					if (this.args.length !== 2) {
						return this.errorReply(this.usage({ desc: "rename" }, { desc: this.mlt('table') }, { desc: this.mlt('newname') }));
					}

					const leaderboardsId = Text.toId(this.args[1]);

					const newName = (this.args[2] + "").trim();
					const newId = Text.toId(newName);

					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "rename" }, { desc: this.mlt('table') }, { desc: this.mlt('newname') }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					if (Config[newId]) {
						return this.errorReply(this.mlt(1));
					}

					Config[newId] = Config[leaderboardsId];
					delete Config[leaderboardsId];

					Mod.data[newId] = Mod.data[leaderboardsId];
					delete Mod.data[leaderboardsId];

					App.db.write();
					Mod.db.write();
					Mod.generateTable(newId);

					this.reply(this.mlt(11) + ": " + Chat.bold(newName));
					this.addToSecurityLog();
				}
				break;
			case "reset":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					let leaderboardsId = Text.toId(this.args[1]);
					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "reset" }, { desc: this.mlt('table') }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					let now = new Date();
					const data = Mod.data[leaderboardsId];
					Mod.data[leaderboardsId] = Object.create(null);
					Config[leaderboardsId].cleanPoint = now.toString();
					App.db.write();
					Mod.db.write();
					Mod.generateTable(leaderboardsId);

					let key = App.data.temp.createTempFile(
						"<html>" +
						"<body><p>" +
						JSON.stringify(data) +
						"</p></body>" +
						"</html>"
					);

					this.reply(this.mlt(12) + ": " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + ". " + this.mlt(14) + ": " + App.server.getControlPanelLink('/temp/' + key));
					this.addToSecurityLog();
				}
				break;
			case "remove":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					let leaderboardsId = Text.toId(this.args[1]);
					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "remove" }, { desc: this.mlt('table') }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					const deletedName = Config[leaderboardsId].name || leaderboardsId;

					const data = Mod.data[leaderboardsId];

					delete Mod.data[leaderboardsId];
					delete Config[leaderboardsId];

					App.db.write();
					Mod.db.write();

					let key = App.data.temp.createTempFile(
						"<html>" +
						"<body><p>" +
						JSON.stringify(data) +
						"</p></body>" +
						"</html>"
					);

					this.reply(this.mlt(13) + ": " + Chat.bold(deletedName) + ". " + this.mlt(14) + ": " + App.server.getControlPanelLink('/temp/' + key));
					this.addToSecurityLog();
				}
				break;
			case "official":
				{
					if (!this.can('ldbcustomofficial', this.room)) return this.replyAccessDenied('ldbcustomofficial');

					let room = this.room;
					if (!room || this.getRoomType(room) !== 'chat') {
						return this.errorReply(this.mlt('nochat'));
					}

					let leaderboardsId = Text.toId(this.args[1]);
					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "official" }, { desc: this.mlt('table') }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					Mod.isOfficial[room] = leaderboardsId;
					Mod.dbOfficial.write();

					this.reply(this.mlt(15) + ": " + Chat.bold(Config[leaderboardsId].name || leaderboardsId));
				}
				break;
			case "unofficial":
				{
					if (!this.can('ldbcustomofficial', this.room)) return this.replyAccessDenied('ldbcustomofficial');

					let room = this.room;
					if (!room || this.getRoomType(room) !== 'chat') {
						return this.errorReply(this.mlt('nochat'));
					}

					delete Mod.isOfficial[room];
					Mod.dbOfficial.write();

					this.reply(this.mlt(16));
				}
				break;
			case "rank":
				{
					let leaderboardsId = Text.toId(this.args[1]);
					let userId = Text.toId(this.args[2]);

					if (!leaderboardsId || !userId) {
						return this.errorReply(this.usage({ desc: "rank" }, { desc: this.mlt('table') }, { desc: this.mlt('user') }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					if (userId.length > 19) {
						return this.errorReply(this.mlt(17));
					}

					let rank = Mod.getUserPoints(leaderboardsId, userId);
					let txt = this.mlt(18) + " " + Chat.bold(rank.name) + " " +
						this.mlt('in') + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + " | ";
					txt += this.mlt(19) + ": " + toDecimalFormat(rank.points) + " | ";
					txt += this.mlt(20) + ": " + rank.wins + ", " + this.mlt(21) +
						": " + rank.finals + ", " + this.mlt(22) + ": " + rank.semis + ". ";
					txt += this.mlt(23) + ": " + rank.tours + " " + this.mlt(24) +
						", " + rank.battles + " " + this.mlt(25) + " (" + this.mlt('ratio') + " = " + toDecimalFormat(rank.ratio) + ").";
					this.restrictReply(txt, 'ldbcustomrank');
				}
				break;
			case "top5":
				{
					let leaderboardsId = Text.toId(this.args[1]);
					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "top5" }, { desc: this.mlt('table') }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					let top = Mod.getTop(leaderboardsId);
					if (!top || !top.length) {
						return this.restrictReply(this.mlt(26) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + " " + this.mlt(27), "ldbcustomrank");
					}

					let server = App.config.server.url;

					let topResults = [];
					for (let i = 0; i < 5 && i < top.length; i++) {
						topResults.push(Chat.italics("#" + (i + 1)) + " " + Chat.bold(top[i][0]) + " (" + toDecimalFormat(top[i][6]) + ")");
					}

					let spl = new LineSplitter(App.config.bot.maxMessageLength);

					spl.add(Chat.bold(Config[leaderboardsId].name || leaderboardsId) + " | " + topResults.join(", ") + " | ");

					if (server) {
						if (server.charAt(server.length - 1) === '/') {
							spl.add(App.config.server.url + 'tourtablecustom/' + leaderboardsId + '/get');
						} else {
							spl.add(App.config.server.url + '/tourtablecustom/' + leaderboardsId + '/get');
						}
					}

					this.restrictReply(spl.getLines(), "ldbcustomrank");
				}
				break;
			case "top":
				{
					let leaderboardsId = Text.toId(this.args[1]);
					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "top" }, { desc: this.mlt('table') }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					let top = Mod.getTop(leaderboardsId);
					if (!top || !top.length) {
						return this.restrictReply(this.mlt(26) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + " " + this.mlt(27), "ldbcustomrank");
					}

					let server = App.config.server.url;

					if (this.getRoomType(this.room) === 'chat' && botCanHtml(this.room, App) && this.can('ldbcustomrank', this.room)) {
						// Send html table in chat
						let html = '<h3 style="text-align:center;">' + Text.escapeHTML(Config[leaderboardsId].name || leaderboardsId) + " | " + Text.escapeHTML(this.mlt(28)) + '</h3><div style="overflow: auto; height: 200px; width: 100%;">';

						html += '<table border="1" cellspacing="0" cellpadding="3" style="min-width:100%;">';

						html += '<tr>';
						html += '<th>#</th>';
						html += '<th>' + Text.escapeHTML(this.mlt("user")) + '</th>';
						html += '<th>' + Text.escapeHTML(this.mlt(19)) + '</th>';
						html += '<th>' + Text.escapeHTML(this.mlt(20)) + '</th>';
						html += '<th>' + Text.escapeHTML(this.mlt(21)) + '</th>';
						html += '<th>' + Text.escapeHTML(this.mlt(22)) + '</th>';
						html += '<th>' + Text.escapeHTML(this.mlt(30)) + '</th>';
						html += '<th>' + Text.escapeHTML(this.mlt(29)) + '</th>';
						html += '<th>' + Text.escapeHTML(this.mlt("ratio")) + '</th>';
						html += '</tr>';

						for (let i = 0; i < 10 && i < top.length; i++) {
							html += '<tr>';

							html += '<td style="text-align:center;"><b>' + (i + 1) + '</b></td>';

							html += '<td><b>' + Text.escapeHTML(top[i][0]) + '</b></td>';

							html += '<td>' + toDecimalFormat(top[i][6]) + '</td>';

							html += '<td>' + top[i][1] + '</td>';

							html += '<td>' + top[i][2] + '</td>';

							html += '<td>' + top[i][3] + '</td>';

							html += '<td>' + top[i][4] + '</td>';

							html += '<td>' + top[i][5] + '</td>';

							html += '<td>' + toDecimalFormat(top[i][4] / (top[i][5] || 1)) + '</td>';

							html += '</tr>';
						}

						html += '</table>';

						html += '<p>' + Text.escapeHTML(this.mlt(31)) + ': ' + Text.escapeHTML(Config[leaderboardsId].cleanPoint || "-") + '</p>';

						if (server) {
							let fullTablelink;
							if (server.charAt(server.length - 1) === '/') {
								fullTablelink = App.config.server.url + 'tourtablecustom/' + leaderboardsId + '/get';
							} else {
								fullTablelink = App.config.server.url + '/tourtablecustom/' + leaderboardsId + '/get';
							}

							html += '<p>' + Text.escapeHTML(this.mlt(32)) + ': <a href="' + fullTablelink + '">' + fullTablelink + '</a></p>';
						}

						html += '</div>';

						this.send("/addhtmlbox " + html, this.room);
					} else {
						// Send text message
						let topResults = [];
						for (let i = 0; i < 5 && i < top.length; i++) {
							topResults.push(Chat.italics("#" + (i + 1)) + " " + Chat.bold(top[i][0]) + " (" + toDecimalFormat(top[i][6]) + ")");
						}

						let spl = new LineSplitter(App.config.bot.maxMessageLength);

						spl.add(Chat.bold(Config[leaderboardsId].name || leaderboardsId) + " | " + topResults.join(", ") + " | ");

						if (server) {
							if (server.charAt(server.length - 1) === '/') {
								spl.add(App.config.server.url + 'tourtablecustom/' + leaderboardsId + '/get');
							} else {
								spl.add(App.config.server.url + '/tourtablecustom/' + leaderboardsId + '/get');
							}
						}

						this.restrictReply(spl.getLines(), "ldbcustomrank");
					}
				}
				break;
			default:
				return this.errorReply(this.usage({ desc: 'create | config | list | rename | info | reset | remove | official | unofficial | rank | top | top5' }));
		}
	},
};
