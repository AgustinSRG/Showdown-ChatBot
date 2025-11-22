/**
 * Commands File
 *
 * joinroom: joins chat rooms
 * leaveroom: leaves chat rooms
 * custom: sends a custom text to the current room
 * send: sends a custom text to an arbitrary room
 * sendpm: sends a custom private message
 * say: similar to custom, but no commands are allowed
 * saycmd: similar to custom, but only commands are allowed, all broadcastable (!) and some excepted ones.
 * null: does nothing
 * eval: runs arbitrary javascript
 * hotpatch: reloads commands from bot modules
 * version: gets the package version
 * time: gets the bot time
 * uptime: gets the process uptime
 * contime: gets the connection time
 * reconnect: Forces the bot to reconnect to the server
 * setavatar: Sets bot avatar
 * setstatusmessage: Sets bot status message
 * clearstatusmessage: Clears bot status message
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
		if (!this.arg) return this.errorReply(this.usage({ desc: this.usageTrans('room') }, { desc: '...', optional: true }));
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
		if (!this.arg) return this.errorReply(this.usage({ desc: this.usageTrans('room') }, { desc: '...', optional: true }));
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

	/* Reconnect */

	restart: 'reconnect',
	reconnect: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('reconnect', this.room)) return this.replyAccessDenied('reconnect');
		this.addToSecurityLog();
		App.restartBot();
	},

	/* Config commands */

	setavatar: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('botconfig', this.room)) return this.replyAccessDenied('botconfig');

		const avatar = Text.toRoomid(this.arg);

		if (!avatar) return this.errorReply(this.usage({ desc: this.usageTrans('avatar') }));

		App.config.modules.core.avatar = avatar;

		App.db.write();
		this.addToSecurityLog();

		App.bot.send('|/avatar ' + avatar);
	},

	setstatusmsg: 'setstatusmessage',
	setstatusmessage: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('botconfig', this.room)) return this.replyAccessDenied('botconfig');

		const msg = (this.arg || "").trim();

		if (!msg) return this.errorReply(this.usage({ desc: this.usageTrans('message') }));

		App.config.modules.core.status = msg;

		App.db.write();
		this.addToSecurityLog();

		App.bot.send('|/status ' + msg);
	},

	clearstatusmsg: 'clearstatusmessage',
	clearstatusmessage: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('botconfig', this.room)) return this.replyAccessDenied('botconfig');

		App.config.modules.core.status = "";

		App.db.write();
		this.addToSecurityLog();

		App.bot.send('|/clearstatus');
	},

	/* Custom send */

	custom: function () {
		this.setLangFile(Lang_File);
		if (!this.can('send', this.room)) return this.replyAccessDenied('send');
		if (!this.arg) return this.errorReply(this.usage({ desc: this.usageTrans('message') }));
		this.send(this.arg, this.targetRoom);
		this.addToSecurityLog();
	},

	send: function () {
		this.setLangFile(Lang_File);
		if (!this.can('send', this.room)) return this.replyAccessDenied('send');
		if (this.args.length < 2) {
			return this.errorReply(this.usage({ desc: this.usageTrans('room') }, { desc: this.usageTrans('message') }));
		}
		let room = this.parseRoomAliases(Text.toRoomid(this.args[0]));
		let msg = Text.trim(this.args.slice(1).join(','));
		if (!msg) {
			return this.errorReply(this.usage({ desc: this.usageTrans('room') }, { desc: this.usageTrans('message') }));
		}
		this.send(msg, room);
		this.addToSecurityLog();
	},

	pm: 'sendpm',
	sendpm: function () {
		this.setLangFile(Lang_File);
		if (!this.can('send', this.room)) return this.replyAccessDenied('send');
		if (this.args.length < 2) return this.errorReply(this.usage({ desc: this.usageTrans('user') }, { desc: this.usageTrans('message') }));
		let user = Text.toId(this.args[0]);
		let msg = this.args.slice(1).join(',');
		if (!user || !msg) return this.errorReply(this.usage({ desc: this.usageTrans('user') }, { desc: this.usageTrans('message') }));
		this.sendPM(user, msg);
		this.addToSecurityLog();
	},

	say: function () {
		this.setLangFile(Lang_File);
		if (!this.can('say', this.room)) return this.replyAccessDenied('say');
		if (!this.arg) return this.errorReply(this.usage({ desc: this.usageTrans('message') }));
		this.reply(Text.stripCommands(this.arg));
	},

	saycmd: function () {
		this.setLangFile(Lang_File);
		if (!this.can('saycmd', this.room)) return this.replyAccessDenied('saycmd');
		if (!this.arg) return this.errorReply(this.usage({ desc: this.usageTrans('command') }));

		const replyText = this.arg.trim();
		let hasExemptedCommand = false;

		const COMMAND_EXCEPTIONS = [
			"/addhtmlbox",
		];

		for (let cmd of COMMAND_EXCEPTIONS) {
			if (replyText.startsWith(cmd + " ")) {
				hasExemptedCommand = true;
				break;
			}
		}

		if (this.parser.data.infocmds) {
			const extraCommands = (this.parser.data.infocmds + "").split(",");
			for (let cmd of extraCommands) {
				const cmdTrim = cmd.trim();
				if (!cmdTrim) {
					continue;
				}
				if (replyText.startsWith(cmdTrim + " ")) {
					hasExemptedCommand = true;
					break;
				}
			}
		}

		if (replyText.startsWith("/wall ") || replyText.startsWith("/announce ")) {
			const actualMessage = replyText.split(" ").slice(1).join(" ");
			this.wall = true;
			this.restrictReply(Text.stripCommands(actualMessage), 'info');
		} else if (replyText.startsWith("!") || hasExemptedCommand) {
			this.replyCommand(replyText);
		} else if (replyText.startsWith("/")) {
			const cmd = Text.toCmdid(replyText.split(" ")[0]);
			this.errorReply(this.mlt(12) + ": " + Chat.code("/" + cmd));
		} else {
			this.errorReply(this.mlt(13));
		}
	},

	/* Development */

	"null": function () {
		return;
	},

	"eval": function (App) {
		this.setLangFile(Lang_File);
		if (!this.parser.app.config.debug) return this.errorReply(this.mlt('noeval'));
		if (this.parser.app.env.staticmode) return this.errorReply(this.mlt('noeval'));
		if (!this.isExcepted()) return this.errorReply(this.mlt('evaldenied'));
		if (!this.arg) return this.errorReply(this.usage({ desc: 'script' }));
		if (!App.jsInject) return this.errorReply("[Javascript injection is disabled]");
		try {
			let resultStr = JSON.stringify(eval(this.arg));
			if (resultStr.length <= App.config.bot.maxMessageLength) {
				this.reply(resultStr);
			} else {
				this.reply('!code ' + resultStr);
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
