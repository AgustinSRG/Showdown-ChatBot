/**
 * Commands File
 *
 */

'use strict';

const Path = require('path');

const Text = Tools.get('text.js');
const Chat = Tools.get('chat.js');
const Translator = Tools.get('translate.js');
const LineSplitter = Tools.get('line-splitter.js');

const translator = new Translator(Path.resolve(__dirname, 'cmd-admin.translations'));

let Temp_Var = "";

module.exports = {
	/* Aliases */
	setalias: function (App) {
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (this.args.length !== 2) {
			return this.errorReply(this.usage({desc: translator.get('alias', this.lang)}, {desc: this.usageTrans('command')}));
		}
		let alias = Text.toCmdid(this.args[0]);
		let cmd = Text.toCmdid(this.args[1]);
		if (!alias || !cmd) {
			return this.errorReply(this.usage({desc: translator.get('alias', this.lang)}, {desc: this.usageTrans('command')}));
		}
		if (!App.parser.commandExists(cmd)) {
			return this.errorReply(translator.get(0, this.lang) + ' ' + Chat.italics(cmd) + ' ' + translator.get(1, this.lang));
		}
		App.parser.data.aliases[alias] = cmd;
		App.parser.saveData();
		this.addToSecurityLog();
		this.reply(translator.get(2, this.lang) + ' ' + Chat.italics(alias) + ' ' + translator.get(3, this.lang) + ' ' + Chat.italics(cmd));
	},

	rmalias: function (App) {
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (!this.arg) return this.errorReply(this.usage({desc: translator.get('alias', this.lang)}));
		let alias = Text.toCmdid(this.arg);
		if (!alias) return this.errorReply(this.usage({desc: translator.get('alias', this.lang)}));
		if (App.parser.data.aliases[alias]) {
			delete App.parser.data.aliases[alias];
			App.parser.saveData();
			this.addToSecurityLog();
			this.reply(translator.get(2, this.lang) + ' ' + Chat.italics(alias) + ' ' + translator.get(4, this.lang));
		} else {
			this.reply(translator.get(2, this.lang) + ' ' + Chat.italics(alias) + ' ' + translator.get(5, this.lang));
		}
	},

	/* Language */
	lang: function (App) {
		if (!this.can('set', this.room)) return this.replyAccessDenied('set');
		if (!this.arg) return this.errorReply(this.usage({desc: translator.get('language', this.lang)}));
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(translator.get(6, this.lang));
		let lang = Text.toId(this.args[0]);
		if (!lang) return this.errorReply(this.usage({desc: translator.get('language', this.lang)}));
		if (lang in App.languages) {
			App.config.language.rooms[room] = lang;
			App.saveConfig();
			this.addToSecurityLog();
			this.lang = lang;
			this.reply(translator.get(7, this.lang) + ' ' + Chat.italics(room) + ' ' + translator.get(8, this.lang) + ' ' + Chat.italics(lang));
		} else {
			this.errorReply(translator.get(9, this.lang) + ' ' + Chat.italics(lang) + ' ' +
				translator.get(10, this.lang) + ': ' + Object.values(App.languages).join(', '));
		}
	},

	/* Dynamic commands */
	temp: function () {
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (this.arg) {
			Temp_Var = this.arg;
		}
		this.reply('Temp: ' + Temp_Var);
	},

	setcmd: function (App) {
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		if (!Temp_Var) return this.errorReply(translator.get(11, this.lang) + ' ' + Chat.code(this.token + 'temp <' + this.usageTrans('text') + '>'));
		let cmd = Text.toCmdid(this.args[0]);
		if (!cmd) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		if (typeof App.parser.data.dyncmds[cmd] === 'object') {
			return this.errorReply(translator.get(0, this.lang) + ' ' + Chat.italics(cmd) + ' ' + translator.get(12, this.lang));
		}
		App.parser.data.dyncmds[cmd] = Temp_Var;
		App.parser.saveData();
		this.addToSecurityLog();
		this.reply(translator.get(0, this.lang) + ' ' + Chat.italics(cmd) + ' ' + translator.get(13, this.lang));
	},

	setindexcmd: function (App) {
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		let cmd = Text.toCmdid(this.args[0]);
		if (!cmd) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		if (App.parser.data.dyncmds[cmd]) {
			return this.errorReply(translator.get(0, this.lang) + ' ' + Chat.italics(cmd) + ' ' + translator.get(14, this.lang));
		}
		App.parser.data.dyncmds[cmd] = {};
		App.parser.saveData();
		this.addToSecurityLog();
		this.reply(translator.get(0, this.lang) + ' ' + Chat.italics(cmd) + ' ' + translator.get(15, this.lang));
	},

	setsubcmd: function (App) {
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (this.args.length !== 2) return this.errorReply(this.usage({desc: this.usageTrans('command')}, {desc: this.usageTrans('subcmd')}));
		if (!Temp_Var) return this.errorReply(translator.get(11, this.lang) + ' ' + Chat.code(this.token + 'temp <' + this.usageTrans('text') + '>'));
		let cmd = Text.toCmdid(this.args[0]);
		let sub = Text.toCmdid(this.args[1]);
		if (!cmd || !sub) return this.errorReply(this.usage({desc: this.usageTrans('command')}, {desc: this.usageTrans('subcmd')}));
		if (typeof App.parser.data.dyncmds[cmd] !== 'object') {
			return this.errorReply(translator.get(0, this.lang) + ' ' + Chat.italics(cmd) + ' ' + translator.get(16, this.lang));
		}
		App.parser.data.dyncmds[cmd][sub] = Temp_Var;
		App.parser.saveData();
		this.addToSecurityLog();
		this.reply(translator.get(0, this.lang) + ' ' + Chat.italics(cmd + ' ' + sub) + ' ' + translator.get(13, this.lang));
	},

	rmcmd: function (App) {
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		let cmd = Text.toCmdid(this.arg);
		if (!cmd) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		if (!App.parser.data.dyncmds[cmd]) {
			return this.errorReply(translator.get(0, this.lang) + ' ' + Chat.italics(cmd) + ' ' + translator.get(1, this.lang));
		}
		delete App.parser.data.dyncmds[cmd];
		App.parser.saveData();
		this.addToSecurityLog();
		this.reply(translator.get(0, this.lang) + ' ' + Chat.italics(cmd) + ' ' + translator.get(17, this.lang));
	},

	rmsubcmd: function (App) {
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (this.args.length !== 2) return this.errorReply(this.usage({desc: this.usageTrans('command')}, {desc: this.usageTrans('subcmd')}));
		let cmd = Text.toCmdid(this.args[0]);
		let sub = Text.toCmdid(this.args[1]);
		if (!cmd || !sub) return this.errorReply(this.usage({desc: this.usageTrans('command')}, {desc: this.usageTrans('subcmd')}));
		if (typeof App.parser.data.dyncmds[cmd] !== 'object') {
			return this.errorReply(translator.get(0, this.lang) + ' ' + Chat.italics(cmd) + ' ' + translator.get(16, this.lang));
		}
		if (!App.parser.data.dyncmds[cmd][sub]) {
			return this.errorReply(translator.get(0, this.lang) + ' ' + Chat.italics(cmd + ' ' + sub) + ' ' + translator.get(1, this.lang));
		}
		delete App.parser.data.dyncmds[cmd][sub];
		App.parser.saveData();
		this.addToSecurityLog();
		this.reply(translator.get(0, this.lang) + ' ' + Chat.italics(cmd + ' ' + sub) + ' ' + translator.get(17, this.lang));
	},

	dyncmdlist: function (App) {
		let dyn = Object.keys(App.parser.data.dyncmds).sort();
		if (dyn.length === 0) {
			return this.errorReply(translator.get(35, this.lang));
		}
		let spl = new LineSplitter(App.config.bot.maxMessageLength);
		spl.add(Chat.bold(translator.get(36, this.lang) + ":"));
		for (let i = 0; i < dyn.length; i++) {
			spl.add(" " + dyn[i] + (i < (dyn.length - 1) ? ',' : ''));
		}
		return this.restrictReply(spl.getLines(), 'info');
	},

	/* Permissions */
	grant: function (App) {
		if (!this.can('grant', this.room)) return this.replyAccessDenied('grant');
		if (this.args.length !== 2) {
			return this.errorReply(this.usage({desc: translator.get('permission', this.lang)}, {desc: this.usageTrans('rank')}));
		}
		let perm = Text.toId(this.args[0]);
		let rank = this.args[1].toLowerCase().trim();
		if (!perm || !rank) {
			return this.errorReply(this.usage({desc: translator.get('permission', this.lang)}, {desc: this.usageTrans('rank')}));
		}
		let groups = ['user', 'excepted'].concat(App.config.parser.groups);
		if (groups.indexOf(rank) >= 0) {
			if (!App.parser.modPermissions[perm]) {
				return this.errorReply(translator.get(18, this.lang) + ' ' + Chat.italics(perm) + ' ' + translator.get(5, this.lang));
			}
			App.parser.data.permissions[perm] = rank;
			App.parser.saveData();
			this.addToSecurityLog();
			switch (rank) {
			case 'user':
				this.reply(translator.get(18, this.lang) + ' ' + Chat.italics(perm) + ' ' + translator.get(19, this.lang));
				break;
			case 'excepted':
				this.reply(translator.get(18, this.lang) + ' ' + Chat.italics(perm) + ' ' + translator.get(20, this.lang));
				break;
			default:
				this.reply(translator.get(18, this.lang) + ' ' + Chat.italics(perm) + ' ' +
						translator.get(21, this.lang) + ' ' + Chat.bold(rank) + ' ' + translator.get(22, this.lang));
			}
		} else {
			return this.errorReply(translator.get(23, this.lang) + ": " + groups.join(', '));
		}
	},

	set: function (App) {
		if (!this.can('set', this.room)) return this.replyAccessDenied('set');
		if (this.args.length !== 2) {
			return this.errorReply(this.usage({desc: translator.get('permission', this.lang)}, {desc: this.usageTrans('rank')}));
		}
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(translator.get(6, this.lang));
		let perm = Text.toId(this.args[0]);
		let rank = this.args[1].toLowerCase().trim();
		if (!perm || !rank) {
			return this.errorReply(this.usage({desc: translator.get('permission', this.lang)}, {desc: this.usageTrans('rank')}));
		}
		let groups = ['user', 'excepted'].concat(App.config.parser.groups);
		if (groups.indexOf(rank) >= 0) {
			if (!App.parser.modPermissions[perm]) {
				return this.errorReply(translator.get(18, this.lang) + ' ' + Chat.italics(perm) + ' ' + translator.get(5, this.lang));
			}
			if (!App.parser.canSet(this.byIdent, perm, room, rank)) {
				return this.errorReply(translator.get(24, this.lang) + ' ' + Chat.italics(perm) + ' ' +
					translator.get(25, this.lang) + ' ' + Chat.italics(rank));
			}
			if (!App.parser.data.roompermissions[room]) {
				App.parser.data.roompermissions[room] = {};
			}
			App.parser.data.roompermissions[room][perm] = rank;
			App.parser.saveData();
			this.addToSecurityLog();
			switch (rank) {
			case 'user':
				this.reply(translator.get(18, this.lang) + ' ' + Chat.italics(perm) + ' ' + translator.get(19, this.lang) + ' ' +
						translator.get(26, this.lang) + ' ' + Chat.italics(room));
				break;
			case 'excepted':
				this.reply(translator.get(18, this.lang) + ' ' + Chat.italics(perm) + ' ' + translator.get(20, this.lang) + ' ' +
						translator.get(26, this.lang) + ' ' + Chat.italics(room));
				break;
			default:
				this.reply(translator.get(18, this.lang) + ' ' + Chat.italics(perm) + ' ' + translator.get(21, this.lang) + ' ' +
						Chat.bold(rank) + ' ' + translator.get(22, this.lang) + ' ' + translator.get(26, this.lang) + ' ' + Chat.italics(room));
			}
		} else {
			return this.errorReply(translator.get(23, this.lang) + ": " + groups.join(', '));
		}
	},

	parserignore: function (App) {
		if (!this.isExcepted()) return;
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('user')}));
		let user = Text.toId(this.arg);
		if (!user) return this.errorReply(this.usage({desc: this.usageTrans('user')}));
		if (App.parser.monitor.isLocked(user)) {
			this.reply(translator.get(27, this.lang) + ' ' + Chat.italics(user) + ' ' + translator.get(28, this.lang));
		} else {
			App.parser.monitor.lock(user);
			this.addToSecurityLog();
			this.reply(translator.get(27, this.lang) + ' ' + Chat.italics(user) + ' ' + translator.get(29, this.lang));
		}
	},

	parserunignore: function (App) {
		if (!this.isExcepted()) return;
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('user')}));
		let user = Text.toId(this.arg);
		if (!user) return this.errorReply(this.usage({desc: this.usageTrans('user')}));
		if (!App.parser.monitor.isLocked(user)) {
			this.reply(translator.get(27, this.lang) + ' ' + Chat.italics(user) + ' ' + translator.get(30, this.lang));
		} else {
			App.parser.monitor.unlock(user);
			this.addToSecurityLog();
			this.reply(translator.get(27, this.lang) + ' ' + Chat.italics(user) + ' ' + translator.get(31, this.lang));
		}
	},

	/* Control rooms */

	setcontrolroom: function (App) {
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (this.args.length !== 2) {
			return this.errorReply(this.usage({desc: translator.get('controlroom', this.lang)}, {desc: translator.get('targetroom', this.lang)}));
		}
		let control = Text.toRoomid(this.args[0]);
		let target = Text.toRoomid(this.args[1]);
		if (!control || !target) {
			return this.errorReply(this.usage({desc: translator.get('controlroom', this.lang)}, {desc: translator.get('targetroom', this.lang)}));
		}
		App.parser.data.roomctrl[control] = target;
		App.parser.saveData();
		this.addToSecurityLog();
		this.reply(translator.get(32, this.lang) + ' ' + Chat.italics(control) + ' ' + translator.get(33, this.lang) + ' ' + Chat.italics(target));
	},

	rmcontrolroom: function (App) {
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (!this.arg) return this.errorReply(this.usage({desc: translator.get('controlroom', this.lang)}));
		let control = Text.toRoomid(this.arg);
		if (!control) return this.errorReply(this.usage({desc: translator.get('controlroom', this.lang)}));
		if (!App.parser.data.roomctrl[control]) {
			return this.errorReply(translator.get(34, this.lang) + ' ' + Chat.italics(control) + ' ' + translator.get(1, this.lang));
		}
		delete App.parser.data.roomctrl[control];
		App.parser.saveData();
		this.addToSecurityLog();
		this.reply(translator.get(34, this.lang) + ' ' + Chat.italics(control) + ' ' + translator.get(17, this.lang));
	},
};
