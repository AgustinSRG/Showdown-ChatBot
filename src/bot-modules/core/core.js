/**
 * Bot Module: Core
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const RoomManager = require(Path.resolve(__dirname, 'rooms.js'));

function setup(App) {
	if (!App.config.modules.core) {
		App.config.modules.core = {
			nick: '',
			pass: '',
			avatar: '',
			rooms: [],
			privaterooms: [],
			joinall: false,
			joinofficial: false,
		};
	}

	const CoreMod = {};

	let lastLogin = CoreMod.lastLogin = {nick: '', named: false};

	let manager = CoreMod.manager = new RoomManager(Path.resolve(App.confDir, 'rooms/'));
	CoreMod.loginTimer = null;

	function execInitCmds() {
		let cmds = [];
		for (let mod in App.modules) {
			if (App.modules[mod].system && typeof App.modules[mod].system.getInitCmds === 'function') {
				cmds = cmds.concat(App.modules[mod].system.getInitCmds());
			}
		}
		if (cmds.length) {
			App.bot.send(cmds);
		}
	}

	function runFirstLogin(moreRooms) {
		/* First login - Join the rooms */
		let rooms = [];
		rooms = rooms.concat(App.config.modules.core.rooms || []);
		let tempRooms = App.config.modules.core.privaterooms || [];
		for (let i = 0; i < tempRooms.length; i++) {
			if (rooms.indexOf(tempRooms[i]) < 0) {
				rooms.push(tempRooms[i]);
			}
		}
		tempRooms = manager.getRooms();
		for (let i = 0; i < tempRooms.length; i++) {
			if (rooms.indexOf(tempRooms[i]) < 0) {
				rooms.push(tempRooms[i]);
			}
		}
		if (moreRooms) {
			for (let i = 0; i < moreRooms.length; i++) {
				if (rooms.indexOf(moreRooms[i]) < 0) {
					rooms.push(moreRooms[i]);
				}
			}
		}
		let cmds = [];
		for (let i = 0; i < rooms.length; i++) {
			cmds.push('|/join ' + rooms[i]);
		}
		if (App.config.modules.core.avatar) {
			cmds.push('|/avatar ' + App.config.modules.core.avatar);
		}
		if (cmds.length) {
			App.bot.send(cmds).then(execInitCmds);
		} else {
			execInitCmds();
		}
	}

	function setLoginTimer(time) {
		CoreMod.loginTimer = setTimeout(() => {
			CoreMod.loginTimer = null;
			App.logToConsole("Login Timeout. Retrying in 5 seconds");
			App.log("[Bot Core] Login Timeout. Retrying in 5 seconds");
			App.bot.retryRename(5000, App.config.modules.core.nick, App.config.modules.core.pass);
		}, time);
	}

	CoreMod.waitingQueryResponse = false;

	App.bot.on('queryresponse', data => {
		if (!CoreMod.waitingQueryResponse) return;
		data = data.split("|");
		if (data.shift() !== "rooms") return;
		CoreMod.waitingQueryResponse = false;
		data = data.join("|");
		try {
			data = JSON.parse(data);
			if (typeof data !== "object" || data === null) {
				App.logToConsole("Parse Failure (queryresponse): " + JSON.stringify(data));
				runFirstLogin();
				return;
			}
		} catch (err) {
			App.logToConsole("Parse Failure (queryresponse): " + err.message);
			runFirstLogin();
			return;
		}
		let rooms = [];
		if (data.official && App.config.modules.core.joinofficial) {
			for (let room of data.official) {
				rooms.push(Text.toRoomid(room.title));
			}
		}
		if (data.chat && App.config.modules.core.joinall) {
			for (let room of data.chat) {
				rooms.push(Text.toRoomid(room.title));
			}
		}
		runFirstLogin(rooms);
	});

	App.bot.on('updateuser', (nick, named) => {
		if (named && CoreMod.loginTimer) {
			clearTimeout(CoreMod.loginTimer);
			CoreMod.loginTimer = null;
		}
		App.logToConsole('Nick Changed: ' + nick);
		App.log('[Bot Core] Nick Changed: ' + nick);
		if (!lastLogin.named && named && (App.config.modules.core.joinall || App.config.modules.core.joinofficial)) {
			CoreMod.waitingQueryResponse = true;
			App.bot.send(["|/cmd rooms"]);
		} else if (!lastLogin.named && named) {
			runFirstLogin();
		}
		lastLogin.nick = nick;
		lastLogin.named = named;
	});

	App.bot.on('renamefailure', err => {
		if (lastLogin.named) return;
		if (!App.bot.isConnected()) return;
		if (CoreMod.loginTimer) {
			clearTimeout(CoreMod.loginTimer);
			CoreMod.loginTimer = null;
		}
		if (err === 'wrongpassword') {
			App.logToConsole("Login Error: Wrong password.");
			App.log("[Bot Core] Login Error: Wrong password.");
		} else if (App.config.modules.core.nick) {
			App.logToConsole("Login Error: Heavy Load / Connection error. Retrying in 5 seconds");
			App.log("[Bot Core] Login Error: Heavy Load / Connection error. Retrying in 5 seconds");
			App.bot.retryRename(5000, App.config.modules.core.nick, App.config.modules.core.pass);
			setLoginTimer(35 * 1000);
		}
	});

	App.bot.on('challstr', () => {
		if (App.config.modules.core.nick) {
			App.logToConsole('Logging into ' + App.config.modules.core.nick + '...');
			setLoginTimer(30 * 1000);
			App.bot.rename(App.config.modules.core.nick, App.config.modules.core.pass);
		}
	});

	App.bot.on('roomjoin', (room, type) => {
		if (type === 'chat') {
			manager.joinRoom(room);
		}
	});

	App.bot.on('roomleave', room => {
		manager.leaveRoom(room);
	});

	App.bot.on('roomjoinfailure', room => {
		manager.leaveRoom(room);
	});

	App.bot.on('send', msg => {
		if (App.config.debug) {
			App.logToConsole('SENT: ' + msg);
		}
	});

	App.bot.on('line', (room, msg) => {
		if (App.config.debug) {
			App.logToConsole('LINE: ' + msg);
		}
	});

	App.server.setPermission('core', 'Permission for changing the bot autojoin and login configuration');

	return CoreMod;
}

exports.setup = setup;
