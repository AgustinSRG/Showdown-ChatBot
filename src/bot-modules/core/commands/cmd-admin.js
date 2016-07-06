/**
 * Commands File
 *
 */

'use strict';

const Path = require('path');

const Text = Tools.get('text.js');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'cmd-admin.translations'));

App.parser.addPermission('commands', {excepted: true});
App.parser.addPermission('grant', {excepted: true});
App.parser.addPermission('set', {group: 'owner'});

let Temp_Var = "";

module.exports = {
	/* Aliases */
	setalias: function () {
		if (!this.can('commands')) return this.replyAccessDenied('commands');
		if (this.args.length !== 2) return this.errorReply(this.usage({desc: 'alias'}, {desc: 'command'}));
		let alias = Text.toCmdid(this.args[0]);
		let cmd = Text.toCmdid(this.args[1]);
		if (!alias || !cmd) return this.errorReply(this.usage({desc: 'alias'}, {desc: 'command'}));
		if (!App.parser.commandExists(cmd)) {
			return this.errorReply(translator.get(0, this.lang) + ' __' + cmd + '__ ' + translator.get(1, this.lang));
		}
		App.parser.data.aliases[alias] = cmd;
		App.parser.saveData();
		App.logCommandAction(this);
		this.reply(translator.get(2, this.lang) + ' __' + alias + '__ ' + translator.get(3, this.lang) + ' __' + cmd + '__');
	},

	rmalias: function () {
		if (!this.can('commands')) return this.replyAccessDenied('commands');
		if (!this.arg) return this.errorReply(this.usage({desc: 'alias'}));
		let alias = Text.toCmdid(this.arg);
		if (!alias) return this.errorReply(this.usage({desc: 'alias'}));
		if (App.parser.data.aliases[alias]) {
			delete App.parser.data.aliases[alias];
			App.parser.saveData();
			App.logCommandAction(this);
			this.reply(translator.get(2, this.lang) + ' __' + alias + '__ ' + translator.get(4, this.lang));
		} else {
			this.reply(translator.get(2, this.lang) + ' __' + alias + '__ ' + translator.get(5, this.lang));
		}
	},

	/* Language */
	lang: function () {
		if (!this.can('set', this.room)) return this.replyAccessDenied('set');
		if (!this.arg) return this.errorReply(this.usage({desc: 'language'}));
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(translator.get(6, this.lang));
		let lang = Text.toId(this.args[0]);
		if (!lang) return this.errorReply(this.usage({desc: 'language'}));
		if (lang in App.languages) {
			App.config.language.rooms[room] = lang;
			App.saveConfig();
			App.logCommandAction(this);
			this.lang = lang;
			this.reply(translator.get(7, this.lang) + ' __' + room + '__ ' + translator.get(8, this.lang) + ' __' + lang + '__ ');
		} else {
			this.errorReply(translator.get(9, this.lang) + ' __' + lang + '__ ' +
				translator.get(10, this.lang) + ': ' + Object.values(App.languages).join(', '));
		}
	},

	/* Dynamic commands */
	temp: function () {
		if (!this.can('commands')) return this.replyAccessDenied('commands');
		if (this.arg) {
			Temp_Var = this.arg;
		}
		this.reply('Temp: ' + Temp_Var);
	},

	setcmd: function () {
		if (!this.can('commands')) return this.replyAccessDenied('commands');
		if (!this.arg) return this.errorReply(this.usage({desc: 'command'}));
		if (!Temp_Var) return this.errorReply(translator.get(11, this.lang) + ' ``temp <text>``');
		let cmd = Text.toCmdid(this.args[0]);
		if (!cmd) return this.errorReply(this.usage({desc: 'command'}));
		if (typeof App.parser.data.dyncmds[cmd] === 'object') {
			return this.errorReply(translator.get(0, this.lang) + ' __' + cmd + '__ ' + translator.get(12, this.lang));
		}
		App.parser.data.dyncmds[cmd] = Temp_Var;
		App.parser.saveData();
		App.logCommandAction(this);
		this.reply(translator.get(0, this.lang) + ' __' + cmd + '__ ' + translator.get(13, this.lang));
	},

	setindexcmd: function () {
		if (!this.can('commands')) return this.replyAccessDenied('commands');
		if (!this.arg) return this.errorReply(this.usage({desc: 'command'}));
		let cmd = Text.toCmdid(this.args[0]);
		if (!cmd) return this.errorReply(this.usage({desc: 'command'}));
		if (App.parser.data.dyncmds[cmd]) {
			return this.errorReply(translator.get(0, this.lang) + ' __' + cmd + '__ ' + translator.get(14, this.lang));
		}
		App.parser.data.dyncmds[cmd] = {};
		App.parser.saveData();
		App.logCommandAction(this);
		this.reply(translator.get(0, this.lang) + ' __' + cmd + '__ ' + translator.get(15, this.lang));
	},

	setsubcmd: function () {
		if (!this.can('commands')) return this.replyAccessDenied('commands');
		if (this.args.length !== 2) return this.errorReply(this.usage({desc: 'command'}, {desc: 'sub-command'}));
		if (!Temp_Var) return this.errorReply(translator.get(11, this.lang) + ' ``temp <text>``');
		let cmd = Text.toCmdid(this.args[0]);
		let sub = Text.toCmdid(this.args[1]);
		if (!cmd || !sub) return this.errorReply(this.usage({desc: 'command'}, {desc: 'sub-command'}));
		if (typeof App.parser.data.dyncmds[cmd] !== 'object') {
			return this.errorReply(translator.get(0, this.lang) + ' __' + cmd + '__ ' + translator.get(16, this.lang));
		}
		App.parser.data.dyncmds[cmd][sub] = Temp_Var;
		App.parser.saveData();
		App.logCommandAction(this);
		this.reply(translator.get(0, this.lang) + ' __' + cmd + ' ' + sub + '__ ' + translator.get(13, this.lang));
	},

	rmcmd: function () {
		if (!this.can('commands')) return this.replyAccessDenied('commands');
		if (!this.arg) return this.errorReply(this.usage({desc: 'command'}));
		let cmd = Text.toCmdid(this.arg);
		if (!cmd) return this.errorReply(this.usage({desc: 'command'}));
		if (!App.parser.data.dyncmds[cmd]) {
			return this.errorReply(translator.get(0, this.lang) + ' __' + cmd + '__ ' + translator.get(1, this.lang));
		}
		delete App.parser.data.dyncmds[cmd];
		App.parser.saveData();
		App.logCommandAction(this);
		this.reply(translator.get(0, this.lang) + ' __' + cmd + '__ ' + translator.get(17, this.lang));
	},

	rmsubcmd: function () {
		if (!this.can('commands')) return this.replyAccessDenied('commands');
		if (this.args.length !== 2) return this.errorReply(this.usage({desc: 'command'}, {desc: 'sub-command'}));
		let cmd = Text.toCmdid(this.args[0]);
		let sub = Text.toCmdid(this.args[1]);
		if (!cmd || !sub) return this.errorReply(this.usage({desc: 'command'}, {desc: 'sub-command'}));
		if (typeof App.parser.data.dyncmds[cmd] !== 'object') {
			return this.errorReply(translator.get(0, this.lang) + ' __' + cmd + '__ ' + translator.get(16, this.lang));
		}
		if (!App.parser.data.dyncmds[cmd][sub]) {
			return this.errorReply(translator.get(0, this.lang) + ' __' + cmd + ' ' + sub + '__ ' + translator.get(1, this.lang));
		}
		delete App.parser.data.dyncmds[cmd][sub];
		App.parser.saveData();
		App.logCommandAction(this);
		this.reply(translator.get(0, this.lang) + ' __' + cmd + ' ' + sub + '__ ' + translator.get(17, this.lang));
	},

	dyncmdlist: function () {
		if (!App.config.server.url) return; // Feature not available
		let server = App.config.server.url;
		if (server.charAt(server.length - 1) === '/') {
			return this.restrictReply(App.config.server.url + 'dyncmd/list', 'info');
		} else {
			return this.restrictReply(App.config.server.url + '/dyncmd/list', 'info');
		}
	},

	/* Permissions */
	grant: function () {
		if (!this.can('grant')) return this.replyAccessDenied('grant');
		if (this.args.length !== 2) return this.errorReply(this.usage({desc: 'permission'}, {desc: 'rank'}));
		let perm = Text.toId(this.args[0]);
		let rank = this.args[1].toLowerCase().trim();
		if (!perm || !rank) return this.errorReply(this.usage({desc: 'permission'}, {desc: 'rank'}));
		let groups = ['user', 'excepted'].concat(App.config.parser.groups);
		if (groups.indexOf(rank) >= 0) {
			if (!App.parser.modPermissions[perm]) return this.errorReply(translator.get(18, this.lang) + ' __' + perm + '__ ' + translator.get(5, this.lang));
			App.parser.data.permissions[perm] = rank;
			App.parser.saveData();
			App.logCommandAction(this);
			switch (rank) {
			case 'user':
				this.reply(translator.get(18, this.lang) + ' __' + perm + '__ ' + translator.get(19, this.lang));
				break;
			case 'excepted':
				this.reply(translator.get(18, this.lang) + ' __' + perm + '__ ' + translator.get(20, this.lang));
				break;
			default:
				this.reply(translator.get(18, this.lang) + +' __' + perm + '__ ' +
						translator.get(21, this.lang) + ' **' + rank + '** ' + translator.get(22, this.lang));
			}
		} else {
			return this.errorReply(translator.get(23, this.lang) + ": " + groups.join(', '));
		}
	},

	set: function () {
		if (!this.can('set', this.room)) return this.replyAccessDenied('set');
		if (this.args.length !== 2) return this.errorReply(this.usage({desc: 'permission'}, {desc: 'rank'}));
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(translator.get(6, this.lang));
		let perm = Text.toId(this.args[0]);
		let rank = this.args[1].toLowerCase().trim();
		if (!perm || !rank) return this.errorReply(this.usage({desc: 'permission'}, {desc: 'rank'}));
		let groups = ['user', 'excepted'].concat(App.config.parser.groups);
		if (groups.indexOf(rank) >= 0) {
			if (!App.parser.modPermissions[perm]) {
				return this.errorReply(translator.get(18, this.lang) + ' __' + perm + '__ ' + translator.get(5, this.lang));
			}
			if (!App.parser.canSet(this.byIdent, perm, room, rank)) {
				return this.errorReply(translator.get(24, this.lang) + ' __' + perm + '__ ' + translator.get(25, this.lang) + ' __' + rank + '__');
			}
			if (!App.parser.data.roompermissions[room]) {
				App.parser.data.roompermissions[room] = {};
			}
			App.parser.data.roompermissions[room][perm] = rank;
			App.parser.saveData();
			App.logCommandAction(this);
			switch (rank) {
			case 'user':
				this.reply(translator.get(18, this.lang) + ' __' + perm + '__ ' + translator.get(19, this.lang) + ' ' +
						translator.get(26, this.lang) + ' __' + room + '__');
				break;
			case 'excepted':
				this.reply(translator.get(18, this.lang) + ' __' + perm + '__ ' + translator.get(20, this.lang) + ' ' +
						translator.get(26, this.lang) + ' __' + room + '__');
				break;
			default:
				this.reply(translator.get(18, this.lang) + ' __' + perm + '__ ' + translator.get(21, this.lang) + ' **' +
						rank + '** ' + translator.get(22, this.lang) + ' ' + translator.get(26, this.lang) + ' __' + room + '__');
			}
		} else {
			return this.errorReply(translator.get(23, this.lang) + ": " + groups.join(', '));
		}
	},

	parserignore: function () {
		if (!this.isExcepted()) return;
		if (!this.arg) return this.errorReply(this.usage({desc: 'userid'}));
		let user = Text.toId(this.arg);
		if (!user) return this.errorReply(this.usage({desc: 'userid'}));
		if (App.parser.monitor.isLocked(user)) {
			this.reply(translator.get(27, this.lang) + ' __' + user + '__ ' + translator.get(28, this.lang));
		} else {
			App.parser.monitor.lock(user);
			App.logCommandAction(this);
			this.reply(translator.get(27, this.lang) + ' __' + user + '__ ' + translator.get(29, this.lang));
		}
	},

	parserunignore: function () {
		if (!this.isExcepted()) return;
		if (!this.arg) return this.errorReply(this.usage({desc: 'userid'}));
		let user = Text.toId(this.arg);
		if (!user) return this.errorReply(this.usage({desc: 'userid'}));
		if (!App.parser.monitor.isLocked(user)) {
			this.reply(translator.get(27, this.lang) + ' __' + user + '__ ' + translator.get(30, this.lang));
		} else {
			App.parser.monitor.unlock(user);
			App.logCommandAction(this);
			this.reply(translator.get(27, this.lang) + ' __' + user + '__ ' + translator.get(31, this.lang));
		}
	},

	/* Control rooms */

	setcontrolroom: function () {
		if (!this.can('commands')) return this.replyAccessDenied('commands');
		if (this.args.length !== 2) return this.errorReply(this.usage({desc: 'control-room'}, {desc: 'target-room'}));
		let control = Text.toRoomid(this.args[0]);
		let target = Text.toRoomid(this.args[1]);
		if (!control || !target) return this.errorReply(this.usage({desc: 'control-room'}, {desc: 'target-room'}));
		App.parser.data.roomctrl[control] = target;
		App.parser.saveData();
		App.logCommandAction(this);
		this.reply(translator.get(32, this.lang) + ' __' + control + '__ ' + translator.get(33, this.lang) + ' __' + target + '__');
	},

	rmcontrolroom: function () {
		if (!this.can('commands')) return this.replyAccessDenied('commands');
		if (!this.arg) return this.errorReply(this.usage({desc: 'control-room'}));
		let control = Text.toRoomid(this.arg);
		if (!control) return this.errorReply(this.usage({desc: 'control-room'}));
		if (!App.parser.data.roomctrl[control]) {
			return this.errorReply(translator.get(34, this.lang) + ' __' + control + '__ ' + translator.get(1, this.lang));
		}
		delete App.parser.data.roomctrl[control];
		App.parser.saveData();
		App.logCommandAction(this);
		this.reply(translator.get(34, this.lang) + ' __' + control + '__ ' + translator.get(17, this.lang));
	},
};
