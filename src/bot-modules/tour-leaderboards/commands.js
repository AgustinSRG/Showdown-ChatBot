/**
 * Commands File
 *
 * toursrank: gets the tournament ranking
 * top: gets the TOP5 for a room
 * toursrankconfig: gets the points system configuration for a room
 * tourleaderboards: gets the TOP100 table for a room
 * official: makes a tournament official
 * unofficial: makes a tournament unofficial
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Chat = Tools('chat');
const LineSplitter = Tools('line-splitter');
const HtmlMaker = Tools('html-maker');

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
	rank: "toursrank",
	toursrank: function (App) {
		this.setLangFile(Lang_File);
		let user = Text.toId(this.args[0]) || this.byIdent.id;
		let room = this.parseRoomAliases(Text.toRoomid(this.args[1])) || this.room;
		if (!user || !room) {
			return this.errorReply(this.usage({ desc: this.usageTrans('user'), optional: true }, { desc: this.usageTrans('room'), optional: true }));
		}

		if (App.modules.tourldbcustom && App.modules.tourldbcustom.system && App.config.modules.tourldbcustom) {
			const customConfig = App.config.modules.tourldbcustom;
			const Mod = App.modules.tourldbcustom.system;
			const tableId = Mod.findAlias(Text.toId(room));

			if (customConfig[tableId] && (this.args[1] || customConfig[tableId].room === this.room)) {
				// Custom table found
				this.cmd = 'tourldbcustom';
				this.arg = "rank" + ", " + tableId + "," + user;
				this.args = ["rank", tableId, user];
				this.parser.exec(this);
			} else {
				this.cmd = 'toursrankh';
				this.parser.exec(this);
			}
		} else {
			this.cmd = 'toursrankh';
			this.parser.exec(this);
		}
	},

	rankh: "toursrankh",
	toursrankh: function (App) {
		this.setLangFile(Lang_File);
		const Config = App.config.modules.tourleaderboards;
		let mod = App.modules.tourleaderboards.system;
		let user = Text.toId(this.args[0]) || this.byIdent.id;
		let room = this.parseRoomAliases(Text.toRoomid(this.args[1])) || this.room;
		if (!user || !room) {
			return this.errorReply(this.usage({ desc: this.usageTrans('user'), optional: true }, { desc: this.usageTrans('room'), optional: true }));
		}

		if (!Config[room]) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(room));
		}

		if (user.length > 19) {
			return this.errorReply(this.mlt(1));
		}
		let rank = mod.getUserPoints(room, user);
		let txt = this.mlt(2) + " " + Chat.bold(rank.name) + " " +
			this.mlt('in') + " " + Chat.italics(this.parser.getRoomTitle(room)) + " | ";
		txt += this.mlt(3) + ": " + toDecimalFormat(rank.points) + " | ";
		txt += this.mlt(4) + ": " + rank.wins + ", " + this.mlt(5) +
			": " + rank.finals + ", " + this.mlt(6) + ": " + rank.semis + ". ";
		txt += this.mlt(7) + ": " + rank.tours + " " + this.mlt(8) +
			", " + rank.battles + " " + this.mlt(9) + " (" + this.mlt('ratio') + " = " + toDecimalFormat(rank.ratio) + ").";
		this.restrictReply(txt, 'toursrank');
	},

	top: function (App) {
		this.setLangFile(Lang_File);
		let room = this.parseRoomAliases(Text.toRoomid(this.args[0])) || this.room;
		if (!room) {
			return this.errorReply(this.usage({ desc: this.usageTrans('room') }));
		}

		if (App.modules.tourldbcustom && App.modules.tourldbcustom.system && App.config.modules.tourldbcustom) {
			const customConfig = App.config.modules.tourldbcustom;
			const Mod = App.modules.tourldbcustom.system;
			const tableId = Mod.findAlias(Text.toId(room));

			if (customConfig[tableId] && (this.arg || customConfig[tableId].room === this.room)) {
				// Custom table found
				this.cmd = 'tourldbcustom';
				this.arg = "top" + ", " + tableId;
				this.args = ["top", tableId];
				this.parser.exec(this);
			} else {
				this.cmd = 'toph';
				this.arg = room;
				this.args = [room];
				this.parser.exec(this);
			}
		} else {
			this.cmd = 'toph';
			this.arg = room;
			this.args = [room];
			this.parser.exec(this);
		}
	},

	toph: function (App) {
		this.setLangFile(Lang_File);
		const Config = App.config.modules.tourleaderboards;
		let mod = App.modules.tourleaderboards.system;
		let room = this.parseRoomAliases(Text.toRoomid(this.args[0])) || this.room;
		if (!room) {
			return this.errorReply(this.usage({ desc: this.usageTrans('room') }));
		}

		if (!Config[room]) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(room));
		}

		let top = mod.getTop(room);
		if (!top || !top.length) {
			return this.restrictReply(this.mlt(10) + " " + Chat.italics(room) + " " + this.mlt(11), "rank");
		}

		let server = App.config.server.url;

		if (this.getRoomType(this.room) === 'chat' && botCanHtml(this.room, App) && this.can('toursrank', this.room)) {
			// Send html table in chat
			let html = '<h3 style="text-align:center;">' + Text.escapeHTML(this.parser.getRoomTitle(room)) + " | " + Text.escapeHTML(this.mlt(25)) + '</h3><div style="overflow: auto; height: 120px; width: 100%;">';

			html += '<table border="1" cellspacing="0" cellpadding="3" style="min-width:100%;">';

			html += '<tr>';
			html += '<th>#</th>';
			html += '<th>' + Text.escapeHTML(this.mlt("user")) + '</th>';
			html += '<th>' + Text.escapeHTML(this.mlt(3)) + '</th>';
			html += '<th>' + Text.escapeHTML(this.mlt(4)) + '</th>';
			html += '<th>' + Text.escapeHTML(this.mlt(5)) + '</th>';
			html += '<th>' + Text.escapeHTML(this.mlt(6)) + '</th>';
			html += '<th>' + Text.escapeHTML(this.mlt(27)) + '</th>';
			html += '<th>' + Text.escapeHTML(this.mlt(26)) + '</th>';
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

			html += '<p>' + Text.escapeHTML(this.mlt(28)) + ': ' + Text.escapeHTML(Config[room].cleanPoint || "-") + '</p>';

			if (server) {
				let fullTablelink;
				if (server.charAt(server.length - 1) === '/') {
					fullTablelink = App.config.server.url + 'tourtable/' + room + '/get';
				} else {
					fullTablelink = App.config.server.url + '/tourtable/' + room + '/get';
				}

				html += '<p>' + Text.escapeHTML(this.mlt(29)) + ': <a href="' + fullTablelink + '">' + fullTablelink + '</a></p>';
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

			spl.add(Chat.bold(this.parser.getRoomTitle(room)) + " | " + topResults.join(", ") + " | ");

			if (server) {
				if (server.charAt(server.length - 1) === '/') {
					spl.add(App.config.server.url + 'tourtable/' + room + '/get');
				} else {
					spl.add(App.config.server.url + '/tourtable/' + room + '/get');
				}
			}

			this.restrictReply(spl.getLines(), "toursrank");
		}
	},

	top5: function (App) {
		this.setLangFile(Lang_File);
		let room = this.parseRoomAliases(Text.toRoomid(this.arg)) || this.room;
		if (!room) {
			return this.errorReply(this.usage({ desc: this.usageTrans('room') }));
		}

		if (App.modules.tourldbcustom && App.modules.tourldbcustom.system && App.config.modules.tourldbcustom) {
			const customConfig = App.config.modules.tourldbcustom;
			const Mod = App.modules.tourldbcustom.system;
			const tableId = Mod.findAlias(Text.toId(room));

			if (customConfig[tableId] && (this.arg || customConfig[tableId].room === this.room)) {
				// Custom table found
				this.cmd = 'tourldbcustom';
				this.arg = "top5" + ", " + tableId;
				this.args = ["top5", tableId];
				this.parser.exec(this);
			} else {
				this.cmd = 'toph5';
				this.arg = room;
				this.args = [room];
				this.parser.exec(this);
			}
		} else {
			this.cmd = 'toph5';
			this.arg = room;
			this.args = [room];
			this.parser.exec(this);
		}
	},

	top5h: "toph5",
	toph5: function (App) {
		this.setLangFile(Lang_File);
		const Config = App.config.modules.tourleaderboards;
		let mod = App.modules.tourleaderboards.system;
		let room = this.parseRoomAliases(Text.toRoomid(this.arg)) || this.room;
		if (!room) {
			return this.errorReply(this.usage({ desc: this.usageTrans('room') }));
		}

		if (!Config[room]) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(room));
		}
		let top = mod.getTop(room);
		if (!top || !top.length) {
			return this.restrictReply(this.mlt(10) + " " + Chat.italics(room) + " " + this.mlt(11), "rank");
		}

		let server = App.config.server.url;

		let topResults = [];
		for (let i = 0; i < 5 && i < top.length; i++) {
			topResults.push(Chat.italics("#" + (i + 1)) + " " + Chat.bold(top[i][0]) + " (" + toDecimalFormat(top[i][6]) + ")");
		}

		let spl = new LineSplitter(App.config.bot.maxMessageLength);

		spl.add(Chat.bold(this.parser.getRoomTitle(room)) + " | " + topResults.join(", ") + " | ");

		if (server) {
			if (server.charAt(server.length - 1) === '/') {
				spl.add(App.config.server.url + 'tourtable/' + room + '/get');
			} else {
				spl.add(App.config.server.url + '/tourtable/' + room + '/get');
			}
		}

		this.restrictReply(spl.getLines(), "toursrank");
	},

	toursrankconfig: function (App) {
		this.setLangFile(Lang_File);
		let room = this.parseRoomAliases(Text.toRoomid(this.arg)) || this.room;
		if (!room) {
			return this.errorReply(this.usage({ desc: this.usageTrans('room') }));
		}

		if (App.modules.tourldbcustom && App.modules.tourldbcustom.system && App.config.modules.tourldbcustom) {
			const customConfig = App.config.modules.tourldbcustom;
			const Mod = App.modules.tourldbcustom.system;
			const tableId = Mod.findAlias(Text.toId(room));

			if (customConfig[tableId] && (this.arg || customConfig[tableId].room === this.room)) {
				// Custom table found
				this.cmd = 'tourldbcustom';
				this.arg = "info" + ", " + tableId;
				this.args = ["info", tableId];
				this.parser.exec(this);
			} else {
				this.cmd = 'toursrankconfigh';
				this.arg = room;
				this.args = [room];
				this.parser.exec(this);
			}
		} else {
			this.cmd = 'toursrankconfigh';
			this.arg = room;
			this.args = [room];
			this.parser.exec(this);
		}
	},

	toursrankconfigh: function (App) {
		this.setLangFile(Lang_File);
		const Config = App.config.modules.tourleaderboards;
		let room = this.parseRoomAliases(Text.toRoomid(this.arg)) || this.room;
		if (!room) {
			return this.errorReply(this.usage({ desc: this.usageTrans('room') }));
		}

		if (!Config[room]) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(room));
		}

		this.restrictReply(this.mlt(18) + " " + Chat.italics(this.parser.getRoomTitle(room)) + ": " +
			Chat.bold(Config[room].winner) + " " + this.mlt(19) + ", " + Chat.bold(Config[room].finalist) +
			" " + this.mlt(20) + ", " + Chat.bold(Config[room].semifinalist) + " " + this.mlt(21) +
			", " + Chat.bold(Config[room].battle) + " " + this.mlt(22) + "." +
			(Config[room].onlyOfficial ? (" " + this.mlt(23) + ".") : "") +
			(Config[room].useratio ? (" " + this.mlt(24) + ".") : ""), "toursrank");
	},

	settoursrankconfig: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('tourldbconfig', this.room)) return this.replyAccessDenied('tourldbconfig');
		const Config = App.config.modules.tourleaderboards;

		let room = this.parseRoomAliases(Text.toRoomid(this.args[0]));
		if (!room || this.args.length < 2) {
			return this.errorReply(this.usage({ desc: this.usageTrans('room') }, { desc: 'win: N', optional: true }, { desc: 'final: N', optional: true }, { desc: 'semi_final: N', optional: true }, { desc: 'battle_win: N', optional: true }, { desc: 'use_ratio: yes/no', optional: true }, { desc: 'only_official: yes/no', optional: true }));
		}

		if (!Config[room]) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(room));
		}

		let newConfig = {
			onlyOfficial: Config[room].onlyOfficial,
			winner: Config[room].winner,
			finalist: Config[room].finalist,
			semifinalist: Config[room].semifinalist,
			battle: Config[room].battle,
			useratio: Config[room].useratio,
		};

		for (let i = 1; i < this.args.length; i++) {
			let arg = this.args[i].trim();
			let parts = arg.split(":");

			if (parts.length < 2) {
				return this.errorReply(this.usage({ desc: this.usageTrans('room') }, { desc: 'win: N', optional: true }, { desc: 'final: N', optional: true }, { desc: 'semi_final: N', optional: true }, { desc: 'battle_win: N', optional: true }, { desc: 'use_ratio: yes/no', optional: true }, { desc: 'only_official: yes/no', optional: true }));
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
				case "official":
				case "onlyofficial":
					newConfig.onlyOfficial = valBool;
					break;
				case "ratio":
				case "useratio":
					newConfig.useratio = valBool;
					break;
				default:
					return this.errorReply(this.usage({ desc: this.usageTrans('room') }, { desc: 'win: N', optional: true }, { desc: 'final: N', optional: true }, { desc: 'semi_final: N', optional: true }, { desc: 'battle_win: N', optional: true }, { desc: 'use_ratio: yes/no', optional: true }, { desc: 'only_official: yes/no', optional: true }));
			}
		}

		Config[room].onlyOfficial = newConfig.onlyOfficial;
		Config[room].winner = newConfig.winner;
		Config[room].finalist = newConfig.finalist;
		Config[room].semifinalist = newConfig.semifinalist;
		Config[room].battle = newConfig.battle;
		Config[room].useratio = newConfig.useratio;

		App.db.write();
		App.modules.tourleaderboards.system.generateTable(room);
		this.addToSecurityLog();

		this.restrictReply(this.mlt(18) + " " + Chat.italics(this.parser.getRoomTitle(room)) + ": " +
			Chat.bold(Config[room].winner) + " " + this.mlt(19) + ", " + Chat.bold(Config[room].finalist) +
			" " + this.mlt(20) + ", " + Chat.bold(Config[room].semifinalist) + " " + this.mlt(21) +
			", " + Chat.bold(Config[room].battle) + " " + this.mlt(22) + "." +
			(Config[room].onlyOfficial ? (" " + this.mlt(23) + ".") : "") +
			(Config[room].useratio ? (" " + this.mlt(24) + ".") : ""), "toursrank");
	},

	resettourleaderboards: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('tourldbconfig', this.room)) return this.replyAccessDenied('tourldbconfig');

		const Config = App.config.modules.tourleaderboards;

		let room = this.parseRoomAliases(Text.toRoomid(this.arg));

		if (!room) {
			return this.errorReply(this.usage({ desc: this.usageTrans('room') }));
		}

		if (!Config[room]) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(room));
		}

		const data = App.modules.tourleaderboards.system.data[room] || {};

		App.modules.tourleaderboards.system.data[room] = Object.create(null);

		const now = new Date();
		Config[room].cleanPoint = now.toString();
		App.db.write();
		App.modules.tourleaderboards.system.db.write();
		App.modules.tourleaderboards.system.generateTable(room);

		this.addToSecurityLog();

		let key = App.data.temp.createTempFile(
			HtmlMaker.wrapHTML(
				"<p>" +
				JSON.stringify(data) +
				"</p>"
			)
		);

		this.reply(this.mlt(30) + " " + Chat.italics(this.parser.getRoomTitle(room)) + ". " + this.mlt(31) + ": " + App.server.getControlPanelLink('/temp/' + key));
	},

	top100: "tourleaderboards",
	tourleaderboards: function (App) {
		this.setLangFile(Lang_File);
		let room = this.parseRoomAliases(Text.toRoomid(this.arg)) || this.room;
		if (!room) {
			return this.errorReply(this.usage({ desc: this.usageTrans('room') }));
		}

		if (App.modules.tourldbcustom && App.modules.tourldbcustom.system && App.config.modules.tourldbcustom) {
			const customConfig = App.config.modules.tourldbcustom;
			const Mod = App.modules.tourldbcustom.system;
			const tableId = Mod.findAlias(Text.toId(room));

			if (customConfig[tableId] && (this.arg || customConfig[tableId].room === this.room)) {
				// Custom table found
				this.cmd = 'tourldbcustom';
				this.arg = "top100" + ", " + tableId;
				this.args = ["top100", tableId];
				this.parser.exec(this);
			} else {
				this.cmd = 'tourleaderboardsh';
				this.arg = room;
				this.args = [room];
				this.parser.exec(this);
			}
		} else {
			this.cmd = 'tourleaderboardsh';
			this.arg = room;
			this.args = [room];
			this.parser.exec(this);
		}
	},

	top100h: "tourleaderboardsh",
	toph100: "tourleaderboardsh",
	tourleaderboardsh: function (App) {
		this.setLangFile(Lang_File);
		const Config = App.config.modules.tourleaderboards;
		let mod = App.modules.tourleaderboards.system;
		let server = App.config.server.url;
		let room = this.parseRoomAliases(Text.toRoomid(this.arg)) || this.room;
		if (!room) {
			return this.errorReply(this.usage({ desc: this.usageTrans('room') }));
		}

		if (!Config[room]) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(room));
		}

		if (this.getRoomType(this.room) === 'chat' && botCanHtml(this.room, App) && this.can('toursrank', this.room)) {
			// Get top 100
			let top = mod.getTop(room);
			if (!top || !top.length) {
				return this.restrictReply(this.mlt(10) + " " + Chat.italics(room) + " " + this.mlt(11), "rank");
			}

			// Send html table in chat
			let html = '<h3 style="text-align:center;">' + Text.escapeHTML(this.parser.getRoomTitle(room)) + " | " + Text.escapeHTML(this.mlt(25)) + '</h3><div style="overflow: auto; height: 120px; width: 100%;">';

			html += '<table border="1" cellspacing="0" cellpadding="3" style="min-width:100%;">';

			html += '<tr>';
			html += '<th>#</th>';
			html += '<th>' + Text.escapeHTML(this.mlt("user")) + '</th>';
			html += '<th>' + Text.escapeHTML(this.mlt(3)) + '</th>';
			html += '<th>' + Text.escapeHTML(this.mlt(4)) + '</th>';
			html += '<th>' + Text.escapeHTML(this.mlt(5)) + '</th>';
			html += '<th>' + Text.escapeHTML(this.mlt(6)) + '</th>';
			html += '<th>' + Text.escapeHTML(this.mlt(27)) + '</th>';
			html += '<th>' + Text.escapeHTML(this.mlt(26)) + '</th>';
			html += '<th>' + Text.escapeHTML(this.mlt("ratio")) + '</th>';
			html += '</tr>';

			for (let i = 0; i < 100 && i < top.length; i++) {
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

			html += '<p>' + Text.escapeHTML(this.mlt(28)) + ': ' + Text.escapeHTML(Config[room].cleanPoint || "-") + '</p>';

			if (server) {
				let fullTablelink;
				if (server.charAt(server.length - 1) === '/') {
					fullTablelink = App.config.server.url + 'tourtable/' + room + '/get';
				} else {
					fullTablelink = App.config.server.url + '/tourtable/' + room + '/get';
				}

				html += '<p>' + Text.escapeHTML(this.mlt(29)) + ': <a href="' + fullTablelink + '">' + fullTablelink + '</a></p>';
			}

			html += '</div>';

			this.send("/addhtmlbox " + html, this.room);
		} else {
			if (!server) {
				return this.pmReply(this.mlt(13));
			}
			if (server.charAt(server.length - 1) === '/') {
				return this.restrictReply(App.config.server.url + 'tourtable/' + room + '/get', 'toursrank');
			} else {
				return this.restrictReply(App.config.server.url + '/tourtable/' + room + '/get', 'toursrank');
			}
		}
	},

	"tourofficial": "official",
	official: function (App) {
		this.setLangFile(Lang_File);

		if (this.arg && this.args.length === 1) {
			const tableId = Text.toId(this.arg);
			if (tableId && App.modules.tourldbcustom && App.modules.tourldbcustom.system) {
				this.cmd = 'tourldbcustom';
				this.arg = "official" + ", " + tableId;
				this.args = ["official", tableId];
				this.parser.exec(this);
				return;
			}
		}

		const Config = App.config.modules.tourleaderboards;
		if (!this.can('tourofficial', this.room)) return this.replyAccessDenied('tourofficial');
		let mod = App.modules.tourleaderboards.system;
		let room = this.room;
		if (!room || this.getRoomType(room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}
		if (!Config[room]) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(room));
		}
		if (!mod.tourData[room]) {
			return this.errorReply(this.mlt(12));
		}
		if (!mod.isOfficial[room]) {
			mod.isOfficial[room] = true;
			this.reply(this.mlt(14));
		} else {
			this.errorReply(this.mlt(15));
		}
	},

	"tourunofficial": "unofficial",
	unofficial: function (App) {
		this.setLangFile(Lang_File);

		let room = this.room;

		if (App.modules.tourldbcustom && App.modules.tourldbcustom.system && App.modules.tourldbcustom.system.isOfficial[room]) {
			this.cmd = 'tourldbcustom';
			this.arg = "unofficial";
			this.args = ["unofficial"];
			this.parser.exec(this);
			return;
		}

		const Config = App.config.modules.tourleaderboards;
		if (!this.can('tourofficial', this.room)) return this.replyAccessDenied('tourofficial');
		let mod = App.modules.tourleaderboards.system;

		if (!room || this.getRoomType(room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}
		if (!Config[room]) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(room));
		}
		if (!mod.tourData[room]) {
			return this.errorReply(this.mlt(12));
		}
		if (mod.isOfficial[room]) {
			mod.isOfficial[room] = false;
			this.reply(this.mlt(16));
		} else {
			this.errorReply(this.mlt(17));
		}
	},
};
