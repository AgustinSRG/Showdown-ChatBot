/**
 * Commands File
 *
 * anagrams: creates a game of Anagrams
 * hangman: creates a game of hangman
 */

'use strict';

const Path = require('path');
const Translator = Tools('translate');
const Text = Tools('text');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));
const trigger = require(Path.resolve(__dirname, 'cmd-trigger.js'));

module.exports = {
	anagrams: function (App) {
		const Anagrams = App.modules.games.system.templates.wordgames.anagrams;
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		if (!this.arg) {
			return this.errorReply(this.usage({desc: translator.get('games', this.lang)},
				{desc: translator.get('maxpoints', this.lang), optional: true}, {desc: translator.get('anstime', this.lang), optional: true}));
		}
		let args = this.args;
		if (this.getRoomType(this.room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
		let games = parseInt(args[0]);
		if (Text.toId(args[0]) === 'inf' || Text.toId(args[0]) === 'infinite') {
			games = 0;
		}
		let points = parseInt(args[1] || "0");
		if (Text.toId(args[1]) === 'inf' || Text.toId(args[1]) === 'infinite') {
			points = 0;
		}
		let ansTime = parseInt(args[2] || "30");
		if (isNaN(ansTime) || ansTime < 10 || ansTime > 300) {
			return this.errorReply(translator.get(0, this.lang));
		}
		if (games < 0 || points < 0 || isNaN(games) || isNaN(points)) {
			return this.errorReply(this.usage({desc: translator.get('games', this.lang)},
				{desc: translator.get('maxpoints', this.lang), optional: true}, {desc: translator.get('anstime', this.lang), optional: true}));
		}
		if (App.modules.games.system.templates.wordgames.isDataEmpty()) {
			return this.errorReply(translator.get(2, this.lang));
		}
		let anagrams = new Anagrams(this.room, games, points, ansTime * 1000);
		if (!App.modules.games.system.createGame(this.room, anagrams, trigger.anagrams)) {
			return this.errorReply(translator.get(1, this.lang));
		}
	},

	hangman: function (App) {
		const Hangman = App.modules.games.system.templates.wordgames.hangman;
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		if (this.getRoomType(this.room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
		let maxFails = parseInt(this.arg || '0');
		if (isNaN(maxFails) || maxFails < 0) {
			return this.errorReply(this.usage({desc: translator.get('maxfails', this.lang), optional: true}));
		}
		if (App.modules.games.system.templates.wordgames.isDataEmpty()) {
			return this.errorReply(translator.get(2, this.lang));
		}
		let hangman = new Hangman(this.room, maxFails);
		if (!App.modules.games.system.createGame(this.room, hangman, trigger.hangman)) {
			return this.errorReply(translator.get(1, this.lang));
		}
	},
};
