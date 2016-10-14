/**
 * Trigger: Kunc
 */

'use strict';

const Chat = Tools('chat');

module.exports = {
	g: "kuncanswer",
	guess: "kuncanswer",
	answer: "kuncanswer",
	ka: "kuncanswer",
	kuncanswer: function (game) {
		game.system.guess(this.by, this.arg);
	},

	question: function (game) {
		if (game.system.status !== 'question') return;
		this.restrictReply(Chat.bold("Kunc:") + " " + game.system.clue, 'games');
	},

	end: "endkunc",
	endkunc: function (game) {
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		game.system.end();
	},
};
