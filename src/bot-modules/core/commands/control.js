/**
 * Commands File
 *
 */

'use strict';

const Path = require('path');

const Text = Tools.get('text.js');
const Chat = Tools.get('chat.js');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'control.translations'));

App.parser.addPermission('joinroom', {group: 'admin'});
App.parser.addPermission('send', {group: 'admin'});
App.parser.addPermission('say', {group: 'mod'});

module.exports = {
	/* Joining / Leaving Rooms */

	join: 'joinroom',
	joinrooms: 'joinroom',
	joinroom: function () {
		if (!this.can('joinroom', this.room)) return this.replyAccessDenied('joinroom');
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('room')}, {desc: '...', optional: true}));
		let rooms = [];
		for (let i = 0; i < this.args.length; i++) {
			let roomid = Text.toRoomid(this.args[i]);
			if (!roomid) continue;
			if (rooms.indexOf(roomid) >= 0) continue;
			rooms.push(roomid);
		}
		if (rooms.length > 0) {
			App.bot.joinRooms(rooms);
			App.logCommandAction(this);
		}
	},

	leave: 'leaveroom',
	leaverooms: 'leaveroom',
	leaveroom: function () {
		if (!this.can('joinroom', this.room)) return this.replyAccessDenied('joinroom');
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('room')}, {desc: '...', optional: true}));
		let rooms = [];
		for (let i = 0; i < this.args.length; i++) {
			let roomid = Text.toRoomid(this.args[i]);
			if (!roomid) continue;
			if (rooms.indexOf(roomid) >= 0) continue;
			rooms.push(roomid);
		}
		if (rooms.length > 0) {
			App.bot.leaveRooms(rooms);
			App.logCommandAction(this);
		}
	},

	/* Custom send */

	custom: function () {
		if (!this.can('send', this.room)) return this.replyAccessDenied('send');
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('message')}));
		this.send(this.arg, this.targetRoom);
		App.logCommandAction(this);
	},

	send: function () {
		if (!this.can('send', this.room)) return this.replyAccessDenied('send');
		if (this.args.length !== 2) {
			return this.errorReply(this.usage({desc: this.usageTrans('room')}, {desc: this.usageTrans('message')}));
		}
		let room = Text.toRoomid(this.args[0]);
		let msg = this.args[1].trim();
		if (!msg) {
			return this.errorReply(this.usage({desc: this.usageTrans('room')}, {desc: this.usageTrans('message')}));
		}
		this.send(msg, room);
		App.logCommandAction(this);
	},

	pm: 'sendpm',
	sendpm: function () {
		if (!this.can('send', this.room)) return this.replyAccessDenied('send');
		if (this.args.length !== 2) return this.errorReply(this.usage({desc: this.usageTrans('user')}, {desc: this.usageTrans('message')}));
		let user = Text.toId(this.args[0]);
		let msg = this.args[1].trim();
		if (!user || !msg) return this.errorReply(this.usage({desc: this.usageTrans('user')}, {desc: this.usageTrans('message')}));
		this.sendPM(user, msg);
		App.logCommandAction(this);
	},

	say: function () {
		if (!this.can('say', this.room)) return this.replyAccessDenied('say');
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('message')}));
		this.reply(Text.stripCommands(this.arg));
	},

	/* Development */

	"null": function () {
		return;
	},

	"eval": function () {
		if (!App.config.debug) return;
		if (global.ShellOptions && global.ShellOptions.staticmode) return;
		if (!this.isExcepted()) return;
		if (!this.arg) return this.errorReply(this.usage({desc: 'script'}));
		try {
			let res = eval(this.arg);
			this.reply(Chat.code(JSON.stringify(res)));
		} catch (err) {
			this.reply('Error: ' + err.code + ' - ' + err.message);
		}
		App.logCommandAction(this);
	},

	hotpatch: function () {
		if (!this.isExcepted()) return;
		App.hotpatchCommands(Path.resolve(__dirname, '../../'));
		this.reply(translator.get(0, this.lang));
		App.logCommandAction(this);
	},

	version: function () {
		let reply = Chat.bold('Showdown ChatBot v' + Package.version) + ' (' + Package.homepage + ')';
		this.restrictReply(reply, 'info');
	},

	time: function () {
		let date = new Date();
		this.restrictReply(translator.get(1, this.lang) + ': ' + Chat.italics(date.toString()), 'info');
	},

	uptime: function () {
		let times = [];
		let time = Math.round(process.uptime());
		let aux;
		aux = time % 60; // Seconds
		if (aux > 0 || time === 0) times.unshift(aux + ' ' + (aux === 1 ? translator.get(2, this.lang) : translator.get(3, this.lang)));
		time = Math.floor(time / 60);
		aux = time % 60; // Minutes
		if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? translator.get(4, this.lang) : translator.get(5, this.lang)));
		time = Math.floor(time / 60);
		aux = time % 24; // Hours
		if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? translator.get(6, this.lang) : translator.get(7, this.lang)));
		time = Math.floor(time / 24); // Days
		if (time > 0) times.unshift(time + ' ' + (time === 1 ? translator.get(8, this.lang) : translator.get(9, this.lang)));
		this.restrictReply(Chat.bold(translator.get(10, this.lang) + ':') + ' ' + Chat.italics(times.join(', ')), 'info');
	},
};
