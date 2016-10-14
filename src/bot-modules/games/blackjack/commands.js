/**
 * Commands File
 *
 * blackjack: creates a game of Blackjack
 */

'use strict';

const Path = require('path');
const Translator = Tools('translate');
const Text = Tools('text');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));
const trigger = require(Path.resolve(__dirname, 'cmd-trigger.js'));

module.exports = {
	blackjack: function (App) {
		const Blackjack = App.modules.games.system.templates.blackjack;
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		if (this.getRoomType(this.room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
		let maxPlayers = parseInt(this.args[0]);
		if (Text.toId(this.args[0]) === 'infinite') {
			maxPlayers = 0;
		}
		let turnTime = parseInt(this.args[1] || '30');
		if (isNaN(turnTime) || turnTime < 10 || turnTime > 300) {
			return this.errorReply(translator.get(0, this.lang));
		}
		if (isNaN(maxPlayers) || (maxPlayers < 1 && maxPlayers !== 0)) {
			return this.errorReply(this.usage({desc: translator.get('maxplayers', this.lang), optional: true},
				{desc: translator.get('turntime', this.lang), optional: true}));
		}
		let blackjack = new Blackjack(this.room, maxPlayers, turnTime * 1000);
		if (!App.modules.games.system.createGame(this.room, blackjack, trigger)) {
			return this.errorReply(translator.get(1, this.lang));
		}
	},
};
