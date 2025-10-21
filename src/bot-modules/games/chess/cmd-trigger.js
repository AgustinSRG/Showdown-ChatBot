/**
 * Commands trigger - Chess Game
 */

'use strict';

const Path = require('path');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

module.exports = {
	trigger: function (App, Tools) {
		if (!App.bot.rooms[this.room] || !App.bot.rooms[this.room].users[this.by]) return false;
		if (!Tools.equalOrHigherGroup({group: App.bot.rooms[this.room].users[this.by].group}, 'voice')) return false;

		let cmds;
		try {
			cmds = App.data.cache.get('cmds.json');
		} catch (err) {
			return false;
		}

		if (!cmds['chess'] || cmds['chess'].disabled) return false;
		if (cmds['chess'].rooms && cmds['chess'].rooms.length) {
			if (cmds['chess'].rooms.indexOf(this.room) < 0) return false;
		}
		if (cmds['chess'].except && cmds['chess'].except.length) {
			if (cmds['chess'].except.indexOf(this.room) >= 0) return false;
		}

		let cmd = this.cmd;
		let args = this.args || [];
		let allowedCmds = [
			'chess', 'startchess', 'newchess', 'endchess', 'stopchess',
			'chessboard', 'board', 'move', 'chessmove', 'watch', 'spectate'
		];

		if (allowedCmds.indexOf(cmd) >= 0) {
			let handler;
			try {
				handler = require(Path.resolve(__dirname, 'commands.js'));
			} catch (err) {
				App.reportCrash(err);
				return false;
			}

			let context = {
				room: this.room,
				by: this.by,
				cmd: cmd,
				args: args,
				bot: App.bot,
				lang: function () {
					return App.config.language.rooms[this.room] || App.config.language['default'];
				},
				trad: function (key) {
					return App.multilang.mlt(Lang_File, this.lang(), key);
				},
				reply: function (msg) {
					App.bot.sendTo(this.room, msg);
				},
				replyAccessDenied: function (permission) {
					return this.reply('Access denied');
				},
				can: function (permission, room) {
					return true; // Simplified permission check
				},
				parseUser: function (str) {
					if (!str) return null;
					return str.toLowerCase().replace(/[^a-z0-9]/g, '');
				}
			};

			try {
				if (typeof handler[cmd] === 'function') {
					handler[cmd].call(context, { system: { templates: App.modules.games.templates } });
					return true;
				} else if (typeof handler[cmd] === 'string' && typeof handler[handler[cmd]] === 'function') {
					handler[handler[cmd]].call(context, { system: { templates: App.modules.games.templates } });
					return true;
				}
			} catch (err) {
				App.reportCrash(err);
				return false;
			}
		}

		return false;
	}
};