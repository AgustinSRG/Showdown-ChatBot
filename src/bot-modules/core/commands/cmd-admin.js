/**
 * Commands File
 *
 * setalias: sets commands aliases
 * rmalias: removes commands aliases
 * lang: sets the room language
 * temp: sets the temporal variable for making commands
 * setcmd: creates a text dynamic command
 * setindexcmd: creates an index dynamic command
 * setsubcmd: creates a sub-command for an index command
 * rmcmd: removes a dynamic command
 * rmsubcmd: removes a sub-command
 * dyncmdlist: gets the dynamic commands list
 * grant: configures permissions globally
 * set: configures permissions for a room
 * parserignore: locks an user from using comands
 * parserunignore: unlocks an user from using commands
 * setcontrolroom: sets a control room
 * rmcontrolroom: removes a control room
 */

'use strict';

const Path = require('path');

const Text = Tools('text');
const Chat = Tools('chat');
const LineSplitter = Tools('line-splitter');

const Lang_File = Path.resolve(__dirname, 'cmd-admin.translations');

let Temp_Var = "";

module.exports = {
	/* Aliases */
	setalias: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (this.args.length !== 2) {
			return this.errorReply(this.usage({desc: this.mlt('alias')}, {desc: this.usageTrans('command')}));
		}
		let alias = Text.toCmdid(this.args[0]);
		let cmd = Text.toCmdid(this.args[1]);
		if (!alias || !cmd) {
			return this.errorReply(this.usage({desc: this.mlt('alias')}, {desc: this.usageTrans('command')}));
		}
		if (!App.parser.commandExists(cmd)) {
			return this.errorReply(this.mlt(0) + ' ' + Chat.italics(cmd) + ' ' + this.mlt(1));
		}
		App.parser.data.aliases[alias] = cmd;
		App.parser.saveData();
		this.addToSecurityLog();
		this.reply(this.mlt(2) + ' ' + Chat.italics(alias) + ' ' + this.mlt(3) + ' ' + Chat.italics(cmd));
	},

	rmalias: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (!this.arg) return this.errorReply(this.usage({desc: this.mlt('alias')}));
		let alias = Text.toCmdid(this.arg);
		if (!alias) return this.errorReply(this.usage({desc: this.mlt('alias')}));
		if (App.parser.data.aliases[alias]) {
			delete App.parser.data.aliases[alias];
			App.parser.saveData();
			this.addToSecurityLog();
			this.reply(this.mlt(2) + ' ' + Chat.italics(alias) + ' ' + this.mlt(4));
		} else {
			this.reply(this.mlt(2) + ' ' + Chat.italics(alias) + ' ' + this.mlt(5));
		}
	},

	/* Language */
	lang: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('set', this.room)) return this.replyAccessDenied('set');
		if (!this.arg) return this.errorReply(this.usage({desc: this.mlt('language')}));
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(this.mlt(6));
		let lang = Text.toId(this.args[0]);
		if (!lang) return this.errorReply(this.usage({desc: this.mlt('language')}));
		if ((lang in App.multilang.getLanguages()) && App.multilang.isLangEnabled(lang)) {
			App.config.language.rooms[room] = lang;
			App.saveConfig();
			this.addToSecurityLog();
			this.lang = lang;
			this.reply(this.mlt(7) + ' ' + Chat.italics(this.parser.getRoomTitle(room)) +
				' ' + this.mlt(8) + ' ' + Chat.italics(lang));
		} else {
			this.errorReply(this.mlt(9) + ' ' + Chat.italics(lang) + ' ' +
				this.mlt(10) + ': ' + Object.values(App.multilang.getLanguages()).join(', '));
		}
	},

	/* Dynamic commands */
	temp: function () {
		this.setLangFile(Lang_File);
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (this.arg) {
			Temp_Var = this.arg;
		}
		this.reply('Temp: ' + Temp_Var);
	},

	setcmd: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		if (!Temp_Var) return this.errorReply(this.mlt(11) + ' ' + Chat.code(this.token + 'temp <' + this.usageTrans('text') + '>'));
		let cmd = Text.toCmdid(this.args[0]);
		if (!cmd) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		if (this.args[0].indexOf(" ") > 0) {
			let spaceIndex = this.args[0].indexOf(" ");
			let icmd = Text.toCmdid(this.args[0].substr(0, spaceIndex));
			let isubcmd = Text.toCmdid(this.args[0].substr(spaceIndex));
			if (typeof App.parser.data.dyncmds[icmd] === 'object') {
				this.cmd = 'setsubcmd';
				this.arg = icmd + ", " + isubcmd;
				this.args = [icmd, isubcmd];
				this.parser.exec(this);
				return;
			}
		}
		if (typeof App.parser.data.dyncmds[cmd] === 'object') {
			return this.errorReply(this.mlt(0) + ' ' + Chat.italics(cmd) + ' ' + this.mlt(12));
		}
		App.parser.data.dyncmds[cmd] = Temp_Var;
		App.parser.saveData();
		this.addToSecurityLog();
		this.reply(this.mlt(0) + ' ' + Chat.italics(cmd) + ' ' + this.mlt(13));
	},

	setindexcmd: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		let cmd = Text.toCmdid(this.args[0]);
		if (!cmd) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		if (App.parser.data.dyncmds[cmd]) {
			return this.errorReply(this.mlt(0) + ' ' + Chat.italics(cmd) + ' ' + this.mlt(14));
		}
		App.parser.data.dyncmds[cmd] = {};
		App.parser.saveData();
		this.addToSecurityLog();
		this.reply(this.mlt(0) + ' ' + Chat.italics(cmd) + ' ' + this.mlt(15));
	},

	setsubcmd: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (this.args.length !== 2) return this.errorReply(this.usage({desc: this.usageTrans('command')}, {desc: this.usageTrans('subcmd')}));
		if (!Temp_Var) return this.errorReply(this.mlt(11) + ' ' + Chat.code(this.token + 'temp <' + this.usageTrans('text') + '>'));
		let cmd = Text.toCmdid(this.args[0]);
		let sub = Text.toCmdid(this.args[1]);
		if (!cmd || !sub) return this.errorReply(this.usage({desc: this.usageTrans('command')}, {desc: this.usageTrans('subcmd')}));
		if (typeof App.parser.data.dyncmds[cmd] !== 'object') {
			return this.errorReply(this.mlt(0) + ' ' + Chat.italics(cmd) + ' ' + this.mlt(16));
		}
		App.parser.data.dyncmds[cmd][sub] = Temp_Var;
		App.parser.saveData();
		this.addToSecurityLog();
		this.reply(this.mlt(0) + ' ' + Chat.italics(cmd + ' ' + sub) + ' ' + this.mlt(13));
	},

	rmcmd: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		let cmd = Text.toCmdid(this.arg);
		if (!cmd) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		if (this.args[0].indexOf(" ") > 0) {
			let spaceIndex = this.args[0].indexOf(" ");
			let icmd = Text.toCmdid(this.args[0].substr(0, spaceIndex));
			let isubcmd = Text.toCmdid(this.args[0].substr(spaceIndex));
			if (typeof App.parser.data.dyncmds[icmd] === 'object') {
				this.cmd = 'rmsubcmd';
				this.arg = icmd + ", " + isubcmd;
				this.args = [icmd, isubcmd];
				this.parser.exec(this);
				return;
			}
		}
		if (!App.parser.data.dyncmds[cmd]) {
			return this.errorReply(this.mlt(0) + ' ' + Chat.italics(cmd) + ' ' + this.mlt(1));
		}
		delete App.parser.data.dyncmds[cmd];
		App.parser.saveData();
		this.addToSecurityLog();
		this.reply(this.mlt(0) + ' ' + Chat.italics(cmd) + ' ' + this.mlt(17));
	},

	rmsubcmd: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (this.args.length !== 2) return this.errorReply(this.usage({desc: this.usageTrans('command')}, {desc: this.usageTrans('subcmd')}));
		let cmd = Text.toCmdid(this.args[0]);
		let sub = Text.toCmdid(this.args[1]);
		if (!cmd || !sub) return this.errorReply(this.usage({desc: this.usageTrans('command')}, {desc: this.usageTrans('subcmd')}));
		if (typeof App.parser.data.dyncmds[cmd] !== 'object') {
			return this.errorReply(this.mlt(0) + ' ' + Chat.italics(cmd) + ' ' + this.mlt(16));
		}
		if (!App.parser.data.dyncmds[cmd][sub]) {
			return this.errorReply(this.mlt(0) + ' ' + Chat.italics(cmd + ' ' + sub) + ' ' + this.mlt(1));
		}
		delete App.parser.data.dyncmds[cmd][sub];
		App.parser.saveData();
		this.addToSecurityLog();
		this.reply(this.mlt(0) + ' ' + Chat.italics(cmd + ' ' + sub) + ' ' + this.mlt(17));
	},

	dyncmdlist: function (App) {
		this.setLangFile(Lang_File);
		let dyn = Object.keys(App.parser.data.dyncmds).sort();
		if (dyn.length === 0) {
			return this.errorReply(this.mlt(35));
		}
		let spl = new LineSplitter(App.config.bot.maxMessageLength);
		spl.add(Chat.bold(this.mlt(36) + ":"));
		for (let i = 0; i < dyn.length; i++) {
			spl.add(" " + dyn[i] + (i < (dyn.length - 1) ? ',' : ''));
		}
		return this.restrictReply(spl.getLines(), 'info');
	},

	/* Permissions */
	grant: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('grant', this.room)) return this.replyAccessDenied('grant');
		if (this.args.length !== 2) {
			return this.errorReply(this.usage({desc: this.mlt('permission')}, {desc: this.usageTrans('rank')}));
		}
		let perm = Text.toId(this.args[0]);
		let rank = this.args[1].toLowerCase().trim();
		if (!perm || !rank) {
			return this.errorReply(this.usage({desc: this.mlt('permission')}, {desc: this.usageTrans('rank')}));
		}
		let groups = ['user', 'excepted'].concat(App.config.parser.groups);
		if (groups.indexOf(rank) >= 0) {
			if (!App.parser.modPermissions[perm]) {
				return this.errorReply(this.mlt(18) + ' ' + Chat.italics(perm) + ' ' + this.mlt(5));
			}
			App.parser.data.permissions[perm] = rank;
			App.parser.saveData();
			this.addToSecurityLog();
			switch (rank) {
			case 'user':
				this.reply(this.mlt(18) + ' ' + Chat.italics(perm) + ' ' + this.mlt(19));
				break;
			case 'excepted':
				this.reply(this.mlt(18) + ' ' + Chat.italics(perm) + ' ' + this.mlt(20));
				break;
			default:
				this.reply(this.mlt(18) + ' ' + Chat.italics(perm) + ' ' +
						this.mlt(21) + ' ' + Chat.bold(rank) + ' ' + this.mlt(22));
			}
		} else {
			return this.errorReply(this.mlt(23) + ": " + groups.join(', '));
		}
	},

	set: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('set', this.room)) return this.replyAccessDenied('set');
		if (this.args.length !== 2) {
			return this.errorReply(this.usage({desc: this.mlt('permission')}, {desc: this.usageTrans('rank')}));
		}
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(this.mlt(6));
		let perm = Text.toId(this.args[0]);
		let rank = this.args[1].toLowerCase().trim();
		if (!perm || !rank) {
			return this.errorReply(this.usage({desc: this.mlt('permission')}, {desc: this.usageTrans('rank')}));
		}
		let groups = ['user', 'excepted'].concat(App.config.parser.groups);
		if (groups.indexOf(rank) >= 0) {
			if (!App.parser.modPermissions[perm]) {
				return this.errorReply(this.mlt(18) + ' ' + Chat.italics(perm) + ' ' + this.mlt(5));
			}
			if (!App.parser.canSet(this.byIdent, perm, room, rank)) {
				return this.errorReply(this.mlt(24) + ' ' + Chat.italics(perm) + ' ' +
					this.mlt(25) + ' ' + Chat.italics(rank));
			}
			if (!App.parser.data.roompermissions[room]) {
				App.parser.data.roompermissions[room] = {};
			}
			App.parser.data.roompermissions[room][perm] = rank;
			App.parser.saveData();
			this.addToSecurityLog();
			switch (rank) {
			case 'user':
				this.reply(this.mlt(18) + ' ' + Chat.italics(perm) + ' ' + this.mlt(19) + ' ' +
						this.mlt(26) + ' ' + Chat.italics(this.parser.getRoomTitle(room)));
				break;
			case 'excepted':
				this.reply(this.mlt(18) + ' ' + Chat.italics(perm) + ' ' + this.mlt(20) + ' ' +
						this.mlt(26) + ' ' + Chat.italics(this.parser.getRoomTitle(room)));
				break;
			default:
				this.reply(this.mlt(18) + ' ' + Chat.italics(perm) + ' ' + this.mlt(21) + ' ' +
						Chat.bold(rank) + ' ' + this.mlt(22) + ' ' + this.mlt(26) + ' ' +
						Chat.italics(this.parser.getRoomTitle(room)));
			}
		} else {
			return this.errorReply(this.mlt(23) + ": " + groups.join(', '));
		}
	},

	parserignore: function (App) {
		this.setLangFile(Lang_File);
		if (!this.isExcepted()) return;
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('user')}));
		let user = Text.toId(this.arg);
		if (!user) return this.errorReply(this.usage({desc: this.usageTrans('user')}));
		if (App.parser.monitor.isLocked(user)) {
			this.reply(this.mlt(27) + ' ' + Chat.italics(user) + ' ' + this.mlt(28));
		} else {
			App.parser.monitor.lock(user);
			this.addToSecurityLog();
			this.reply(this.mlt(27) + ' ' + Chat.italics(user) + ' ' + this.mlt(29));
		}
	},

	parserunignore: function (App) {
		this.setLangFile(Lang_File);
		if (!this.isExcepted()) return;
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('user')}));
		let user = Text.toId(this.arg);
		if (!user) return this.errorReply(this.usage({desc: this.usageTrans('user')}));
		if (!App.parser.monitor.isLocked(user)) {
			this.reply(this.mlt(27) + ' ' + Chat.italics(user) + ' ' + this.mlt(30));
		} else {
			App.parser.monitor.unlock(user);
			this.addToSecurityLog();
			this.reply(this.mlt(27) + ' ' + Chat.italics(user) + ' ' + this.mlt(31));
		}
	},

	/* Control rooms */

	setcontrolroom: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (this.args.length !== 2) {
			return this.errorReply(this.usage({desc: this.mlt('controlroom')}, {desc: this.mlt('targetroom')}));
		}
		let control = Text.toRoomid(this.args[0]);
		let target = Text.toRoomid(this.args[1]);
		if (!control || !target) {
			return this.errorReply(this.usage({desc: this.mlt('controlroom')}, {desc: this.mlt('targetroom')}));
		}
		App.parser.data.roomctrl[control] = target;
		App.parser.saveData();
		this.addToSecurityLog();
		this.reply(this.mlt(32) + ' ' + Chat.italics(control) + ' ' + this.mlt(33) + ' ' + Chat.italics(target));
	},

	rmcontrolroom: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('commands', this.room)) return this.replyAccessDenied('commands');
		if (!this.arg) return this.errorReply(this.usage({desc: this.mlt('controlroom')}));
		let control = Text.toRoomid(this.arg);
		if (!control) return this.errorReply(this.usage({desc: this.mlt('controlroom')}));
		if (!App.parser.data.roomctrl[control]) {
			return this.errorReply(this.mlt(34) + ' ' + Chat.italics(control) + ' ' + this.mlt(1));
		}
		delete App.parser.data.roomctrl[control];
		App.parser.saveData();
		this.addToSecurityLog();
		this.reply(this.mlt(34) + ' ' + Chat.italics(control) + ' ' + this.mlt(17));
	},
};
