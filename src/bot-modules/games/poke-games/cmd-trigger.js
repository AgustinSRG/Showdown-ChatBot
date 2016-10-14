/**
 * Trigger: Poke-Games
 */

'use strict';

const Chat = Tools('chat');

exports.anagrams = {
	g: "guess",
	guess: function (game) {
		game.system.guess(this.by, this.arg);
	},

	show: function (game) {
		this.restrictReply(Chat.bold("Poke-Anagrams:") + " " + game.system.randomizedChars.join(', ') +
			' | ' + Chat.bold(game.system.clue), 'games');
	},

	end: "endanagrams",
	endanagrams: function (game) {
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
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
		txt += Chat.bold('Poke-Hangman:') + ' ';
		txt += game.system.generateHangman();
		txt += ' | ';
		txt += Chat.bold(game.system.clue) + ' | ';
		txt += game.system.said.sort().join(' ');
		this.restrictReply(txt, 'games');
	},

	end: "endhangman",
	endhangman: function (game) {
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		game.system.end();
	},
};
