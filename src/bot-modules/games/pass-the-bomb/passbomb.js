/**
 * Pass The Bomb
 */

'use strict';

const Wait_Interval = 2000;
const Min_Round_Duration = 16000;
const Round_Duration_Increment = 8000;

const Path = require('path');

const Text = Tools.get('text.js');
const Chat = Tools.get('chat.js');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'passbomb.translations'));

function getLanguage(room) {
	return App.config.language.rooms[room] || App.config.language['default'];
}

class PassBomb {
	constructor(room, maxPlayers) {
		this.room = room;

		this.players = {};
		this.maxPlayers = maxPlayers || 0;
		this.playerWithBomb = '';

		this.timer = null;
		this.waitTime = Wait_Interval;

		this.lang = getLanguage(this.room);
	}

	send(txt) {
		App.bot.sendTo(this.room, txt);
	}

	start() {
		this.status = 'signups';
		this.send(Chat.bold(translator.get("init", this.lang)) + " " + translator.get("init2", this.lang) + " " +
			Chat.code((App.config.parser.tokens[0] || "") + "in") + " " + translator.get("init3", this.lang) + " " +
			Chat.code((App.config.parser.tokens[0] || "") + "start") + " " + translator.get("init4", this.lang));
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
		if (Object.keys(this.players).length < 2) {
			this.send(translator.get('starterr', this.lang));
			return;
		}
		this.status = 'started';
		this.newRound();
	}

	wait() {
		this.status = 'wait';
		this.timer = setTimeout(this.newRound.bind(this), this.waitTime);
	}

	newRound() {
		this.timer = null;
		let players = Object.values(this.players);
		let cmds = [];
		if (players.length < 2) {
			return this.end(players[0]);
		} else {
			let txt = Chat.bold("Pass-The-Bomb") + " | " + translator.get("players", this.lang) + " (" + players.length + "): ";
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
		}
		let playersIds = Object.keys(this.players);
		this.playerWithBomb = playersIds[Math.floor(Math.random() * playersIds.length)];
		this.status = 'round';
		cmds.push(Chat.bold(this.players[this.playerWithBomb]) + " " + translator.get("round", this.lang) + " " +
			translator.get("help", this.lang) + " " + Chat.code((App.config.parser.tokens[0] || "") + "pass " +
			translator.get("help2", this.lang)) + " " + translator.get("help3", this.lang));
		this.send(cmds);
		this.timer = setTimeout(this.bomb.bind(this), Math.floor(Math.random() * Round_Duration_Increment) + Min_Round_Duration);
	}

	pass(ident, to) {
		if (this.status !== 'round') return;
		to = Text.toId(to);
		if (ident.id !== this.playerWithBomb) {
			if (this.players[to]) {
				this.dq(ident);
			}
			return;
		}
		if (this.players[to]) {
			this.playerWithBomb = to;
		}
	}

	bomb() {
		this.timer = null;
		this.status = 'bomb';
		this.send(Chat.bold("BOMB!") + " " + this.players[this.playerWithBomb] + " " + translator.get("lose", this.lang));
		delete this.players[this.playerWithBomb];
		this.wait();
	}

	dq(ident) {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		this.status = 'dq';
		this.send(this.players[ident.id] + " " + translator.get("lose2", this.lang));
		delete this.players[ident.id];
		this.wait();
	}

	end(winner) {
		this.status = 'end';
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		let txt = '';
		txt += Chat.bold(translator.get(11, this.lang)) + ' ';
		if (winner) {
			txt += translator.get(12, this.lang) + ' ' + Chat.bold(winner) + ' ' + translator.get(13, this.lang);
		}
		this.send(txt);
		App.modules.games.system.terminateGame(this.room);
	}

	destroy() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}
}

module.exports = PassBomb;
