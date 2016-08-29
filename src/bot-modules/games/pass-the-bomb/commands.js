/**
 * Commands File
 */

'use strict';

const Path = require('path');
const Translator = Tools.get('translate.js');
const Text = Tools.get('text.js');

const PassBomb = require(Path.resolve(__dirname, 'passbomb.js'));
const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));
const trigger = require(Path.resolve(__dirname, 'cmd-trigger.js'));

module.exports = {
	passbomb: function () {
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		if (this.getRoomType(this.room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
		let maxPlayers = parseInt(this.arg);
		if (Text.toId(this.arg) === 'infinite') {
			maxPlayers = 0;
		}
		if (isNaN(maxPlayers) || (maxPlayers < 2 && maxPlayers !== 0)) {
			return this.errorReply(this.usage({desc: translator.get('maxplayers', this.lang), optional: true}));
		}
		let passbomb = new PassBomb(this.room, maxPlayers);
		if (!App.modules.games.system.createGame(this.room, passbomb, trigger)) {
			return this.errorReply(translator.get(1, this.lang));
		}
	},
};
