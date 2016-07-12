/**
 * Commands File
 */

'use strict';

const Path = require('path');
const Translator = Tools.get('translate.js');
const Text = Tools.get('text.js');

const Ambush = require(Path.resolve(__dirname, 'ambush.js'));
const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));
const trigger = require(Path.resolve(__dirname, 'cmd-trigger.js'));

module.exports = {
	ambush: function () {
		if (!this.can('games')) return this.replyAccessDenied('games');
		if (this.getRoomType(this.room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
		let maxPlayers = parseInt(this.arg);
		if (Text.toId(this.arg) === 'infinite') {
			maxPlayers = 0;
		}
		if (isNaN(maxPlayers) || (maxPlayers < 2 && maxPlayers !== 0)) {
			return this.errorReply(this.usage({desc: 'max players', optional: true}));
		}
		let ambush = new Ambush(this.room, maxPlayers);
		if (!App.modules.games.system.createGame(this.room, ambush, trigger)) {
			return this.errorReply(translator.get(1, this.lang));
		}
	},
};
