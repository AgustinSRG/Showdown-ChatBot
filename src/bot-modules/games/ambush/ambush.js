/**
 * Ambush
 */

'use strict';

const Path = require('path');

const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'ambush.translations');

exports.setup = function (App) {
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

		mlt(key, vars) {
			return App.multilang.mlt(Lang_File, this.lang, key, vars);
		}

		send(txt) {
			App.bot.sendTo(this.room, txt);
		}

		start() {
			this.hand = this.chatHandler.bind(this);
			App.bot.on('userchat', this.hand);
			let txt = '';
			txt += Chat.bold(this.mlt(0)) + ' ' + this.mlt(1) + ' ' + Chat.code('/me in') + ' ' +
			this.mlt(2) + '! ';
			txt += this.mlt(3) + ' ' + Chat.code(this.mlt(4)) + ', ' + this.mlt(5) + '. ';
			txt += this.mlt(1) + ' ' + Chat.code((App.config.parser.tokens[0] || "") + 'start') +
			' ' + this.mlt(6) + '.';
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
				this.send(this.mlt('starterr'));
				return;
			}
			this.status = 'fight';
			let txt = '';
			txt += '' + Chat.bold(this.mlt(7)) + ' ' + this.mlt(1) +
			' ' + Chat.code(this.mlt(4)) + ' ' + this.mlt(8);
			this.send(txt);
		}

		fire(ident1, victim) {
			if (this.status !== 'fight') return;
			if (!this.players[ident1.id] || !this.players[victim]) return;
			let name = this.players[victim];
			delete this.players[victim];
			this.send(Chat.bold('Ambush:') + ' ' + Chat.italics(name) + ' ' + this.mlt(9) + ' ' +
			Chat.italics(ident1.name) + ' ' + this.mlt(10) + '!');
			let players = Object.keys(this.players);
			if (players.length <= 1) {
				this.end(this.players[players[0]]);
			}
		}

		end(winner) {
			this.status = 'end';
			let txt = '';
			txt += this.mlt(11) + ' ';
			if (winner) {
				txt += this.mlt(12) + ' ' + Chat.bold(winner) + ' ' + this.mlt(13) + '!';
			}
			this.send(txt);
			App.modules.games.system.terminateGame(this.room);
		}

		destroy() {
			App.bot.removeListener('userchat', this.hand);
		}
	}

	return Ambush;
};
