/**
 * Bot Module: Moderation
 */

'use strict';

const Path = require('path');

const DataBase = Tools.get('json-db.js');
const ModeratorBot = require(Path.resolve(__dirname, 'moderator-bot.js')).ModeratorBot;

const db = exports.db = new DataBase(Path.resolve(App.confDir, 'moderation.json'));

const data = exports.data = db.data;

if (!data.punishments) {
	data.punishments = ['warn', 'mute', 'hourmute', 'roomban'];
}

if (!data.values) {
	data.values = {};
}

if (!data.settings) {
	data.settings = {};
}

if (!data.roomSettings) {
	data.roomSettings = {};
}

if (!data.modexception) {
	data.modexception = {
		global: 'driver',
		rooms: {},
	};
}

if (!data.rulesLink) {
	data.rulesLink = {};
}

if (!data.bannedWords) {
	data.bannedWords = {};
}

if (!data.zeroTolerance) {
	data.zeroTolerance = {};
}

if (!data.enableZeroTol) {
	data.enableZeroTol = {};
}

if (!data.serversWhitelist) {
	data.serversWhitelist = ['sim', 'showdown', 'smogtours'];
}

exports.modBot = new ModeratorBot(Path.resolve(__dirname, 'filters/'));

App.bot.on('userchat', (room, time, by, msg) => {
	if (!App.bot.rooms[room] || App.bot.rooms[room].type !== 'chat') return;
	exports.modBot.parse(room, time, by, msg);
});

App.bot.on('line', (room, line, spl, isIntro) => {
	if (isIntro) return;
	if (!App.bot.rooms[room] || App.bot.rooms[room].type !== 'chat') return;
	if (!data.enableZeroTol[room]) return;
	if (line.charAt(0) !== '|') exports.modBot.parseRaw(room, line);
});

App.server.setPermission('moderation', 'Permission for changing moderation configuration');

require(Path.resolve(__dirname, 'handlers', 'moderation.js'));
require(Path.resolve(__dirname, 'handlers', 'bannedwords.js'));
require(Path.resolve(__dirname, 'handlers', 'zerotolerance.js'));
