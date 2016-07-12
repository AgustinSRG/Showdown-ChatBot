/*
 * Poke-Anagrams
 */

'use strict';

const Wait_Time = 2000;
const Default_Answer_Time = 30 * 1000;

const Path = require('path');

const Text = Tools.get('text.js');
const Translator = Tools.get('translate.js');
const normalize = Tools.get('normalize.js');
const PokeRand = require(Path.resolve(__dirname, 'pokerand.js'));

const translator = new Translator(Path.resolve(__dirname, 'poke-anagrams.translations'));

function toWordId(str) {
	if (!str) return '';
	str = normalize(str);
	return str.toLowerCase().replace(/[^a-z0-9\u00f1]/g, '');
}

function getLanguage(room) {
	return App.config.language.rooms[room] || App.config.language['default'];
}

class PokeAnagrams {
	constructor(room, games, maxpoints, ansTime) {
		this.room = room;
		this.lang = getLanguage(this.room);
		this.games = games || 0;
		this.maxpoints = maxpoints || 0;
		this.ansTime = ansTime || Default_Answer_Time;

		this.status = 'new';
		this.word = '';
		this.wordId = '';
		this.randomizedChars = [];
		this.clue = '';

		this.ngame = 0;
		this.points = {};
		this.names = {};
		this.timer = null;
	}

	send(txt) {
		App.bot.sendTo(this.room, txt);
	}

	start() {
		let txt = translator.get(0, this.lang) + ". ";
		if (this.games) {
			txt += translator.get(1, this.lang) + " " + this.games + " " + translator.get(2, this.lang) + ". ";
		}
		if (this.maxpoints) {
			txt += translator.get(3, this.lang) + " " + this.maxpoints + " " + translator.get(4, this.lang) + ". ";
		}
		txt += translator.get(5, this.lang) + " " + Math.floor(this.ansTime / 1000) + " " + translator.get(6, this.lang) + ". ";
		txt += translator.get(7, this.lang) + " ``" + (App.config.parser.tokens[0] || "") +
			translator.get(8, this.lang) + "`` " + translator.get(9, this.lang) + ".";
		this.send(txt);
		this.status = 'start';
		this.wait();
	}

	wait() {
		this.status = 'wait';
		this.ngame++;
		this.timer = setTimeout(this.nextAnswer.bind(this), Wait_Time);
	}

	nextAnswer() {
		this.timer = null;
		if (this.games && this.ngame > this.games) {
			return this.end();
		}
		if (this.maxpoints) {
			for (let k in this.points) {
				if (this.points[k] >= this.maxpoints) {
					return this.end();
				}
			}
		}
		let question = PokeRand.random();
		this.clue = question.clue;
		this.word = question.word;
		this.wordId = toWordId(this.word);
		this.randomizedChars = [];
		for (let i = 0; i < this.wordId.length; i++) {
			this.randomizedChars.push(this.wordId.charAt(i).toUpperCase());
		}
		this.randomizedChars = this.randomizedChars.randomize();
		this.status = 'question';
		this.send("**Poke-Anagrams:** " + this.randomizedChars.join(', ') + ' | **' + this.clue + '**');
		this.timer = setTimeout(this.timeout.bind(this), this.ansTime);
	}

	timeout() {
		this.status = 'wait';
		this.timer = null;
		this.send(translator.get(10, this.lang) + ": __" + this.word + "__");
		this.wait();
	}

	guess(user, word) {
		let ident = Text.parseUserIdent(user);
		word = toWordId(word);
		if (this.status !== 'question') return;
		if (this.wordId === word) {
			this.status = 'wait';
			clearTimeout(this.timer);
			this.timer = null;
			if (!this.points[ident.id]) this.points[ident.id] = 0;
			this.points[ident.id]++;
			this.names[ident.id] = ident.name;
			this.send(translator.get(11, this.lang) + "! **" + ident.name + "** " + translator.get(12, this.lang) + ": __" +
				this.word + "__. " + translator.get(13, this.lang) + ": " + this.points[ident.id]);
			this.wait();
		}
	}

	end() {
		this.status = 'end';
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		let m = 0, winner = null;
		for (let user in this.points) {
			if (this.points[user] > m) {
				m = this.points[user];
				winner = user;
			}
		}
		if (winner) {
			this.send(translator.get(14, this.lang) + "! " + translator.get(15, this.lang) + " **" + this.names[winner] +
				"** " + translator.get(16, this.lang) + " __" + this.points[winner] + "__ " + translator.get(17, this.lang) + "!");
		} else {
			this.send(translator.get(14, this.lang) + "!");
		}

		App.modules.games.system.terminateGame(this.room);
	}

	destroy() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}
}

module.exports = PokeAnagrams;
