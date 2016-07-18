/**
 * Trigger: Blackjack
 */

'use strict';

module.exports = {
	"in": "join",
	join: function (game) {
		game.system.userJoin(this.byIdent);
	},

	out: "leave",
	leave: function (game) {
		game.system.userLeave(this.byIdent);
	},

	start: function (game) {
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		game.system.startGame();
	},

	players: function (game) {
		let players = Object.values(game.system.players);
		if (players.length > 0) {
			let txt = '';
			let cmds = [];
			for (let i = 0; i < players.length; i++) {
				let toAdd = players[i];
				if (i < players.length - 1) {
					toAdd += ', ';
				}
				if (txt.length + toAdd.length > 300) {
					cmds.push(txt);
					txt = '';
				}
				txt += toAdd;
			}
			if (txt.length > 0) {
				cmds.push(txt);
			}
			this.restrictReply(cmds, 'games');
		}
	},

	hit: function (game) {
		game.system.hit(this.byIdent);
	},

	stand: function (game) {
		game.system.stand(this.byIdent);
	},

	hand: function (game) {
		game.system.showHand(this.byIdent);
	},

	end: "endblackjack",
	endblackjack: function (game) {
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		game.system.end(true);
	},
};
