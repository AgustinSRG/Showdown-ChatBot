/**
 * Blackjack
 */

'use strict';

const Wait_Interval = 2000;

const Path = require('path');
const Chat = Tools('chat');
const randomize = Tools('randomize');

const Lang_File = Path.resolve(__dirname, 'blackjack.translations');

exports.setup = function (App) {
	function getLanguage(room) {
		return App.config.language.rooms[room] || App.config.language['default'];
	}

	function generateDeck() {
		let deck = [];
		let cards = ['\u2660', '\u2663', '\u2665', '\u2666'];
		let values = ['A', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K'];
		for (let i = 0; i < cards.length; i++) {
			for (let j = 0; j < values.length; j++) {
				deck.push({card: cards[i], value: values[j]});
			}
		}
		return randomize(deck);
	}

	function formateHand(hand, total, str1) {
		let txt = "";
		for (let i = 0; i < hand.length; i++) {
			txt += Chat.bold("[" + hand[i].card + hand[i].value + "]") + " ";
		}
		txt += " " + str1 + ": " + Chat.bold(total);
		return txt;
	}

	function joinArray(arr, str1) {
		if (!arr.length) return '';
		let txt = Chat.bold(arr[0]);
		if (arr.length > 1) {
			for (let i = 1; i < arr.length - 1; i++) {
				txt += ", " + Chat.bold(arr[i]);
			}
			txt += " " + str1 + " " + Chat.bold(arr[arr.length - 1]);
		}
		return txt;
	}

	class Blackjack {
		constructor(room, maxPlayers, turnTime) {
			this.room = room;

			this.players = {};
			this.turns = [];
			this.turn = -1;
			this.currPlayer = null;
			this.timer = null;

			this.status = 'init';
			this.maxPlayers = maxPlayers || 0;

			this.deck = generateDeck();
			this.deckIndex = -1;
			this.dealerHand = [];

			this.waitTime = Wait_Interval;
			this.turnTime = turnTime || 30000;

			this.lang = getLanguage(this.room);
		}

		mlt(key, vars) {
			return App.multilang.mlt(Lang_File, this.lang, key, vars);
		}

		send(txt) {
			App.bot.sendTo(this.room, txt);
		}

		getNextCard() {
			this.deckIndex++;
			if (this.deckIndex >= this.deck.length) {
				this.deckIndex = 0;
			}
			return this.deck[this.deckIndex];
		}

		getHandValue(hand) {
			let value = 0;
			let AS = 0;
			for (let i = 0; i < hand.length; i++) {
				if (typeof hand[i].value === "number") {
					value += hand[i].value;
				} else if (hand[i].value in {"J": 1, "Q": 1, "K": 1}) {
					value += 10;
				} else if (hand[i].value === "A") {
					value += 1;
					AS++;
				}
			}
			for (let j = 0; j < AS; j++) {
				if ((value + 10) <= 21) value += 10;
			}
			return value;
		}

		start() {
			this.status = 'signups';
			this.send(Chat.bold(this.mlt("init")) + " " + this.mlt("init2") + " " +
			Chat.code((App.config.parser.tokens[0] || "") + "in") + " " + this.mlt("init3") + " " +
			Chat.code((App.config.parser.tokens[0] || "") + "start") + " " + this.mlt("init4"));
		}

		userJoin(ident) {
			if (this.status !== 'signups') return;
			if (!this.players[ident.id]) {
				this.players[ident.id] = ident.name;
				if (this.maxPlayers && Object.keys(this.players).length >= this.maxPlayers) {
					this.startGame();
				}
			}
		}

		userLeave(ident) {
			if (this.status !== 'signups') return;
			delete this.players[ident.id];
		}

		startGame() {
			if (this.status !== 'signups') return;
			if (Object.keys(this.players).length < 1) return;
			this.status = 'started';
			let players = [];
			for (let i in this.players) {
				players.push({id: i, name: this.players[i], hand: []});
			}
			this.turns = randomize(players);
			this.turn = -1;
			this.dealerHand = [this.getNextCard(), this.getNextCard()];
			let txt = '';
			txt += Chat.bold(this.mlt("start")) + " " + this.mlt("topcard") +
			": " + Chat.bold("[" + this.dealerHand[0].card + this.dealerHand[0].value + "]");
			this.send(txt);
			this.wait();
		}

		wait() {
			this.status = 'wait';
			this.timer = setTimeout(this.nextTurn.bind(this), this.waitTime);
		}

		nextTurn() {
			this.timer = null;
			if (this.turn >= this.turns.length) {
				this.end();
				return;
			}
			this.turn++;
			if (this.turn >= this.turns.length) {
				this.dealerTurn();
				return;
			}
			this.currPlayer = this.turns[this.turn];
			this.currPlayer.hand = [this.getNextCard(), this.getNextCard()];
			this.status = 'turn';
			let cmds = [];
			cmds.push(Chat.bold("Blackjack:") + " " + this.mlt("turn1") + " " + this.currPlayer.name +
			this.mlt("turn2") + " " + this.mlt("helpturn1") + " " +
			Chat.code((App.config.parser.tokens[0] || "") + "hit") + " " + this.mlt("helpturn2") + " " +
			Chat.code((App.config.parser.tokens[0] || "") + "stand") + " " + this.mlt("helpturn3") +
			" " + Math.floor(this.turnTime / 1000).toString() + " " + this.mlt("helpturn4"));
			cmds.push(Chat.bold("Blackjack:") + " " + this.mlt("hand1") + " " + this.currPlayer.name + "" +
			this.mlt("hand2") + ": " +
			formateHand(this.currPlayer.hand, this.getHandValue(this.currPlayer.hand), this.mlt("total")));
			this.send(cmds);
			this.timer = setTimeout(this.timeout.bind(this), this.turnTime);
		}

		dealerTurn() {
			this.status = 'dealer';
			let cmds = [];
			cmds.push(Chat.bold("Blackjack:") + " " + this.mlt("dhand") + ": " +
			formateHand(this.dealerHand, this.getHandValue(this.dealerHand), this.mlt("total")));
			let dealerTotal = this.getHandValue(this.dealerHand);
			if (dealerTotal >= 17) {
				cmds.push(Chat.bold("Blackjack:") + " " + this.mlt("dealer") + " " + this.mlt("stand") + "!");
			} else {
				this.dealerHand.push(this.getNextCard());
				cmds.push(Chat.bold("Blackjack:") + " " + this.mlt("dealer") + " " + this.mlt("hit") + ": " +
				formateHand(this.dealerHand, this.getHandValue(this.dealerHand), this.mlt("total")));
			}
			let handval = this.getHandValue(this.dealerHand);
			if (handval === 21) {
				cmds.push(Chat.bold("Blackjack:") + " " + this.mlt("dbj"));
			} else if (handval > 21) {
				cmds.push(Chat.bold("Blackjack:") + " " + this.mlt("dbust1") + " " + handval + ". " +
				this.mlt("dbust2"));
			}
			this.send(cmds);
			this.wait();
		}

		hit(ident) {
			if (this.status !== 'turn') return;
			if (ident.id !== this.currPlayer.id) return;
			this.currPlayer.hand.push(this.getNextCard());
			let cmds = [];
			let endTurn = false;
			cmds.push(Chat.bold("Blackjack:") + " " + this.currPlayer.name + " " + this.mlt("hit") + ": " +
			formateHand(this.currPlayer.hand, this.getHandValue(this.currPlayer.hand), this.mlt("total")));
			let handval = this.getHandValue(this.currPlayer.hand);
			if (handval === 21) {
				cmds.push(Chat.bold("Blackjack:") + " " + this.currPlayer.name + " " + this.mlt("bj") + "!");
				endTurn = true;
			} else if (handval > 21) {
				cmds.push(Chat.bold("Blackjack:") + " " + this.currPlayer.name + " " + this.mlt("bust") + " " + handval + "");
				endTurn = true;
			}
			if (endTurn) {
				this.status = 'wait';
				if (this.timer) {
					clearTimeout(this.timer);
					this.timer = null;
				}
			}
			this.send(cmds);
			if (endTurn) {
				this.wait();
			}
		}

		stand(ident) {
			if (this.status !== 'turn') return;
			if (ident.id !== this.currPlayer.id) return;
			this.status = 'wait';
			let cmds = [];
			cmds.push(Chat.bold("Blackjack:") + " " + this.currPlayer.name + " " + this.mlt("stand") + "!");
			let handval = this.getHandValue(this.currPlayer.hand);
			if (handval === 21) {
				cmds.push(Chat.bold("Blackjack:") + " " + this.currPlayer.name + " " + this.mlt("bj") + "!");
			} else if (handval > 21) {
				cmds.push(Chat.bold("Blackjack:") + " " + this.currPlayer.name + " " + this.mlt("bust") + " " + handval + "");
			}
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
			this.send(cmds);
			this.wait();
		}

		showHand(ident) {
			if (this.status !== 'turn') return;
			if (ident.id !== this.currPlayer.id) return;
			this.send('/msg ' + ident.id + ', ' + Chat.bold("Blackjack:") + " " +
			formateHand(this.currPlayer.hand, this.getHandValue(this.currPlayer.hand), this.mlt("total")));
		}

		timeout() {
			this.status = 'timeout';
			this.timer = null;
			let cmds = [];
			cmds.push(Chat.bold("Blackjack:") + " " + this.mlt("timeout1") + " " +
			this.currPlayer.name + " " + this.mlt("timeout2"));
			let handval = this.getHandValue(this.currPlayer.hand);
			if (handval === 21) {
				cmds.push(Chat.bold("Blackjack:") + " " + this.currPlayer.name + " " + this.mlt("bj") + "!");
			} else if (handval > 21) {
				cmds.push(Chat.bold("Blackjack:") + " " + this.currPlayer.name + " " + this.mlt("bust") + " " + handval + "");
			}
			this.send(cmds);
			this.wait();
		}

		end(forced) {
			this.status = 'end';
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
			if (forced) {
				this.send(this.mlt("forceend"));
				App.modules.games.system.terminateGame(this.room);
				return;
			}
			let naturals = [], winners = [];
			let dealerTotal = this.getHandValue(this.dealerHand);
			if (dealerTotal > 21) dealerTotal = 0;
			for (let i = 0; i < this.turns.length; i++) {
				let value = this.getHandValue(this.turns[i].hand);
				if (value > 21) continue;
				if (value === 21) naturals.push(this.turns[i].name);
				if (value > dealerTotal) winners.push(this.turns[i].name);
			}
			let cmds = [];
			if (naturals.length) {
				cmds.push(this.mlt("grats1") + " " +
				joinArray(naturals, this.mlt("and")) + " " + this.mlt("natural") + "!");
			}
			let txt = Chat.bold(this.mlt("end"));
			if (winners.length) {
				txt += " " + this.mlt("grats1") + " " +
				joinArray(winners, this.mlt("and")) + " " + this.mlt("grats2") + "!";
			} else {
				txt += " " + this.mlt("lose");
			}
			while (txt.length > 300) {
				cmds.push(txt.substr(0, 300));
			}
			if (txt.length > 0) {
				cmds.push(txt);
			}
			this.send(cmds);
			App.modules.games.system.terminateGame(this.room);
		}

		destroy() {
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
		}
	}

	return Blackjack;
};
