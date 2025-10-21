/**
 * Chess Game Implementation
 */

'use strict';

const Path = require('path');

const Lang_File = Path.resolve(__dirname, 'chess.translations');

const PIECES = {
	WHITE: {
		KING: '♔', QUEEN: '♕', ROOK: '♖', BISHOP: '♗', KNIGHT: '♘', PAWN: '♙'
	},
	BLACK: {
		KING: '♚', QUEEN: '♛', ROOK: '♜', BISHOP: '♝', KNIGHT: '♞', PAWN: '♟'
	}
};

const PIECE_VALUES = {
	'♔': 'K', '♕': 'Q', '♖': 'R', '♗': 'B', '♘': 'N', '♙': 'P',
	'♚': 'k', '♛': 'q', '♜': 'r', '♝': 'b', '♞': 'n', '♟': 'p'
};

class ChessGame {
	constructor(room, players, App) {
		this.room = room;
		this.players = players;
		this.App = App;
		this.board = this.initializeBoard();
		this.currentPlayer = 0;
		this.moveHistory = [];
		this.gameOver = false;
		this.winner = null;
		this.spectators = new Set();
		this.lastMove = null;
		this.castling = {
			white: { kingside: true, queenside: true },
			black: { kingside: true, queenside: true }
		};
		this.enPassant = null;
		this.halfMoveClock = 0;
		this.fullMoveNumber = 1;
	}

	initializeBoard() {
		return [
			['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
			['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
			[null, null, null, null, null, null, null, null],
			[null, null, null, null, null, null, null, null],
			[null, null, null, null, null, null, null, null],
			[null, null, null, null, null, null, null, null],
			['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
			['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
		];
	}

	getCurrentPlayerName() {
		return this.players[this.currentPlayer];
	}

	getCurrentPlayerColor() {
		return this.currentPlayer === 0 ? 'White' : 'Black';
	}

	isWhitePiece(piece) {
		return piece && Object.values(PIECES.WHITE).includes(piece);
	}

	isBlackPiece(piece) {
		return piece && Object.values(PIECES.BLACK).includes(piece);
	}

	getPieceColor(piece) {
		if (this.isWhitePiece(piece)) return 0;
		if (this.isBlackPiece(piece)) return 1;
		return -1;
	}

	parseMove(moveStr) {
		const match = moveStr.match(/^([a-h][1-8])\s*[-to]?\s*([a-h][1-8])(?:=([QRBN]))?$/i);
		if (!match) return null;

		const from = this.algebraicToCoords(match[1]);
		const to = this.algebraicToCoords(match[2]);
		const promotion = match[3] ? match[3].toUpperCase() : null;

		return { from, to, promotion };
	}

	algebraicToCoords(pos) {
		const file = pos.charCodeAt(0) - 'a'.charCodeAt(0);
		const rank = 8 - parseInt(pos[1]);
		return { row: rank, col: file };
	}

	coordsToAlgebraic(row, col) {
		return String.fromCharCode('a'.charCodeAt(0) + col) + (8 - row);
	}

	isValidMove(move) {
		const { from, to } = move;
		const piece = this.board[from.row][from.col];
		
		if (!piece) return false;
		if (this.getPieceColor(piece) !== this.currentPlayer) return false;
		if (from.row === to.row && from.col === to.col) return false;
		
		const targetPiece = this.board[to.row][to.col];
		if (targetPiece && this.getPieceColor(targetPiece) === this.currentPlayer) return false;

		if (!this.isValidPieceMove(piece, from, to)) return false;

		const boardCopy = this.copyBoard();
		this.makeMove(move, boardCopy);
		if (this.isInCheck(this.currentPlayer, boardCopy)) return false;

		return true;
	}

	isValidPieceMove(piece, from, to) {
		const pieceType = PIECE_VALUES[piece].toLowerCase();
		const deltaRow = to.row - from.row;
		const deltaCol = to.col - from.col;

		switch (pieceType) {
			case 'p':
				return this.isValidPawnMove(piece, from, to, deltaRow, deltaCol);
			case 'r':
				return this.isValidRookMove(from, to, deltaRow, deltaCol);
			case 'n':
				return Math.abs(deltaRow) === 2 && Math.abs(deltaCol) === 1 ||
					   Math.abs(deltaRow) === 1 && Math.abs(deltaCol) === 2;
			case 'b':
				return this.isValidBishopMove(from, to, deltaRow, deltaCol);
			case 'q':
				return this.isValidRookMove(from, to, deltaRow, deltaCol) ||
					   this.isValidBishopMove(from, to, deltaRow, deltaCol);
			case 'k':
				return this.isValidKingMove(from, to, deltaRow, deltaCol);
		}
		return false;
	}

	isValidPawnMove(piece, from, to, deltaRow, deltaCol) {
		const isWhite = this.isWhitePiece(piece);
		const direction = isWhite ? -1 : 1;
		const startRow = isWhite ? 6 : 1;
		const targetPiece = this.board[to.row][to.col];

		if (deltaCol === 0) {
			if (targetPiece) return false;
			if (deltaRow === direction) return true;
			if (deltaRow === 2 * direction && from.row === startRow) return true;
		} else if (Math.abs(deltaCol) === 1 && deltaRow === direction) {
			if (targetPiece) return true;
			if (this.enPassant && to.row === this.enPassant.row && to.col === this.enPassant.col) {
				return true;
			}
		}
		return false;
	}

	isValidRookMove(from, to, deltaRow, deltaCol) {
		if (deltaRow !== 0 && deltaCol !== 0) return false;
		return this.isPathClear(from, to);
	}

	isValidBishopMove(from, to, deltaRow, deltaCol) {
		if (Math.abs(deltaRow) !== Math.abs(deltaCol)) return false;
		return this.isPathClear(from, to);
	}

	isValidKingMove(from, to, deltaRow, deltaCol) {
		if (Math.abs(deltaRow) <= 1 && Math.abs(deltaCol) <= 1) return true;
		
		if (deltaRow === 0 && Math.abs(deltaCol) === 2) {
			return this.canCastle(from, to);
		}
		return false;
	}

	isPathClear(from, to) {
		const deltaRow = to.row - from.row;
		const deltaCol = to.col - from.col;
		const stepRow = deltaRow === 0 ? 0 : deltaRow / Math.abs(deltaRow);
		const stepCol = deltaCol === 0 ? 0 : deltaCol / Math.abs(deltaCol);

		let currentRow = from.row + stepRow;
		let currentCol = from.col + stepCol;

		while (currentRow !== to.row || currentCol !== to.col) {
			if (this.board[currentRow][currentCol] !== null) return false;
			currentRow += stepRow;
			currentCol += stepCol;
		}
		return true;
	}

	canCastle(from, to) {
		const isKingSide = to.col > from.col;
		const color = this.currentPlayer === 0 ? 'white' : 'black';
		const castleType = isKingSide ? 'kingside' : 'queenside';

		if (!this.castling[color][castleType]) return false;

		if (this.isInCheck(this.currentPlayer)) return false;

		const step = isKingSide ? 1 : -1;
		for (let col = from.col + step; col !== to.col + step; col += step) {
			if (this.board[from.row][col] !== null) return false;
			
			const testBoard = this.copyBoard();
			testBoard[from.row][col] = testBoard[from.row][from.col];
			testBoard[from.row][from.col] = null;
			if (this.isInCheck(this.currentPlayer, testBoard)) return false;
		}
		return true;
	}

	isInCheck(playerColor, board) {
		if (!board) board = this.board;
		const kingPiece = playerColor === 0 ? PIECES.WHITE.KING : PIECES.BLACK.KING;
		let kingPos = null;
		
		for (let row = 0; row < 8; row++) {
			for (let col = 0; col < 8; col++) {
				if (board[row][col] === kingPiece) {
					kingPos = { row, col };
					break;
				}
			}
			if (kingPos) break;
		}
		
		if (!kingPos) return false;

		for (let row = 0; row < 8; row++) {
			for (let col = 0; col < 8; col++) {
				const piece = board[row][col];
				if (piece && this.getPieceColor(piece) !== playerColor) {
					if (this.canPieceAttack(piece, { row, col }, kingPos, board)) {
						return true;
					}
				}
			}
		}
		return false;
	}

	canPieceAttack(piece, from, to, board) {
		if (!board) board = this.board;
		const pieceType = PIECE_VALUES[piece].toLowerCase();
		const deltaRow = to.row - from.row;
		const deltaCol = to.col - from.col;

		switch (pieceType) {
			case 'p':
				const isWhite = this.isWhitePiece(piece);
				const direction = isWhite ? -1 : 1;
				return deltaRow === direction && Math.abs(deltaCol) === 1;
			case 'r':
				return (deltaRow === 0 || deltaCol === 0) && this.isPathClearForAttack(from, to, board);
			case 'n':
				return Math.abs(deltaRow) === 2 && Math.abs(deltaCol) === 1 ||
					   Math.abs(deltaRow) === 1 && Math.abs(deltaCol) === 2;
			case 'b':
				return Math.abs(deltaRow) === Math.abs(deltaCol) && this.isPathClearForAttack(from, to, board);
			case 'q':
				return ((deltaRow === 0 || deltaCol === 0) || Math.abs(deltaRow) === Math.abs(deltaCol)) &&
					   this.isPathClearForAttack(from, to, board);
			case 'k':
				return Math.abs(deltaRow) <= 1 && Math.abs(deltaCol) <= 1;
		}
		return false;
	}

	isPathClearForAttack(from, to, board) {
		const deltaRow = to.row - from.row;
		const deltaCol = to.col - from.col;
		const stepRow = deltaRow === 0 ? 0 : deltaRow / Math.abs(deltaRow);
		const stepCol = deltaCol === 0 ? 0 : deltaCol / Math.abs(deltaCol);

		let currentRow = from.row + stepRow;
		let currentCol = from.col + stepCol;

		while (currentRow !== to.row || currentCol !== to.col) {
			if (board[currentRow][currentCol] !== null) return false;
			currentRow += stepRow;
			currentCol += stepCol;
		}
		return true;
	}

	copyBoard() {
		return this.board.map(row => [...row]);
	}

	makeMove(move, board) {
		if (!board) board = this.board;
		const { from, to, promotion } = move;
		const piece = board[from.row][from.col];
		
		if (PIECE_VALUES[piece].toLowerCase() === 'p' && 
			this.enPassant && to.row === this.enPassant.row && to.col === this.enPassant.col) {
			const capturedPawnRow = this.currentPlayer === 0 ? to.row + 1 : to.row - 1;
			board[capturedPawnRow][to.col] = null;
		}

		if (PIECE_VALUES[piece].toLowerCase() === 'k' && Math.abs(to.col - from.col) === 2) {
			const isKingSide = to.col > from.col;
			const rookFromCol = isKingSide ? 7 : 0;
			const rookToCol = isKingSide ? 5 : 3;
			const rook = board[from.row][rookFromCol];
			board[from.row][rookToCol] = rook;
			board[from.row][rookFromCol] = null;
		}

		board[to.row][to.col] = piece;
		board[from.row][from.col] = null;

		if (promotion && PIECE_VALUES[piece].toLowerCase() === 'p') {
			const isWhite = this.isWhitePiece(piece);
			const promotedPieces = {
				'Q': isWhite ? PIECES.WHITE.QUEEN : PIECES.BLACK.QUEEN,
				'R': isWhite ? PIECES.WHITE.ROOK : PIECES.BLACK.ROOK,
				'B': isWhite ? PIECES.WHITE.BISHOP : PIECES.BLACK.BISHOP,
				'N': isWhite ? PIECES.WHITE.KNIGHT : PIECES.BLACK.KNIGHT
			};
			board[to.row][to.col] = promotedPieces[promotion];
		}
	}

	updateGameState(move) {
		const { from, to } = move;
		const piece = this.board[from.row][from.col];
		const pieceType = PIECE_VALUES[piece].toLowerCase();

		if (pieceType === 'k') {
			const color = this.currentPlayer === 0 ? 'white' : 'black';
			this.castling[color].kingside = false;
			this.castling[color].queenside = false;
		}
		if (pieceType === 'r') {
			const color = this.currentPlayer === 0 ? 'white' : 'black';
			if (from.col === 0) this.castling[color].queenside = false;
			if (from.col === 7) this.castling[color].kingside = false;
		}

		if (pieceType === 'p' && Math.abs(to.row - from.row) === 2) {
			this.enPassant = { row: (from.row + to.row) / 2, col: from.col };
		} else {
			this.enPassant = null;
		}

		if (pieceType === 'p' || this.board[to.row][to.col] !== null) {
			this.halfMoveClock = 0;
		} else {
			this.halfMoveClock++;
		}

		if (this.currentPlayer === 1) {
			this.fullMoveNumber++;
		}
	}

	playMove(user, moveStr) {
		if (this.gameOver) return { success: false, error: 'Game is already over' };
		if (user !== this.getCurrentPlayerName()) {
			return { success: false, error: 'Not your turn' };
		}

		const move = this.parseMove(moveStr);
		if (!move) {
			return { success: false, error: 'Invalid move format. Use format like "e2-e4" or "e2 to e4"' };
		}

		if (!this.isValidMove(move)) {
			return { success: false, error: 'Invalid move' };
		}

		this.updateGameState(move);
		this.makeMove(move);
		this.moveHistory.push({
			move: moveStr,
			player: user,
			notation: `${this.coordsToAlgebraic(move.from.row, move.from.col)}-${this.coordsToAlgebraic(move.to.row, move.to.col)}`
		});
		this.lastMove = move;

		this.currentPlayer = 1 - this.currentPlayer;

		this.checkGameEnd();

		return { success: true };
	}

	checkGameEnd() {
		if (!this.hasValidMoves()) {
			if (this.isInCheck(this.currentPlayer)) {
				this.gameOver = true;
				this.winner = this.players[1 - this.currentPlayer];
			} else {
				this.gameOver = true;
				this.winner = 'draw';
			}
		}

		if (this.halfMoveClock >= 50) {
			this.gameOver = true;
			this.winner = 'draw';
		}
	}

	hasValidMoves() {
		for (let fromRow = 0; fromRow < 8; fromRow++) {
			for (let fromCol = 0; fromCol < 8; fromCol++) {
				const piece = this.board[fromRow][fromCol];
				if (piece && this.getPieceColor(piece) === this.currentPlayer) {
					for (let toRow = 0; toRow < 8; toRow++) {
						for (let toCol = 0; toCol < 8; toCol++) {
							const move = {
								from: { row: fromRow, col: fromCol },
								to: { row: toRow, col: toCol }
							};
							if (this.isValidMove(move)) {
								return true;
							}
						}
					}
				}
			}
		}
		return false;
	}

	getBoardHTML() {
		let html = '<div style="font-family: monospace; border: 2px solid #8B4513; background: #DEB887; padding: 5px; display: inline-block;">';
		html += '<div style="text-align: center; font-weight: bold; margin-bottom: 5px;">Chess Game</div>';
		
		html += '<div style="margin-left: 15px;">';
		for (let i = 0; i < 8; i++) {
			html += `<span style="display: inline-block; width: 25px; text-align: center; font-weight: bold;">${String.fromCharCode(97 + i)}</span>`;
		}
		html += '</div>';

		for (let row = 0; row < 8; row++) {
			html += '<div style="margin: 1px 0;">';
			html += `<span style="display: inline-block; width: 15px; text-align: center; font-weight: bold;">${8 - row}</span>`;
			
			for (let col = 0; col < 8; col++) {
				const isLight = (row + col) % 2 === 0;
				const bgColor = isLight ? '#F0D9B5' : '#B58863';
				const piece = this.board[row][col] || '&nbsp;';
				
				let highlight = '';
				if (this.lastMove) {
					if ((row === this.lastMove.from.row && col === this.lastMove.from.col) ||
						(row === this.lastMove.to.row && col === this.lastMove.to.col)) {
						highlight = '; box-shadow: inset 0 0 3px #FFD700';
					}
				}
				
				html += `<span style="display: inline-block; width: 25px; height: 25px; background: ${bgColor}; text-align: center; line-height: 25px; font-size: 16px; border: 1px solid #999${highlight}">${piece}</span>`;
			}
			
			html += `<span style="display: inline-block; width: 15px; text-align: center; font-weight: bold;">${8 - row}</span>`;
			html += '</div>';
		}

		html += '<div style="margin-left: 15px;">';
		for (let i = 0; i < 8; i++) {
			html += `<span style="display: inline-block; width: 25px; text-align: center; font-weight: bold;">${String.fromCharCode(97 + i)}</span>`;
		}
		html += '</div>';
		
		html += '</div>';
		return html;
	}

	getGameInfo() {
		let info = `**Current Turn:** ${this.getCurrentPlayerColor()} (${this.getCurrentPlayerName()})`;
		info += `<br>**Move #:** ${this.fullMoveNumber}`;
		
		if (this.isInCheck(this.currentPlayer)) {
			info += '<br><strong style="color: red;">CHECK!</strong>';
		}
		
		if (this.gameOver) {
			if (this.winner === 'draw') {
				info += '<br><strong style="color: blue;">Game ended in a draw!</strong>';
			} else {
				info += `<br><strong style="color: green;">${this.winner} wins!</strong>`;
			}
		}
		
		return info;
	}
}

exports.setup = function (App) {
	const ChessManager = {
		games: new Map(),
		
		startGame: function (room, players) {
			if (this.games.has(room)) {
				return { success: false, error: 'Game already running in this room' };
			}
			
			const game = new ChessGame(room, players, App);
			this.games.set(room, game);
			return { success: true, game };
		},
		
		endGame: function (room) {
			if (!this.games.has(room)) {
				return { success: false, error: 'No game running in this room' };
			}
			
			this.games.delete(room);
			return { success: true };
		},
		
		getGame: function (room) {
			return this.games.get(room);
		},
		
		playMove: function (room, user, move) {
			const game = this.games.get(room);
			if (!game) {
				return { success: false, error: 'No game running in this room' };
			}
			
			return game.playMove(user, move);
		},
		
		showBoard: function (room) {
			const game = this.games.get(room);
			if (!game) {
				return { success: false, error: 'No game running in this room' };
			}
			
			return {
				success: true,
				board: game.getBoardHTML(),
				info: game.getGameInfo()
			};
		},
		
		addSpectator: function (room, user) {
			const game = this.games.get(room);
			if (game) {
				game.spectators.add(user);
				return true;
			}
			return false;
		}
	};

	return ChessManager;
};