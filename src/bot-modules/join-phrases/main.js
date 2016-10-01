/*
 * Bot Module: Join-Phrases
 */

'use strict';

const Path = require('path');
const Text = Tools.get('text.js');

const DataBase = Tools.get('json-db.js');

const db = exports.db = new DataBase(Path.resolve(App.confDir, 'join-phrases.json'));

const config = exports.config = db.data;

if (!config.rooms) {
	config.rooms = {};
}

App.bot.on('userjoin', (room, user) => {
	user = Text.toId(user);
	if (config.rooms && config.rooms[room] && config.rooms[room][user]) {
		App.bot.sendTo(room, Text.stripCommands(config.rooms[room][user]));
	}
});
