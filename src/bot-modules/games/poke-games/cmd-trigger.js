/**
 * Trigger: Trivia
 */

'use strict';

exports.anagrams = {
	g: "guess",
	guess: function (game) {
		game.system.guess(this.by, this.arg);
	},

	show: function (game) {
		this.restrictReply("**Poke-Anagrams:** " + game.system.randomizedChars.join(', ') +
			' | **' + game.system.clue + '**', 'games');
	},

	end: "endanagrams",
	endanagrams: function (game) {
		if (!this.can('games')) return this.replyAccessDenied('games');
		game.system.end();
	},
};

exports.hangman = {
	g: "guess",
	guess: function (game) {
		game.system.guess(this.byIdent.name, this.arg);
	},

	show: function (game) {
		let txt = '';
		txt += '**Poke-Hangman:** ';
		txt += game.system.generateHangman();
		txt += ' | ';
		txt += '**' + game.system.clue + '** | ';
		txt += game.system.said.sort().join(' ');
		this.restrictReply(txt, 'games');
	},

	end: "endhangman",
	endhangman: function (game) {
		if (!this.can('games')) return this.replyAccessDenied('games');
		game.system.end();
	},
};
