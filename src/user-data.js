/**
 * Pokemon Showdown Bot Users Data Manager
 * Showdown ChatBot is distributed under the terms of the MIT License
 * (https://github.com/asanrom/Showdown-ChatBot/blob/master/LICENSE)
 *
 * This tool stores Pokemon Showdown users data like
 * names, last actions and alts
 */

'use strict';

const Path = require("path");
const FileSystem = require("fs");
const Text = Tools('text');
const checkDir = Tools('checkdir');
const BufferCache = Tools('cache').BufferCache;

class UserDataManager {
	constructor(App) {
		this.app = App;
		this.path = Path.resolve(this.app.dataDir, "seen");
		checkDir(this.path);

		this.cache = new BufferCache(50);
		this.writeBuffer = {};
		this.writeTimer = setInterval(this.write.bind(this), (60 * 1000));

		this.altsdb = App.dam.getDataBase('alts.json');
		this.altstree = this.altsdb.data;
		this.altsChanged = false;

		App.bot.on('disconnect', function () {
			if (App.config.autoremoveuserdata) {
				this.clean();
			}
		}.bind(this));

		App.bot.on('userjoin', function (room, user) {
			this.updateLastSeen(user.substr(1), "J", room);
		}.bind(this));

		App.bot.on('userleave', function (room, user) {
			this.updateLastSeen(user, "L", room, null, true);
		}.bind(this));

		App.bot.on('userrename', function (room, user, newName) {
			if (Text.toId(user) === Text.toId(newName)) {
				return;
			}
			this.updateLastSeen(user, "R", null, newName.substr(1), true);
			this.parseNameChange(user, newName.substr(1));
			this.updateLastSeen(newName.substr(1), "J", room);
		}.bind(this));

		App.bot.on('userchat', function (room, time, user) {
			this.updateLastSeen(user.substr(1), "C", room);
		}.bind(this));
	}

	getSeenFile(userid) {
		if (!userid) return null;
		let firstChar = userid.charAt(0);
		try {
			return FileSystem.readFileSync(Path.resolve(this.path, firstChar + ".seen.log")).toString();
		} catch (err) {
			return null;
		}
	}

	cleanSeen() {
		let files = FileSystem.readdirSync(this.path);
		for (let i = 0; i < files.length; i++) {
			try {
				FileSystem.unlinkSync(Path.resolve(this.path, files[i]));
			} catch (err) {}
		}
	}

	getLastSeen(user) {
		let id = Text.toId(user);
		if (this.cache.has(id)) {
			return this.applyBuffer(id, this.cache.get(id));
		}
		let data = this.getSeenFile(id);
		if (data === null) {
			return null;
		}
		data = data.split("\n");
		for (let line of data) {
			if (line.substr(0, id.length + 1) === (id + ",")) {
				try {
					let userData = JSON.parse(line.substr(id.length + 1));
					this.cache.cache(id, userData);
					return this.applyBuffer(id, userData);
				} catch (err) {
					return null;
				}
			}
		}
		if (this.writeBuffer[id]) {
			return this.applyBuffer(id, {name: id, lastSeen: {}});
		} else {
			return null;
		}
	}

	applyBuffer(id, data) {
		let newData = {};
		for (let k in data) {
			newData[k] = data[k];
		}
		if (this.writeBuffer[id]) {
			if (this.writeBuffer[id].user) {
				newData.name = this.writeBuffer[id].user;
			}
			newData.lastSeen.type = this.writeBuffer[id].type;
			newData.lastSeen.room = this.writeBuffer[id].room;
			newData.lastSeen.time = this.writeBuffer[id].time;
			newData.lastSeen.detail = this.writeBuffer[id].detail;
		}
		return newData;
	}

	write() {
		for (let id in this.writeBuffer) {
			this.writeLastSeen(id);
		}
		if (this.altsChanged) {
			this.altsdb.write();
		}
	}

	writeLastSeen(id) {
		if (!id || !this.writeBuffer[id]) return;
		this.cache.remove(id);
		let name = this.writeBuffer[id].user;
		let firstChar = id.charAt(0);
		let data = this.getSeenFile(id);
		if (data === null) {
			data = [];
		} else {
			data = data.split("\n");
		}
		let index = -1;
		for (let i = 0; i < data.length; i++) {
			if (data[i].substr(0, id.length + 1) === (id + ",")) {
				index = i;
				break;
			}
		}
		if (index === -1) {
			data.push("");
			index = data.length - 1;
		} else if (!name) {
			try {
				let obj = JSON.parse(data[index].substr(id.length + 1));
				name = obj.name;
			} catch (err) {}
		}
		let seenObj = {
			type: this.writeBuffer[id].type,
			room: this.writeBuffer[id].room,
			time: this.writeBuffer[id].time,
		};
		if (this.writeBuffer[id].detail) {
			seenObj.detail = this.writeBuffer[id].detail;
		}
		data[index] = id + "," + JSON.stringify({name: name, lastSeen: seenObj});
		FileSystem.writeFileSync(Path.resolve(this.path, firstChar + ".seen.log"), data.join("\n"));
		delete this.writeBuffer[id];
	}

	updateLastSeen(user, type, room, detail, doNotChangeName) {
		if (!room || room.substr(0, 7) === "battle-") {
			return; // Ignore PM and battles
		}
		let id = Text.toId(user);
		if (!id) return;
		let entry = this.writeBuffer[id] || {};
		if (!doNotChangeName) {
			entry.user = user;
		}
		entry.type = type;
		entry.room = room;
		entry.detail = detail;
		entry.time = Date.now();
		this.writeBuffer[id] = entry;
	}

	cleanAlts() {
		for (let k in this.altstree) {
			delete this.altstree[k];
		}
		this.altsdb.write();
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
			this.altsChanged = true;
		} else if (r1 !== r2) {
			this.mergeAlts(r1, r2);
			this.altsChanged = true;
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

	clean() {
		this.cleanAlts();
		this.cleanSeen();
	}
}

module.exports = UserDataManager;
