/**
 * Commands File - Chess Game
 */

'use strict';

const Path = require('path');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

module.exports = {
	chess: function (game) {
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		
		let ChessManager;
		try {
			ChessManager = game.system.templates.chess;
		} catch (e) {
			return this.reply(this.trad('c1'));
		}

		if (this.cmd === 'startchess' || this.cmd === 'newchess') {
			if (this.args.length < 2) {
				return this.reply(this.trad('c2'));
			}
			
			const player1 = this.parseUser(this.args[0]);
			const player2 = this.parseUser(this.args[1]);
			
			if (!player1 || !player2) {
				return this.reply(this.trad('c3'));
			}
			
			if (player1 === player2) {
				return this.reply(this.trad('c4'));
			}
			
			const result = ChessManager.startGame(this.room, [player1, player2]);
			if (!result.success) {
				return this.reply(result.error);
			}
			
			this.reply(this.trad('c5') + ' **' + player1 + '** (White) vs **' + player2 + '** (Black)');
			
			const boardResult = ChessManager.showBoard(this.room);
			if (boardResult.success) {
				this.reply('/html ' + boardResult.board + '<br>' + boardResult.info);
			}
			return;
		}

		if (this.cmd === 'endchess' || this.cmd === 'stopchess') {
			const result = ChessManager.endGame(this.room);
			if (!result.success) {
				return this.reply(result.error);
			}
			return this.reply(this.trad('c6'));
		}

		if (this.cmd === 'chessboard' || this.cmd === 'board') {
			const result = ChessManager.showBoard(this.room);
			if (!result.success) {
				return this.reply(result.error);
			}
			return this.reply('/html ' + result.board + '<br>' + result.info);
		}

		if (this.cmd === 'move' || this.cmd === 'chessmove') {
			if (this.args.length === 0) {
				return this.reply(this.trad('c7'));
			}
			
			const move = this.args.join(' ');
			const result = ChessManager.playMove(this.room, this.by, move);
			
			if (!result.success) {
				return this.reply(result.error);
			}
			
			const boardResult = ChessManager.showBoard(this.room);
			if (boardResult.success) {
				this.reply('/html ' + boardResult.board + '<br>' + boardResult.info);
			}
			return;
		}

		if (this.cmd === 'watch' || this.cmd === 'spectate') {
			ChessManager.addSpectator(this.room, this.by);
			const result = ChessManager.showBoard(this.room);
			if (!result.success) {
				return this.reply(result.error);
			}
			return this.reply('/html ' + result.board + '<br>' + result.info);
		}

		return this.reply(this.trad('c1'));
	},

	startchess: 'chess',
	newchess: 'chess',
	endchess: 'chess',
	stopchess: 'chess',
	chessboard: 'chess',
	board: 'chess',
	move: 'chess',
	chessmove: 'chess',
	watch: 'chess',
	spectate: 'chess'
};