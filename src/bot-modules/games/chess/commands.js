/**
 * Commands File - Chess Game
 */

'use strict';

const Path = require('path');

module.exports = {
	chess: function (game) {
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		let ChessManager;
		try {
			ChessManager = game.system.templates.chess;
		} catch (e) {
			return this.reply('Chess game system not available');
		}
		if (this.cmd === 'startchess' || this.cmd === 'newchess') {
			if (this.args.length < 2) {
				return this.reply('Usage: startchess [player1], [player2]');
			}
			const player1 = this.parseUser(this.args[0]);
			const player2 = this.parseUser(this.args[1]);
			if (!player1 || !player2) {
				return this.reply('Invalid players specified');
			}
			if (player1 === player2) {
				return this.reply('Players cannot be the same person');
			}
			const result = ChessManager.startGame(this.room, [player1, player2]);
			if (!result.success) {
				return this.reply(result.error);
			}
			this.reply('Chess game started! **' + player1 + '** (White) vs **' + player2 + '** (Black)');
			const boardResult = ChessManager.showBoard(this.room);
			if (boardResult.success) {
				this.reply('/html ' + boardResult.board + '<br>' + boardResult.info);
			}
			return;
		}
		if (this.cmd === 'endchess' || this.cmd === 'stopchess') {
			const result2 = ChessManager.endGame(this.room);
			if (!result2.success) {
				return this.reply(result2.error);
			}
			return this.reply('Chess game ended');
		}
		if (this.cmd === 'chessboard' || this.cmd === 'board') {
			const result3 = ChessManager.showBoard(this.room);
			if (!result3.success) {
				return this.reply(result3.error);
			}
			return this.reply('/html ' + result3.board + '<br>' + result3.info);
		}
		if (this.cmd === 'move' || this.cmd === 'chessmove') {
			if (this.args.length === 0) {
				return this.reply('Usage: move [from]-[to] (example: move e2-e4)');
			}
			const mv = this.args.join(' ');
			const result4 = ChessManager.playMove(this.room, this.by, mv);
			if (!result4.success) {
				return this.reply(result4.error);
			}
			const boardResult2 = ChessManager.showBoard(this.room);
			if (boardResult2.success) {
				this.reply('/html ' + boardResult2.board + '<br>' + boardResult2.info);
			}
			return;
		}
		if (this.cmd === 'watch' || this.cmd === 'spectate') {
			ChessManager.addSpectator(this.room, this.by);
			const result5 = ChessManager.showBoard(this.room);
			if (!result5.success) {
				return this.reply(result5.error);
			}
			return this.reply('/html ' + result5.board + '<br>' + result5.info);
		}
		return this.reply('Chess game system not available');
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
