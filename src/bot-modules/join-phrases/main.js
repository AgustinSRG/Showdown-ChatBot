/**
 * Bot Module: Join-Phrases
 */

'use strict';

const Text = Tools('text');

exports.setup = function (App) {
	const JoinPhrasesMod = {};
	JoinPhrasesMod.db = App.dam.getDataBase('join-phrases.json');
	JoinPhrasesMod.config = JoinPhrasesMod.db.data;
	if (!JoinPhrasesMod.config.rooms) {
		JoinPhrasesMod.config.rooms = {};
	}

	const config = JoinPhrasesMod.config;

	App.bot.on('userjoin', (room, user) => {
		user = Text.toId(user);
		if (config.rooms && config.rooms[room] && config.rooms[room][user]) {
			App.bot.sendTo(room, Text.stripCommands(config.rooms[room][user]));
		}
	});

	return JoinPhrasesMod;
};
