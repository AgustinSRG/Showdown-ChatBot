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

module.exports = {
	rank: "toursrank",
	toursrank: function (App) {
		this.setLangFile(Lang_File);
		const Config = App.config.modules.tourleaderboards;
		let mod = App.modules.tourleaderboards.system;
		let user = Text.toId(this.args[0]) || this.byIdent.id;
		let room = this.parseRoomAliases(Text.toRoomid(this.args[1])) || this.room;
		if (!user || !room) {
			return this.errorReply(this.usage({desc: this.usageTrans('user'), optional: true}, {desc: this.usageTrans('room'), optional: true}));
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
		const Config = App.config.modules.tourleaderboards;
		let mod = App.modules.tourleaderboards.system;
		let room = this.parseRoomAliases(Text.toRoomid(this.arg)) || this.room;
		if (!room) {
			return this.errorReply(this.usage({desc: this.usageTrans('room')}));
		}
		if (!Config[room]) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(room));
		}
		let top = mod.getTop(room);
		if (!top || !top.length) {
			return this.restrictReply(this.mlt(10) + " " + Chat.italics(room) + " " + this.mlt(11), "rank");
		}
		let topResults = [];
		for (let i = 0; i < 5 && i < top.length; i++) {
			topResults.push(Chat.italics("#" + (i + 1)) + " " + Chat.bold(top[i][0]) + " (" + toDecimalFormat(top[i][6]) + ")");
		}
		this.restrictReply(Chat.bold(this.parser.getRoomTitle(room)) + " | " + topResults.join(", "), "toursrank");
	},

	toursrankconfig: function (App) {
		this.setLangFile(Lang_File);
		const Config = App.config.modules.tourleaderboards;
		let room = this.parseRoomAliases(Text.toRoomid(this.arg)) || this.room;
		if (!room) {
			return this.errorReply(this.usage({desc: this.usageTrans('room')}));
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

	top100: "tourleaderboards",
	tourleaderboards: function (App) {
		this.setLangFile(Lang_File);
		const Config = App.config.modules.tourleaderboards;
		let server = App.config.server.url;
		if (!server) {
			return this.pmReply(this.mlt(13));
		}
		let room = this.parseRoomAliases(Text.toRoomid(this.arg)) || this.room;
		if (!room) {
			return this.errorReply(this.usage({desc: this.usageTrans('room')}));
		}
		if (!Config[room]) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(room));
		}
		if (server.charAt(server.length - 1) === '/') {
			return this.restrictReply(App.config.server.url + 'tourtable/' + room + '/get', 'toursrank');
		} else {
			return this.restrictReply(App.config.server.url + '/tourtable/' + room + '/get', 'toursrank');
		}
	},

	official: function (App) {
		this.setLangFile(Lang_File);
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

	unofficial: function (App) {
		this.setLangFile(Lang_File);
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
		if (mod.isOfficial[room]) {
			mod.isOfficial[room] = false;
			this.reply(this.mlt(16));
		} else {
			this.errorReply(this.mlt(17));
		}
	},
};
