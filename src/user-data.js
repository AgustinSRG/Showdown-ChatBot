/**
 * Pokemon Showdown Bot Users Data Manager
 * Showdown ChatBot is distributed under the terms of the MIT License
 * (https://github.com/asanrom/Showdown-ChatBot/blob/master/LICENSE)
 *
 * This tool stores Pokemon Showdown users data like
 * names, last actions and alts
 */

'use strict';

const Text = Tools('text');

class UserDataManager {
	constructor(App) {
		this.app = App;
		this.users = {};
		this.altstree = {};

		App.bot.on('disconnect', function () {
			if (App.config.autoremoveuserdata) {
				this.clean();
			} else {
				this.cleanAlts();
			}
		}.bind(this));

		App.bot.on('userjoin', function (room, user) {
			this.addUser(user, true);
			this.updateLastSeen(user, "J", room);
		}.bind(this));

		App.bot.on('userleave', function (room, user) {
			this.addUser(user, false);
			this.updateLastSeen(user, "L", room);
		}.bind(this));

		App.bot.on('userrename', function (room, user, newName) {
			if (Text.toId(user) === Text.toId(newName)) {
				this.addUser(newName, true);
				return;
			}
			this.addUser(user, false);
			this.updateLastSeen(user, "R", null, newName);
			this.parseNameChange(user, newName);
		}.bind(this));

		App.bot.on('userchat', function (room, time, user) {
			this.addUser(user, true);
			this.updateLastSeen(user, "C", room);
		}.bind(this));
	}

	cleanAlts() {
		for (let k in this.altstree) {
			delete this.altstree[k];
		}
	}

	clean() {
		this.cleanAlts();
		for (let k in this.users) {
			delete this.users[k];
		}
	}

	addUser(name, updateName) {
		let id = Text.toId(name);
		if (!this.users[id]) {
			this.users[id] = {
				name: name,
				lastSeen: null,
			};
		}
		if (updateName) {
			this.users[id].name = name;
		}
	}

	updateLastSeen(user, type, room, detail) {
		let id = Text.toId(user);
		if (this.users[id]) {
			this.users[id].lastSeen = {
				type: type,
				room: room,
				time: Date.now(),
			};
			if (detail) {
				this.users[id].lastSeen.detail = detail;
			}
		}
	}

	getAltsRoot(user) {
		let id = Text.toId(user);
		if (this.altstree[id]) {
			return id;
		}
		for (let root in this.altstree) {
			if (this.altstree[root].indexOf(id) >= 0) {
				return root;
			}
		}
		return null;
	}

	mergeAlts(root1, root2) {
		if (!this.altstree[root1] || !this.altstree[root2]) return;
		let newalts = this.altstree[root2];
		this.altstree[root1].push(root2);
		for (let alt of newalts) {
			this.altstree[root1].push(alt);
		}
		delete this.altstree[root2];
	}

	parseNameChange(user, newName) {
		user = Text.toId(user);
		newName = Text.toId(newName);
		let r1 = this.getAltsRoot(user);
		let r2 = this.getAltsRoot(newName);
		if (r1 === null) {
			this.altstree[user] = [];
			r1 = user;
		}
		if (r2 === null) {
			this.altstree[r1].push(newName);
		} else if (r1 !== r2) {
			this.mergeAlts(r1, r2);
		}
	}

	getAlts(user) {
		let id = Text.toId(user);
		let root = this.getAltsRoot(id);
		if (root === null) {
			return [];
		}
		let alts = [];
		if (root !== id) {
			alts.unshift(root);
		}
		for (let alt of this.altstree[root]) {
			if (alt !== id) {
				alts.unshift(alt);
			}
		}
		return alts;
	}
}

module.exports = UserDataManager;
