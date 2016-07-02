/*
 * Bot Module: Blacklist
 */

'use strict';

const Path = require('path');

const Text = Tools.get('text.js');
const DataBase = Tools.get('json-db.js');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'blacklist.translations'));

const db = exports.db = new DataBase(Path.resolve(App.confDir, 'blacklist.json'));

const data = exports.data = db.data;

function getLanguage(room) {
	return App.config.language.rooms[room] || App.config.language['default'];
}

function botCanBan(room) {
	let roomData = App.bot.rooms[room];
	let botid = Text.toId(App.bot.getBotNick());
	return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({group: roomData.users[botid]}, 'mod'));
}

exports.blacklist = function (room, user) {
	user = Text.toId(user);
	if (!user) return false;
	if (!data[room]) data[room] = {};
	if (data[room][user]) {
		return false;
	} else {
		data[room][user] = true;
		return true;
	}
};

exports.unblacklist = function (room, user) {
	user = Text.toId(user);
	if (!user || !data[room]) return false;
	if (data[room][user]) {
		delete data[room][user];
		if (Object.keys(data[room]).length === 0) {
			delete data[room];
		}
		return true;
	} else {
		return false;
	}
};

exports.getInitCmds = function () {
	let cmds = [];
	for (let room in App.bot.rooms) {
		let users = App.bot.rooms[room].users;
		for (let id in users) {
			let group = users[id];
			if (App.parser.equalOrHigherGroup({group: group}, 'driver')) continue; // Do not ban staff
			if (!botCanBan(room)) continue; // Bot cannot ban
			if (data[room] && data[room][id]) {
				cmds.push(room + '|/roomban ' + id + ', ' + translator.get('ban', getLanguage(room)));
			}
		}
	}
	return cmds;
};

App.bot.on('userjoin', (room, by) => {
	let user = Text.parseUserIdent(by);
	if (App.parser.equalOrHigherGroup(user, 'driver')) return; // Do not ban staff
	if (!botCanBan(room)) return; // Bot cannot ban
	if (data[room] && data[room][user.id]) {
		App.bot.sendTo(room, '/roomban ' + user.id + ', ' + translator.get('ban', getLanguage(room)));
	}
});

App.bot.on('userrename', (room, old, by) => {
	let user = Text.parseUserIdent(by);
	if (App.parser.equalOrHigherGroup(user, 'driver')) return; // Do not ban staff
	if (!botCanBan(room)) return; // Bot cannot ban
	if (data[room] && data[room][user.id]) {
		App.bot.sendTo(room, '/roomban ' + user.id + ', ' + translator.get('ban', getLanguage(room)));
	}
});

require(Path.resolve(__dirname, 'server-handler.js'));
