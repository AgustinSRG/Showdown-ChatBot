/**
 * Trigger: Kunc
 */

'use strict';

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
		this.restrictReply("**Kunc:** " + game.system.clue, 'games');
	},

	end: "endkunc",
	endkunc: function (game) {
		if (!this.can('games')) return this.replyAccessDenied('games');
		game.system.end();
	},
};
