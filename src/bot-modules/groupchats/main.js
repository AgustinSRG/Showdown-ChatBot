/**
 * Bot Module: Group-Chats
 */

'use strict';

const Text = Tools('text');

const MAKE_GROUPCHAT_COMMAND = "makegroupchat";
const CHECK_INTERVAL = 45 * 1000;

const CMD_VOICE = "roomvoice";
const CMD_DRIVER = "roomdriver";
const CMD_MOD = "roommod";
const CMD_DEAUTH = "roomdeauth";

exports.setup = function (App) {
	const DB = App.dam.getDataBase('groupchats.json');

	const Config = DB.data;
	const Rooms = {};

	const GroupChatsMod = {
		timer: null,
		rooms: Rooms,
		db: DB,
		config: Config,

		saveData: function () {
			this.db.write();
		},

		cacheRooms: function () {
			for (let key in Rooms) {
				delete Rooms[key];
			}

			for (let key in Config) {
				let roomConf = Config[key];
				let roomid = this.getId(roomConf.name);
				Rooms[roomid] = key;
			}
		},

		tick: function () {
			if (!App.bot.status.connected || !App.bot.status.named) return;
			let toSend = [];

			for (let key in Config) {
				let roomConf = Config[key];
				let roomid = this.getId(roomConf.name);
				if (!App.bot.rooms[roomid]) {
					toSend.push("|/" + MAKE_GROUPCHAT_COMMAND + " " + roomConf.name + ", " + (roomConf.private ? "private" : "hidden"));
				}
			}

			if (toSend.length > 0) {
				App.bot.send(toSend);
			}
		},

		getId: function (name) {
			return "groupchat-" + Text.toId(App.bot.getBotNick()) + "-" + Text.toId(name);
		},

		checkAuth: function (room) {
			if (!App.bot.status.connected || !App.bot.status.named) return;
			let toSend = [];
			let roomConf = Config[Rooms[room]];
			if (!roomConf) return;

			let authfrom = {};

			if (roomConf.authfrom && App.bot.rooms[roomConf.authfrom]) {
				authfrom = App.bot.rooms[roomConf.authfrom].users;
			}

			if (App.bot.rooms[room]) {
				for (let user in App.bot.rooms[room].users) {
					if (roomConf.users[user]) {
						let group = App.bot.rooms[room].users[user];
						if (App.parser.equalOrHigherGroup({group: group}, roomConf.users[user])) continue;
						switch (roomConf.users[user]) {
						case "voice":
							toSend.push(room + "|/" + CMD_VOICE + " " + user);
							break;
						case "driver":
							toSend.push(room + "|/" + CMD_DRIVER + " " + user);
							break;
						case "mod":
							toSend.push(room + "|/" + CMD_MOD + " " + user);
							break;
						}
					} else if (authfrom[user]) {
						let group = App.bot.rooms[room].users[user];
						if (App.parser.equalOrHigherGroup({group: authfrom[user]}, "mod")) {
							if (App.parser.equalOrHigherGroup({group: group}, "mod")) continue;
							toSend.push(room + "|/" + CMD_MOD + " " + user);
						} else if (App.parser.equalOrHigherGroup({group: authfrom[user]}, "driver")) {
							if (App.parser.equalOrHigherGroup({group: group}, "driver")) continue;
							toSend.push(room + "|/" + CMD_DRIVER + " " + user);
						} else if (App.parser.equalOrHigherGroup({group: authfrom[user]}, "voice")) {
							if (App.parser.equalOrHigherGroup({group: group}, "voice")) continue;
							toSend.push(room + "|/" + CMD_VOICE + " " + user);
						}
					}
				}
			}

			if (toSend.length > 0) {
				App.bot.send(toSend);
			}
		},

		setAuth(room, user, group) {
			if (!App.bot.status.connected || !App.bot.status.named) return;
			let roomConf = Config[room];
			if (!roomConf) return;
			let roomid = this.getId(roomConf.name);
			switch (group) {
			case "voice":
				App.bot.send(roomid + "|/" + CMD_VOICE + " " + user);
				break;
			case "driver":
				App.bot.send(roomid + "|/" + CMD_DRIVER + " " + user);
				break;
			case "mod":
				App.bot.send(roomid + "|/" + CMD_MOD + " " + user);
				break;
			case "deauth":
				App.bot.send(roomid + "|/" + CMD_DEAUTH + " " + user);
				break;
			}
		},

		setRoomIntro: function (room) {
			if (!App.bot.status.connected || !App.bot.status.named) return;
			let roomConf = Config[room];
			if (!roomConf) return;
			let roomid = this.getId(roomConf.name);
			if (roomConf.intro) {
				App.bot.sendTo(roomid, "/roomintro " + roomConf.intro);
			}
		},

		leave: function (room) {
			if (!App.bot.status.connected || !App.bot.status.named) return;
			let roomConf = Config[room];
			if (!roomConf) return;
			let roomid = this.getId(roomConf.name);
			App.bot.sendTo(roomid, "/leave");
		},
	};

	App.bot.on("updateuser", () => {
		GroupChatsMod.cacheRooms();
	});

	App.bot.on("roomjoin", room => {
		if (Rooms[room]) {
			let roomConf = Config[Rooms[room]];
			if (roomConf) {
				if (roomConf.intro) {
					App.bot.sendTo(room, "/roomintro " + roomConf.intro);
				}
			}
		}
	});

	App.bot.on('userjoin', (room, by) => {
		if (Rooms[room]) {
			GroupChatsMod.checkAuth(room);
		}
	});

	App.bot.on('userrename', (room, old, by) => {
		if (Rooms[room]) {
			GroupChatsMod.checkAuth(room);
		}
	});

	GroupChatsMod.timer = setInterval(GroupChatsMod.tick.bind(GroupChatsMod), CHECK_INTERVAL);

	return GroupChatsMod;
};
