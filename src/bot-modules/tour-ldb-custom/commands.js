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

function botCanHtml(room, App) {
	let roomData = App.bot.rooms[room];
	let botid = Text.toId(App.bot.getBotNick());
	return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'bot'));
}

module.exports = {
	tlbdc: "tourldbcustom",
	tourleaderboardscustom: "tourldbcustom",
	tourldbcustom: function (App) {
		this.setLangFile(Lang_File);
		const Config = App.config.modules.tourldbcustom;
		let Mod = App.modules.tourldbcustom.system;

		const option = Text.toId(this.args[0]);

		switch (option) {
			case "create":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					if (this.args.length !== 3) {
						return this.errorReply(this.usage({ desc: "create" }, { desc: this.mlt('name') }, { desc: this.usageTrans("room") }) + " - " + this.mlt(0));
					}

					const tableName = (this.args[1] + "").trim();
					const tableId = Text.toId(tableName);
					const room = this.parseRoomAliases(Text.toRoomid(this.args[2] || ""));

					if (!tableId || !room) {
						return this.errorReply(this.usage({ desc: "create" }, { desc: this.mlt('name') }, { desc: this.usageTrans("room") }) + " - " + this.mlt(0));
					}

					if (Config[tableId]) {
						return this.errorReply(this.mlt(1));
					}

					const now = new Date();

					Config[tableId] = {
						name: tableName,
						room: room,
						winner: 5,
						finalist: 3,
						semifinalist: 1,
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
			case "setroom":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));
					const room = this.parseRoomAliases(Text.toRoomid(this.args[2] || ""));

					if (!leaderboardsId || !room) {
						return this.errorReply(this.usage({ desc: "set-room" }, { desc: this.mlt('table') }, { desc: this.usageTrans("room") }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					Config[leaderboardsId].room = room;

					App.db.write();
					this.addToSecurityLog();

					this.reply(this.mlt(44) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + " " + this.mlt(45) + " <<" + room + ">>");
				}
				break;
			case "title":
				{
					if (this.args.length < 3) {
						return this.errorReply(this.usage({ desc: "title" }, { desc: this.mlt('table') }, { desc: this.mlt("title") }));
					}

					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));
					const title = (this.args.slice(2).join(",") + "").trim();

					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "title" }, { desc: this.mlt('table') }, { desc: this.mlt("title") }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					if (!Config[leaderboardsId].room) {
						if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');
					} else {
						if (Config[leaderboardsId].room === this.room) {
							if (!this.can('ldbcustommanage', this.room) && !this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustommanage');
						} else {
							if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');
						}
					}

					Config[leaderboardsId].customTitle = title;

					App.db.write();
					Mod.generateTable(leaderboardsId);
					this.addToSecurityLog();

					this.reply(this.mlt(47) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + ": " + Chat.code(title));
				}
				break;
			case "auto":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					if (this.args.length < 3) {
						return this.errorReply(this.usage({ desc: "auto" }, { desc: this.mlt('table') }, { desc: "on/off" }));
					}

					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));

					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "auto" }, { desc: this.mlt('table') }, { desc: "on/off" }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					switch (Text.toId(this.args[2])) {
						case "on":
						case "true":
						case "yes":
						case "1":
							Config[leaderboardsId].automated = true;
							break;
						case "off":
						case "false":
						case "no":
						case "0":
							Config[leaderboardsId].automated = false;
							break;
						default:
							return this.errorReply(this.usage({ desc: "auto" }, { desc: this.mlt('table') }, { desc: "on/off" }));
					}

					App.db.write();
					this.addToSecurityLog();

					if (Config[leaderboardsId].automated) {
						this.reply(this.mlt(51) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId));
					} else {
						this.reply(this.mlt(52) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId));
					}
				}
				break;
			case "desc":
			case "description":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					if (this.args.length < 3) {
						return this.errorReply(this.usage({ desc: "description" }, { desc: this.mlt('table') }, { desc: this.mlt("desc") }));
					}

					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));
					const description = (this.args.slice(2).join(",") + "").trim();

					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "description" }, { desc: this.mlt('table') }, { desc: this.mlt("desc") }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					if (!Config[leaderboardsId].room) {
						if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');
					} else {
						if (Config[leaderboardsId].room === this.room) {
							if (!this.can('ldbcustommanage', this.room) && !this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustommanage');
						} else {
							if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');
						}
					}

					Config[leaderboardsId].description = description;

					App.db.write();
					Mod.generateTable(leaderboardsId);
					this.addToSecurityLog();

					this.reply(this.mlt(48) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + ": " + Chat.code(description));
				}
				break;
			case "addalias":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					if (this.args.length !== 3) {
						return this.errorReply(this.usage({ desc: "add-alias" }, { desc: this.mlt('table') }, { desc: this.mlt("alias") }));
					}

					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));
					const alias = Text.toId(this.args[2]);

					if (!leaderboardsId || !alias) {
						return this.errorReply(this.usage({ desc: "add-alias" }, { desc: this.mlt('table') }, { desc: this.mlt("alias") }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					const oldAliases = (Config[leaderboardsId].aliases || "").split(",").map(a => {
						return Text.toId(a);
					}).filter(a => {
						return !!a;
					});

					if (!oldAliases.includes(alias)) {
						oldAliases.push(alias);
					}

					Config[leaderboardsId].aliases = oldAliases.join(",");

					App.db.write();
					this.addToSecurityLog();

					this.reply(this.mlt(49) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + ": " + Chat.code(alias));
				}
				break;
			case "removealias":
			case "rmalias":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					if (this.args.length !== 3) {
						return this.errorReply(this.usage({ desc: "rm-alias" }, { desc: this.mlt('table') }, { desc: this.mlt("alias") }));
					}

					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));
					const alias = Text.toId(this.args[2]);

					if (!leaderboardsId || !alias) {
						return this.errorReply(this.usage({ desc: "rm-alias" }, { desc: this.mlt('table') }, { desc: this.mlt("alias") }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					const oldAliases = (Config[leaderboardsId].aliases || "").split(",").map(a => {
						return Text.toId(a);
					}).filter(a => {
						return !!a && a !== alias;
					});

					Config[leaderboardsId].aliases = oldAliases.join(",");

					App.db.write();
					this.addToSecurityLog();

					this.reply(this.mlt(50) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + ": " + Chat.code(alias));
				}
				break;
			case "config":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));
					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "config" }, { desc: this.mlt('table') }, { desc: 'win: N', optional: true }, { desc: 'final: N', optional: true }, { desc: 'semi_final: N', optional: true }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					if (this.args.length > 2) {
						let newConfig = {
							winner: Config[leaderboardsId].winner,
							finalist: Config[leaderboardsId].finalist,
							semifinalist: Config[leaderboardsId].semifinalist,
						};

						for (let i = 2; i < this.args.length; i++) {
							let arg = this.args[i].trim();
							let parts = arg.split(":");

							if (parts.length < 2) {
								return this.errorReply(this.usage({ desc: "config" }, { desc: this.mlt('table') }, { desc: 'win: N', optional: true }, { desc: 'final: N', optional: true }, { desc: 'semi_final: N', optional: true }));
							}

							let key = Text.toId(parts[0]);
							let val = parseInt(parts[1].trim()) || 0;

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
								default:
									return this.errorReply(this.usage({ desc: "config" }, { desc: this.mlt('table') }, { desc: 'win: N', optional: true }, { desc: 'final: N', optional: true }, { desc: 'semi_final: N', optional: true }));
							}
						}

						Config[leaderboardsId].winner = newConfig.winner;
						Config[leaderboardsId].finalist = newConfig.finalist;
						Config[leaderboardsId].semifinalist = newConfig.semifinalist;

						App.db.write();
						Mod.generateTable(leaderboardsId);
						this.addToSecurityLog();
					}

					this.restrictReply(this.mlt(4) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + ": " +
						Chat.bold(Config[leaderboardsId].winner) + " " + this.mlt(5) + ", " + Chat.bold(Config[leaderboardsId].finalist) +
						" " + this.mlt(6) + ", " + Chat.bold(Config[leaderboardsId].semifinalist) + " " + this.mlt(7) + ".", "ldbcustomrank");
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
						text += "\n  - " + this.mlt("table") + ": " + (Config[tableId].name || tableId);
						text += "\n    " + this.mlt(35) + ": " + (Config[tableId].room || "-");
						if (Config[tableId].customTitle) {
							text += "\n    " + this.mlt("title") + ": " + (Config[tableId].customTitle);
						}
						if (Config[tableId].description) {
							text += "\n    " + this.mlt("desc") + ": " + (Config[tableId].description);
						}
						if (Config[tableId].aliases) {
							text += "\n    " + this.mlt("alias") + ": " + (Config[tableId].aliases);
						}

						text += "\n    " + this.mlt(19) + ": " + Config[tableId].winner + " " + this.mlt(5) + ", " + Config[tableId].finalist +
							" " + this.mlt(6) + ", " + Config[tableId].semifinalist + " " + this.mlt(7) + ".";

						text += "\n    " + this.mlt(31) + ": " + (Config[tableId].cleanPoint || "-");

						if (Config[tableId].automated) {
							text += "\n    " + this.mlt(53);
						}

						text += "\n";
					}

					this.replyCommand("!code " + text);
				}
				break;
			case "info":
				{
					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));
					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "info" }, { desc: this.mlt('table') }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					this.restrictReply(this.mlt(4) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + ": " +
						Chat.bold(Config[leaderboardsId].winner) + " " + this.mlt(5) + ", " + Chat.bold(Config[leaderboardsId].finalist) +
						" " + this.mlt(6) + ", " + Chat.bold(Config[leaderboardsId].semifinalist) + " " + this.mlt(7) + ".", "ldbcustomrank");
				}
				break;
			case "rename":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					if (this.args.length !== 3) {
						return this.errorReply(this.usage({ desc: "rename" }, { desc: this.mlt('table') }, { desc: this.mlt('newname') }));
					}

					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));

					const newName = (this.args[2] + "").trim();
					const newId = Text.toId(newName);

					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "rename" }, { desc: this.mlt('table') }, { desc: this.mlt('newname') }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					if (leaderboardsId === newId) {
						Config[leaderboardsId].name = newName;
					} else {
						if (Config[newId]) {
							return this.errorReply(this.mlt(1));
						}

						Config[leaderboardsId].name = newName;

						Config[newId] = Config[leaderboardsId];
						delete Config[leaderboardsId];

						Mod.data[newId] = Mod.data[leaderboardsId];
						delete Mod.data[leaderboardsId];
					}

					App.db.write();
					Mod.db.write();
					Mod.generateTable(newId);

					this.reply(this.mlt(11) + ": " + Chat.bold(newName));
					this.addToSecurityLog();
				}
				break;
			case "reset":
				{
					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));
					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "reset" }, { desc: this.mlt('table') }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					if (!Config[leaderboardsId].room) {
						if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');
					} else {
						if (Config[leaderboardsId].room === this.room) {
							if (!this.can('ldbcustommanage', this.room) && !this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustommanage');
						} else {
							if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');
						}
					}

					let key = App.data.temp.createTempFile(Mod.makeTableHTML(leaderboardsId));

					let now = new Date();
					Mod.data[leaderboardsId] = Object.create(null);
					Config[leaderboardsId].cleanPoint = now.toString();
					App.db.write();
					Mod.db.write();
					Mod.generateTable(leaderboardsId);

					this.reply(this.mlt(12) + ": " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + ". " + this.mlt(14) + ": " + App.server.getControlPanelLink('/temp/' + key));
					this.addToSecurityLog();
				}
				break;
			case "remove":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));
					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "remove" }, { desc: this.mlt('table') }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					let key = App.data.temp.createTempFile(Mod.makeTableHTML(leaderboardsId));

					const deletedName = Config[leaderboardsId].name || leaderboardsId;

					delete Mod.data[leaderboardsId];
					delete Config[leaderboardsId];

					App.db.write();
					Mod.db.write();

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

					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));
					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "official" }, { desc: this.mlt('table') }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					if (!Config[leaderboardsId].room) {
						if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');
					}

					if (Config[leaderboardsId].room && Config[leaderboardsId].room !== room) {
						return this.errorReply(this.mlt(44) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + " " + this.mlt(46) + " <<" + Config[leaderboardsId].room + ">>");
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
					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));
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
					txt += this.mlt(19) + ": " + rank.points + " | ";
					txt += this.mlt(20) + ": " + rank.wins + ", " + this.mlt(21) +
						": " + rank.finals + ", " + this.mlt(22) + ": " + rank.semis + ", " + this.mlt("extra") + ": " + rank.extra + ".";
					this.restrictReply(txt, 'ldbcustomrank');
				}
				break;
			case "top5":
				{
					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));
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
						topResults.push(Chat.italics("#" + (i + 1)) + " " + Chat.bold(top[i][0]) + " (" + top[i][6] + ")");
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
			case "top100":
				{
					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));
					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: option }, { desc: this.mlt('table') }));
					}

					let maxTableLength = (option === "top100") ? 100 : 10;

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					let top = Mod.getTop(leaderboardsId);
					if (!top) {
						return this.restrictReply(this.mlt(26) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + " " + this.mlt(27), "ldbcustomrank");
					}

					let server = App.config.server.url;

					if (this.getRoomType(this.room) === 'chat' && botCanHtml(this.room, App) && this.can('ldbcustomrank', this.room)) {
						// Send html table in chat
						let html = '';

						if (Config[leaderboardsId].customTitle) {
							html += '<h3 style="text-align:center;">' + Text.escapeHTML(Config[leaderboardsId].customTitle) + '</h3>';
						} else {
							html += '<h3 style="text-align:center;">' + Text.escapeHTML(Config[leaderboardsId].name || leaderboardsId) + " | " + Text.escapeHTML(this.mlt(28)) + '</h3>';
						}

						if (Config[leaderboardsId].description) {
							html += '<p style="text-align:center;">' + Chat.parseMessage(Text.escapeHTML(Config[leaderboardsId].description)) + '</p>';
						}

						html += '<div style="overflow: auto; height: 120px; width: 100%;">';

						html += '<table border="1" cellspacing="0" cellpadding="3" style="min-width:100%;">';

						html += '<tr>';
						html += '<th>#</th>';
						html += '<th>' + Text.escapeHTML(this.mlt("user")) + '</th>';
						html += '<th>' + Text.escapeHTML(this.mlt(19)) + '</th>';
						html += '<th>' + Text.escapeHTML(this.mlt(20)) + '</th>';
						html += '<th>' + Text.escapeHTML(this.mlt(21)) + '</th>';
						html += '<th>' + Text.escapeHTML(this.mlt(22)) + '</th>';
						html += '<th>' + Text.escapeHTML(this.mlt("extra")) + '</th>';
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
						if (!top.length) {
							return this.restrictReply(this.mlt(26) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + " " + this.mlt(27), "ldbcustomrank");
						}

						let topResults = [];
						for (let i = 0; i < 5 && i < top.length; i++) {
							topResults.push(Chat.italics("#" + (i + 1)) + " " + Chat.bold(top[i][0]) + " (" + top[i][6] + ")");
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
			case "recenttours":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					const cache = Mod.tourCache;
					const lines = [];

					for (let entry of cache) {
						if (!entry.data || typeof entry.data !== "object") continue;
						lines.push("[" + entry.date + "] " + this.mlt(34) + ": " + entry.id + ", " + this.mlt(35) + ": " + entry.room + ", " + this.mlt(36) + ": " + entry.data.generator + ", " + this.mlt(37) + ": " + entry.data.format);
					}

					this.replyCommand("!code " + this.mlt(33) + ":\n\n" + lines.reverse().join("\n"));
				}
				break;
			case "apply":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));
					let tourId = parseInt(this.args[2]);

					if (!leaderboardsId || !tourId || isNaN(tourId)) {
						return this.errorReply(this.usage({ desc: "apply" }, { desc: this.mlt('table') }, { desc: this.mlt(34) }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					const cacheEntry = Mod.tourCache.filter(entry => {
						return entry.id === tourId;
					})[0];

					if (!cacheEntry) {
						return this.errorReply(this.mlt(38) + ": " + Chat.italics(tourId + ""));
					}

					Mod.applyTourResults(leaderboardsId, cacheEntry.data);

					this.reply(this.mlt(39) + ": " + Chat.italics(tourId + "") + " " + this.mlt(40) + ": " + Chat.bold(Config[leaderboardsId].name || leaderboardsId));
				}
				break;
			case "undo":
				{
					if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');

					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));
					let tourId = parseInt(this.args[2]);

					if (!leaderboardsId || !tourId || isNaN(tourId)) {
						return this.errorReply(this.usage({ desc: "undo" }, { desc: this.mlt('table') }, { desc: this.mlt(34) }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					const cacheEntry = Mod.tourCache.filter(entry => {
						return entry.id === tourId;
					})[0];

					if (!cacheEntry) {
						return this.errorReply(this.mlt(38) + ": " + Chat.italics(tourId + ""));
					}

					Mod.applyTourResults(leaderboardsId, cacheEntry.data, true);

					this.reply(this.mlt(41) + ": " + Chat.italics(tourId + "") + " " + this.mlt(42) + ": " + Chat.bold(Config[leaderboardsId].name || leaderboardsId));
				}
				break;
			case "ep":
			case "extrapoints":
				{
					if (!this.can('ldbcustomofficial', this.room)) return this.replyAccessDenied('ldbcustomofficial');

					let room = this.room;
					if (!room || this.getRoomType(room) !== 'chat') {
						return this.errorReply(this.mlt('nochat'));
					}

					let leaderboardsId = Mod.findAlias(Text.toId(this.args[1]));
					if (!leaderboardsId) {
						return this.errorReply(this.usage({ desc: "extra-points" }, { desc: this.mlt('table') }, { desc: this.mlt("user") + ": " + this.mlt(19) }, { desc: "...", optional: true }));
					}

					if (!Config[leaderboardsId]) {
						return this.errorReply(this.mlt(3) + ": " + Chat.italics(leaderboardsId));
					}

					if (!Config[leaderboardsId].room) {
						if (!this.can('ldbcustomconfig', this.room)) return this.replyAccessDenied('ldbcustomconfig');
					}

					if (Config[leaderboardsId].room && Config[leaderboardsId].room !== room && !this.can('ldbcustomconfig', this.room)) {
						return this.errorReply(this.mlt(44) + " " + Chat.bold(Config[leaderboardsId].name || leaderboardsId) + " " + this.mlt(46) + " <<" + Config[leaderboardsId].room + ">>");
					}

					let pointsToAdd = [];

					for (let i = 2; i < this.args.length; i++) {
						const argParts = (this.args[i] + "").split(":");

						if (argParts.length !== 2) {
							continue;
						}

						const uid = Text.toId(argParts[0]);
						const name = (argParts[0] + "").trim();

						if (!uid || uid.length > 19) {
							return this.errorReply(this.mlt(17) + ": " + (uid || "''"));
						}

						const points = parseInt((argParts[1] + "").trim());

						if (!points || isNaN(points) || !isFinite(points)) {
							continue;
						}

						pointsToAdd.push({
							id: uid,
							name: name,
							points: points,
						});
					}

					if (pointsToAdd.length) {
						const lines = [];
						for (let p of pointsToAdd) {
							const oldRank = Mod.getUserPoints(leaderboardsId, p.id);

							Mod.addUser(leaderboardsId, p.name, 'A', null);
							Mod.addUser(leaderboardsId, p.id, 'B', Math.abs(p.points), p.points < 0);

							const newRank = Mod.getUserPoints(leaderboardsId, p.id);

							let diffPoints = newRank.points - oldRank.points;

							if (diffPoints > 0) {
								diffPoints = "+" + diffPoints;
							} else if (diffPoints < 0) {
								diffPoints = "" + diffPoints;
							} else {
								diffPoints = "";
							}

							lines.push("    " + p.name + ": " + oldRank.points + " → " + newRank.points + (diffPoints ? (" (" + diffPoints + ")") : ""));
						}

						Mod.db.write();
						Mod.generateTable(leaderboardsId);

						this.replyCommand("!code " + this.mlt(43) + ":\n\n" + lines.join("\n"));
					} else {
						this.errorReply(this.usage({ desc: "extra-points" }, { desc: this.mlt('table') }, { desc: this.mlt("user") + ": " + this.mlt(19) }, { desc: "...", optional: true }));
					}
				}
				break;
			default:
				return this.errorReply(this.usage({ desc: 'create | set-room | title | description | add-alias | rm-alias | config | auto | list | rename | info | reset | remove | recent-tours | apply | undo | official | unofficial | extra-points | rank | top | top5 | top100' }));
		}
	},

	extrapoints: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('ldbcustomofficial', this.room)) return this.replyAccessDenied('ldbcustomofficial');

		let room = this.room;
		if (!room || this.getRoomType(room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}

		let leaderboardsId = Text.toId(this.args[1]);
		if (!leaderboardsId) {
			return this.errorReply(this.usage({ desc: this.mlt('table') }, { desc: this.mlt("user") + ": " + this.mlt(19) }, { desc: "...", optional: true }));
		}

		this.cmd = 'tourldbcustom';
		this.arg = "extrapoints" + "," + this.arg;
		this.args = ["extrapoints"].concat(this.args);
		this.parser.exec(this);
		return;
	},
};
