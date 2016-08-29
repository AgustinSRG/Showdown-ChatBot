/**
 * Commands File
 */

'use strict';

const Path = require('path');
const Translator = Tools.get('translate.js');
const Text = Tools.get('text.js');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));
const trigger = require(Path.resolve(__dirname, 'cmd-trigger.js'));
const PokeRand = require(Path.resolve(__dirname, 'pokerand.js'));

const PokeAnagrams = require(Path.resolve(__dirname, 'poke-anagrams.js'));
const PokeHangman = require(Path.resolve(__dirname, 'poke-hangman.js'));

module.exports = {
	pokeanagrams: function () {
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
		if (games < 0 || points < 0) {
			return this.errorReply(this.usage({desc: translator.get('games', this.lang)},
				{desc: translator.get('maxpoints', this.lang), optional: true}, {desc: translator.get('anstime', this.lang), optional: true}));
		}
		try {
			PokeRand.getData();
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(translator.get(2, this.lang));
		}
		let anagrams = new PokeAnagrams(this.room, games, points, ansTime * 1000);
		if (!App.modules.games.system.createGame(this.room, anagrams, trigger.anagrams)) {
			return this.errorReply(translator.get(1, this.lang));
		}
	},

	pokehangman: function () {
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		if (this.getRoomType(this.room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
		let maxFails = parseInt(this.arg || '0');
		if (isNaN(maxFails) || maxFails < 0) {
			return this.errorReply(this.usage({desc: translator.get('maxfails', this.lang), optional: true}));
		}
		try {
			PokeRand.getData();
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(translator.get(2, this.lang));
		}
		let hangman = new PokeHangman(this.room, maxFails);
		if (!App.modules.games.system.createGame(this.room, hangman, trigger.hangman)) {
			return this.errorReply(translator.get(1, this.lang));
		}
	},
};
