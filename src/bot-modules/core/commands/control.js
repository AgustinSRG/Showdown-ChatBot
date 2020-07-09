/**
 * Commands File
 *
 * joinroom: joins chat rooms
 * leaveroom: leaves chat rooms
 * custom: sends a custom text to the current room
 * send: sends a custom text to an arbitrary room
 * sendpm: sends a custom private message
 * say: similar to custom, but no comands are allowed
 * null: does nothing
 * eval: runs arbitrary javascript
 * hotpatch: realoads commands from bot modules
 * version: gets the package version
 * time: gets the bot time
 * uptime: gets the process uptime
 * contime: gets the connection time
 */

'use strict';

const Path = require('path');

const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'control.translations');

module.exports = {
	/* Joining / Leaving Rooms */
	join: 'joinroom',
	joinrooms: 'joinroom',
	joinroom: function () {
		this.setLangFile(Lang_File);
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
			this.parser.bot.joinRooms(rooms);
			this.parser.app.logCommandAction(this);
		}
	},

	leave: 'leaveroom',
	leaverooms: 'leaveroom',
	leaveroom: function () {
		this.setLangFile(Lang_File);
		if (!this.can('leaveroom', this.room)) return this.replyAccessDenied('leaveroom');
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('room')}, {desc: '...', optional: true}));
		let rooms = [];
		for (let i = 0; i < this.args.length; i++) {
			let roomid = Text.toRoomid(this.args[i]);
			if (!roomid) continue;
			if (rooms.indexOf(roomid) >= 0) continue;
			rooms.push(roomid);
		}
		if (rooms.length > 0) {
			this.parser.bot.leaveRooms(rooms);
			this.parser.app.logCommandAction(this);
		}
	},

	/* Custom send */

	custom: function () {
		this.setLangFile(Lang_File);
		if (!this.can('send', this.room)) return this.replyAccessDenied('send');
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('message')}));
		this.send(this.arg, this.targetRoom);
		this.addToSecurityLog();
	},

	send: function () {
		this.setLangFile(Lang_File);
		if (!this.can('send', this.room)) return this.replyAccessDenied('send');
		if (this.args.length < 2) {
			return this.errorReply(this.usage({desc: this.usageTrans('room')}, {desc: this.usageTrans('message')}));
		}
		let room = this.parseRoomAliases(Text.toRoomid(this.args[0]));
		let msg = Text.trim(this.args.slice(1).join(','));
		if (!msg) {
			return this.errorReply(this.usage({desc: this.usageTrans('room')}, {desc: this.usageTrans('message')}));
		}
		this.send(msg, room);
		this.addToSecurityLog();
	},

	pm: 'sendpm',
	sendpm: function () {
		this.setLangFile(Lang_File);
		if (!this.can('send', this.room)) return this.replyAccessDenied('send');
		if (this.args.length < 2) return this.errorReply(this.usage({desc: this.usageTrans('user')}, {desc: this.usageTrans('message')}));
		let user = Text.toId(this.args[0]);
		let msg = this.args.slice(1).join(',');
		if (!user || !msg) return this.errorReply(this.usage({desc: this.usageTrans('user')}, {desc: this.usageTrans('message')}));
		this.sendPM(user, msg);
		this.addToSecurityLog();
	},

	say: function () {
		this.setLangFile(Lang_File);
		if (!this.can('say', this.room)) return this.replyAccessDenied('say');
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('message')}));
		this.reply(Text.stripCommands(this.arg));
	},

	/* Development */

	"null": function () {
		return;
	},

	"eval": function (App) {
		if (!this.parser.app.config.debug) return;
		if (this.parser.app.env.staticmode) return;
		if (!this.isExcepted()) return;
		if (!this.arg) return this.errorReply(this.usage({desc: 'script'}));
		if (!App.jsInject) return this.errorReply("[Javascript injection is disabled]");
		try {
			let res = JSON.stringify(eval(this.arg));
			if (res.length > 0) {
				this.reply(Chat.code(res));
			}
		} catch (err) {
			this.reply('Error: ' + err.code + ' - ' + err.message);
		}
		this.addToSecurityLog();
	},

	hotpatch: function () {
		this.setLangFile(Lang_File);
		if (!this.isExcepted()) return;
		this.parser.app.hotpatchCommands(Path.resolve(__dirname, '../../'));
		this.reply(this.mlt(0));
		this.addToSecurityLog();
	},

	version: function (App) {
		this.setLangFile(Lang_File);
		let reply = Chat.bold('Showdown ChatBot v' + App.env.package.version) + ' (' + App.env.package.homepage + ')';
		this.restrictReply(reply, 'info');
	},

	time: function () {
		this.setLangFile(Lang_File);
		let date = new Date();
		this.restrictReply(this.mlt(1) + ': ' + Chat.italics(date.toString()), 'info');
	},

	uptime: function () {
		this.setLangFile(Lang_File);
		let times = [];
		let time = Math.round(process.uptime());
		let aux;
		aux = time % 60; // Seconds
		if (aux > 0 || time === 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(2) : this.mlt(3)));
		time = Math.floor(time / 60);
		aux = time % 60; // Minutes
		if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(4) : this.mlt(5)));
		time = Math.floor(time / 60);
		aux = time % 24; // Hours
		if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(6) : this.mlt(7)));
		time = Math.floor(time / 24); // Days
		if (time > 0) times.unshift(time + ' ' + (time === 1 ? this.mlt(8) : this.mlt(9)));
		this.restrictReply(Chat.bold(this.mlt(10) + ':') + ' ' + Chat.italics(times.join(', ')), 'info');
	},

	contime: function (App) {
		if (!App.bot.conntime) return;
		this.setLangFile(Lang_File);
		let times = [];
		let time = Math.round((Date.now() - App.bot.conntime) / 1000);
		let aux;
		aux = time % 60; // Seconds
		if (aux > 0 || time === 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(2) : this.mlt(3)));
		time = Math.floor(time / 60);
		aux = time % 60; // Minutes
		if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(4) : this.mlt(5)));
		time = Math.floor(time / 60);
		aux = time % 24; // Hours
		if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(6) : this.mlt(7)));
		time = Math.floor(time / 24); // Days
		if (time > 0) times.unshift(time + ' ' + (time === 1 ? this.mlt(8) : this.mlt(9)));
		this.restrictReply(Chat.bold(this.mlt(11) + ':') + ' ' + Chat.italics(times.join(', ')), 'info');
	},
};
