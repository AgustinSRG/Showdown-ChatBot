/**
 * Trigger: Trivia
 */

'use strict';

const Chat = Tools('chat');

module.exports = {
	g: "triviaanswer",
	guess: "triviaanswer",
	answer: "triviaanswer",
	ta: "triviaanswer",
	triviaanswer: function (game) {
		game.system.guess(this.by, this.arg);
	},

	question: function (game) {
		if (game.system.status !== 'question') return;
		this.restrictReply(Chat.bold("Trivia:") + " " + game.system.clue, 'games');
	},

	end: "endtrivia",
	endtrivia: function (game) {
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		game.system.end();
	},
};
