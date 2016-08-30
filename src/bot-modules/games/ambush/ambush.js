/**
 * Ambush
 */

'use strict';

const Path = require('path');

const Text = Tools.get('text.js');
const Chat = Tools.get('chat.js');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'ambush.translations'));

function getLanguage(room) {
	return App.config.language.rooms[room] || App.config.language['default'];
}

class Ambush {
	constructor(room, maxPlayers) {
		this.room = room;
		this.players = {};
		this.status = 'init';
		this.maxPlayers = maxPlayers || 0;
		this.lang = getLanguage(this.room);
	}

	send(txt) {
		App.bot.sendTo(this.room, txt);
	}

	start() {
		this.hand = this.chatHandler.bind(this);
		App.bot.on('userchat', this.hand);
		let txt = '';
		txt += Chat.bold(translator.get(0, this.lang)) + ' ' + translator.get(1, this.lang) + ' ' + Chat.code('/me in') + ' ' +
			translator.get(2, this.lang) + '! ';
		txt += translator.get(3, this.lang) + ' ' + Chat.code(translator.get(4, this.lang)) + ', ' + translator.get(5, this.lang) + '. ';
		txt += translator.get(1, this.lang) + ' ' + Chat.code((App.config.parser.tokens[0] || "") + 'start') +
			' ' + translator.get(6, this.lang) + '.';
		this.status = 'signups';
		this.send(txt);
	}

	chatHandler(room, time, by, msg) {
		if (room !== this.room) return;
		let ident = Text.parseUserIdent(by);
		if (msg.indexOf('/me ') === 0) {
			let args = msg.substr(4).split(' ');
			let cmd = args.shift();
			switch (Text.toId(cmd)) {
			case 'in':
				this.userJoin(ident);
				break;
			case 'out':
				this.userLeave(ident);
				break;
			case 'fires':
				let victim = Text.toId(args.join(' '));
				if (!victim) return;
				this.fire(ident, victim);
				break;
			}
		}
	}

	userJoin(ident) {
		if (this.status !== 'signups') return;
		if (!this.players[ident.id]) {
			this.players[ident.id] = ident.name;
			if (this.maxPlayers && Object.keys(this.players).length >= this.maxPlayers) {
				this.startFight();
			}
		}
	}

	userLeave(ident) {
		if (this.status !== 'signups') return;
		delete this.players[ident.id];
	}

	startFight() {
		if (this.status !== 'signups') return;
		if (Object.keys(this.players).length < 2) {
			this.send(translator.get('starterr', this.lang));
			return;
		}
		this.status = 'fight';
		let txt = '';
		txt += '' + Chat.bold(translator.get(7, this.lang)) + ' ' + translator.get(1, this.lang) +
			' ' + Chat.code(translator.get(4, this.lang)) + ' ' + translator.get(8, this.lang);
		this.send(txt);
	}

	fire(ident1, victim) {
		if (this.status !== 'fight') return;
		if (!this.players[ident1.id] || !this.players[victim]) return;
		let name = this.players[victim];
		delete this.players[victim];
		this.send(Chat.bold('Ambush:') + ' ' + Chat.italics(name) + ' ' + translator.get(9, this.lang) + ' ' +
			Chat.italics(ident1.name) + ' ' + translator.get(10, this.lang) + '!');
		let players = Object.keys(this.players);
		if (players.length <= 1) {
			this.end(this.players[players[0]]);
		}
	}

	end(winner) {
		this.status = 'end';
		let txt = '';
		txt += translator.get(11, this.lang) + ' ';
		if (winner) {
			txt += translator.get(12, this.lang) + ' ' + Chat.bold(winner) + ' ' + translator.get(13, this.lang) + '!';
		}
		this.send(txt);
		App.modules.games.system.terminateGame(this.room);
	}

	destroy() {
		App.bot.removeListener('userchat', this.hand);
	}
}

module.exports = Ambush;
