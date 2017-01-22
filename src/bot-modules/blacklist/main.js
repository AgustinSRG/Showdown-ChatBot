/*
 * Bot Module: Blacklist
 */

'use strict';

const Path = require('path');
const Text = Tools('text');

const Lang_File = Path.resolve(__dirname, 'blacklist.translations');

exports.setup = function (App) {
	function getLanguage(room) {
		return App.config.language.rooms[room] || App.config.language['default'];
	}

	function botCanBan(room) {
		let roomData = App.bot.rooms[room];
		let botid = Text.toId(App.bot.getBotNick());
		return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({group: roomData.users[botid]}, 'mod'));
	}

	class BacklistModule {
		constructor() {
			this.db = App.dam.getDataBase('blacklist.json');
			this.data = this.db.data;
		}

		blacklist(room, user) {
			user = Text.toId(user);
			if (!user) return false;
			if (!this.data[room]) this.data[room] = {};
			if (this.data[room][user]) {
				return false;
			} else {
				this.data[room][user] = true;
				return true;
			}
		}

		unblacklist(room, user) {
			user = Text.toId(user);
			if (!user || !this.data[room]) return false;
			if (this.data[room][user]) {
				delete this.data[room][user];
				if (Object.keys(this.data[room]).length === 0) {
					delete this.data[room];
				}
				return true;
			} else {
				return false;
			}
		}

		getInitCmds() {
			let cmds = [];
			for (let room in App.bot.rooms) {
				let users = App.bot.rooms[room].users;
				for (let id in users) {
					let group = users[id];
					if (App.parser.equalOrHigherGroup({group: group}, 'driver')) continue; // Do not ban staff
					if (!botCanBan(room)) continue; // Bot cannot ban
					if (this.data[room] && this.data[room][id]) {
						cmds.push(room + '|/roomban ' + id + ', ' + App.multilang.mlt(Lang_File, getLanguage(room), 'ban'));
					}
				}
			}
			return cmds;
		}
	}

	const Blacklist = new BacklistModule();
	const data = Blacklist.data;

	App.bot.on('userjoin', (room, by) => {
		let user = Text.parseUserIdent(by);
		if (App.parser.equalOrHigherGroup(user, 'driver')) return; // Do not ban staff
		if (!botCanBan(room)) return; // Bot cannot ban
		if (data[room] && data[room][user.id]) {
			App.bot.sendTo(room, '/roomban ' + user.id + ', ' + App.multilang.mlt(Lang_File, getLanguage(room), 'ban'));
		}
	});

	App.bot.on('userrename', (room, old, by) => {
		let user = Text.parseUserIdent(by);
		if (App.parser.equalOrHigherGroup(user, 'driver')) return; // Do not ban staff
		if (!botCanBan(room)) return; // Bot cannot ban
		if (data[room] && data[room][user.id]) {
			App.bot.sendTo(room, '/roomban ' + user.id + ', ' + App.multilang.mlt(Lang_File, getLanguage(room), 'ban'));
		}
	});

	return Blacklist;
};
