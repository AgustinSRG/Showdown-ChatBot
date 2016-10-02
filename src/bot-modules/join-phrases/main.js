/*
 * Bot Module: Join-Phrases
 */

'use strict';

const Path = require('path');
const Text = Tools.get('text.js');
const DataBase = Tools.get('json-db.js');

exports.setup = function (App) {
	class JoinPhrasesModule {
		constructor() {
			this.db = new DataBase(Path.resolve(App.confDir, 'join-phrases.json'));
			this.config = this.db.data;
			if (!this.config.rooms) {
				this.config.rooms = {};
			}
		}
	}

	const JoinPhrasesMod = new JoinPhrasesModule();
	const config = JoinPhrasesMod.config;

	App.bot.on('userjoin', (room, user) => {
		user = Text.toId(user);
		if (config.rooms && config.rooms[room] && config.rooms[room][user]) {
			App.bot.sendTo(room, Text.stripCommands(config.rooms[room][user]));
		}
	});

	return JoinPhrasesMod;
};
