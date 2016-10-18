/**
 * Commands File
 *
 * toursrank: gets the tournament ranking
 * top: gets the TOP5 for a room
 * tourleaderboards: gets the TOP100 table for a room
 * official: makes a tournament official
 * unofficial: makes a tournament unofficial
 */

'use strict';

const Path = require('path');
const Translator = Tools('translate');
const Text = Tools('text');
const Chat = Tools('chat');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));

module.exports = {
	rank: "toursrank",
	toursrank: function (App) {
		const Config = App.config.modules.tourleaderboards;
		let mod = App.modules.tourleaderboards.system;
		let user = Text.toId(this.args[0]) || this.byIdent.id;
		let room = this.parseRoomAliases(Text.toRoomid(this.args[1])) || this.room;
		if (!user || !room) {
			return this.errorReply(this.usage({desc: this.usageTrans('user'), optional: true}, {desc: this.usageTrans('room'), optional: true}));
		}
		if (!Config[room]) {
			return this.errorReply(translator.get(0, this.lang) + " " + Chat.italics(room));
		}
		if (user.length > 19) {
			return this.errorReply(translator.get(1, this.lang));
		}
		let rank = mod.getUserPoints(room, user);
		let txt = translator.get(2, this.lang) + " " + Chat.bold(rank.name) + " " +
			translator.get('in', this.lang) + " " + Chat.italics(this.parser.getRoomTitle(room)) + " | ";
		txt += translator.get(3, this.lang) + ": " + rank.points + " | ";
		txt += translator.get(4, this.lang) + ": " + rank.wins + ", " + translator.get(5, this.lang) +
			": " + rank.finals + ", " + translator.get(6, this.lang) + ": " + rank.semis + ". ";
		txt += translator.get(7, this.lang) + ": " + rank.tours + " " + translator.get(8, this.lang) +
			", " + rank.battles + " " + translator.get(9, this.lang) + ".";
		this.restrictReply(txt, 'toursrank');
	},

	top: function (App) {
		const Config = App.config.modules.tourleaderboards;
		let mod = App.modules.tourleaderboards.system;
		let room = this.parseRoomAliases(Text.toRoomid(this.arg)) || this.room;
		if (!room) {
			return this.errorReply(this.usage({desc: this.usageTrans('room')}));
		}
		if (!Config[room]) {
			return this.errorReply(translator.get(0, this.lang) + " " + Chat.italics(room));
		}
		let top = mod.getTop(room);
		if (!top || !top.length) {
			return this.restrictReply(translator.get(10, this.lang) + " " + Chat.italics(room) + " " + translator.get(11, this.lang), "rank");
		}
		let topResults = [];
		for (let i = 0; i < 5 && i < top.length; i++) {
			topResults.push(Chat.italics("#" + (i + 1)) + " " + Chat.bold(top[i][0]) + " (" + top[i][6] + ")");
		}
		this.restrictReply(Chat.bold(this.parser.getRoomTitle(room)) + " | " + topResults.join(", "), "toursrank");
	},

	tourleaderboards: function (App) {
		const Config = App.config.modules.tourleaderboards;
		let server = App.config.server.url;
		if (!server) {
			return this.pmReply(translator.get(13, this.lang));
		}
		let room = this.parseRoomAliases(Text.toRoomid(this.arg)) || this.room;
		if (!room) {
			return this.errorReply(this.usage({desc: this.usageTrans('room')}));
		}
		if (!Config[room]) {
			return this.errorReply(translator.get(0, this.lang) + " " + Chat.italics(room));
		}
		if (server.charAt(server.length - 1) === '/') {
			return this.restrictReply(App.config.server.url + 'tourtable/' + room + '/get', 'toursrank');
		} else {
			return this.restrictReply(App.config.server.url + '/tourtable/' + room + '/get', 'toursrank');
		}
	},

	official: function (App) {
		const Config = App.config.modules.tourleaderboards;
		if (!this.can('tourofficial', this.room)) return this.replyAccessDenied('tourofficial');
		let mod = App.modules.tourleaderboards.system;
		let room = this.room;
		if (!room || this.getRoomType(room) !== 'chat') {
			return this.errorReply(translator.get('nochat', this.lang));
		}
		if (!Config[room]) {
			return this.errorReply(translator.get(0, this.lang) + " " + Chat.italics(room));
		}
		if (!mod.tourData[room]) {
			return this.errorReply(translator.get(12, this.lang));
		}
		if (!mod.isOfficial[room]) {
			mod.isOfficial[room] = true;
			this.reply(translator.get(14, this.lang));
		} else {
			this.errorReply(translator.get(15, this.lang));
		}
	},

	unofficial: function (App) {
		const Config = App.config.modules.tourleaderboards;
		if (!this.can('tourofficial', this.room)) return this.replyAccessDenied('tourofficial');
		let mod = App.modules.tourleaderboards.system;
		let room = this.room;
		if (!room || this.getRoomType(room) !== 'chat') {
			return this.errorReply(translator.get('nochat', this.lang));
		}
		if (!Config[room]) {
			return this.errorReply(translator.get(0, this.lang) + " " + Chat.italics(room));
		}
		if (!mod.tourData[room]) {
			return this.errorReply(translator.get(12, this.lang));
		}
		if (mod.isOfficial[room]) {
			mod.isOfficial[room] = false;
			this.reply(translator.get(16, this.lang));
		} else {
			this.errorReply(translator.get(17, this.lang));
		}
	},
};
