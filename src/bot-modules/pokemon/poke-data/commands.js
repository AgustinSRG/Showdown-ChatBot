/**
 * Commands File
 */

'use strict';

const Path = require('path');

const getGeneration = require(Path.resolve(__dirname, 'gen.js'));
const Moves = require(Path.resolve(__dirname, 'moves.js'));

const Text = Tools.get('text.js');
const Chat = Tools.get('chat.js');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));

module.exports = {
	gen: function (App) {
		let id = Text.toId(this.arg);
		if (!id) return this.errorReply(this.usage({desc: translator.get(17, this.lang)}));
		let gen;
		try {
			let aliases = App.data.getAliases();
			if (aliases[id]) id = Text.toId(aliases[id]);
			gen = getGeneration(id, App);
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(translator.get('error', this.lang));
		}
		let text = '';
		switch (gen.gen) {
		case 'metronome':
			text = translator.get(0, this.lang);
			break;
		case 0:
			text = translator.get(1, this.lang) + " " + Chat.italics(id) + " " + translator.get(2, this.lang);
			break;
		default:
			text = translator.get(3, this.lang) + " " + Chat.italics(gen.name) + ": " + translator.get(4, this.lang) + " " + Chat.italics(gen.gen);
		}
		this.restrictReply(text, 'pokemon');
	},

	viablemoves: 'randommoves',
	randommoves: function (App) {
		if (!this.arg) return this.errorReply(this.usage({desc: 'pokemon'}, {desc: 'singles/doubles', optional: true}));
		let id = Text.toId(this.args[0]);
		let type = Text.toId(this.args[1]);
		if (!id) return this.errorReply(this.usage({desc: 'pokemon'}, {desc: 'singles/doubles', optional: true}));
		let doubles;
		if (type in {'doubles': 1, '2': 1, 'double': 1, 'triples': 1, 'triple': 1, '3': 1}) {
			type = 'randomDoubleBattleMoves';
			doubles = true;
		} else {
			type = 'randomBattleMoves';
			doubles = false;
		}
		let moves;
		try {
			let aliases = App.data.getAliases();
			if (aliases[id]) id = Text.toId(aliases[id]);
			moves = Moves.getRandomBattleMoves(id, type, App);
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(translator.get('error', this.lang));
		}
		if (moves === null) {
			return this.errorReply(translator.get(5, this.lang) + ' ' + Chat.italics(id) + '__ ' + translator.get(2, this.lang));
		} else if (!moves.length) {
			return this.errorReply(translator.get(6, this.lang) + ' ' + Chat.italics(Moves.getPokeName(id, App)));
		} else if (doubles) {
			return this.restrictReply(translator.get(7, this.lang) + ' ' + Chat.italics(Moves.getPokeName(id, App)) + ': ' + moves.join(', '), 'pokemon');
		} else {
			return this.restrictReply(translator.get(8, this.lang) + ' ' + Chat.italics(Moves.getPokeName(id, App)) + ': ' + moves.join(', '), 'pokemon');
		}
	},

	priority: function (App) {
		if (!this.arg) return this.errorReply(this.usage({desc: 'pokemon'}));
		let id = Text.toId(this.args[0]);
		if (!id) return this.errorReply(this.usage({desc: 'pokemon'}));
		let moves;
		try {
			let aliases = App.data.getAliases();
			if (aliases[id]) id = Text.toId(aliases[id]);
			moves = Moves.getPriorityMoves(id, App);
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(translator.get('error', this.lang));
		}
		if (moves === null) {
			return this.errorReply(translator.get(5, this.lang) + ' ' + Chat.italics(id) + ' ' + translator.get(2, this.lang));
		} else if (!moves.length) {
			return this.errorReply(translator.get(9, this.lang) + ' ' + Chat.italics(Moves.getPokeName(id, App)));
		} else {
			return this.restrictReply(translator.get(10, this.lang) + ' ' + Chat.italics(Moves.getPokeName(id, App)) + ': ' + moves.join(', '), 'pokemon');
		}
	},

	boosting: function (App) {
		if (!this.arg) return this.errorReply(this.usage({desc: 'pokemon'}));
		let id = Text.toId(this.args[0]);
		if (!id) return this.errorReply(this.usage({desc: 'pokemon'}));
		let moves;
		try {
			let aliases = App.data.getAliases();
			if (aliases[id]) id = Text.toId(aliases[id]);
			moves = Moves.getBoostingMoves(id, App);
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(translator.get('error', this.lang));
		}
		if (moves === null) {
			return this.errorReply(translator.get(5, this.lang) + ' ' + Chat.italics(id) + ' ' + translator.get(2, this.lang));
		} else if (!moves.length) {
			return this.errorReply(translator.get(11, this.lang) + ' ' + Chat.italics(Moves.getPokeName(id, App)));
		} else {
			return this.restrictReply(translator.get(12, this.lang) + ' ' + Chat.italics(Moves.getPokeName(id, App)) + ': ' + moves.join(', '), 'pokemon');
		}
	},

	recovery: function (App) {
		if (!this.arg) return this.errorReply(this.usage({desc: 'pokemon'}));
		let id = Text.toId(this.args[0]);
		if (!id) return this.errorReply(this.usage({desc: 'pokemon'}));
		let moves;
		try {
			let aliases = App.data.getAliases();
			if (aliases[id]) id = Text.toId(aliases[id]);
			moves = Moves.getRecoveryMoves(id, App);
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(translator.get('error', this.lang));
		}
		if (moves === null) {
			return this.errorReply(translator.get(5, this.lang) + ' ' + Chat.italics(id) + ' ' + translator.get(2, this.lang));
		} else if (!moves.length) {
			return this.errorReply(translator.get(13, this.lang) + ' ' + Chat.italics(Moves.getPokeName(id, App)));
		} else {
			return this.restrictReply(translator.get(14, this.lang) + ' ' + Chat.italics(Moves.getPokeName(id, App)) + ': ' + moves.join(', '), 'pokemon');
		}
	},

	hazards: function (App) {
		if (!this.arg) return this.errorReply(this.usage({desc: 'pokemon'}));
		let id = Text.toId(this.args[0]);
		if (!id) return this.errorReply(this.usage({desc: 'pokemon'}));
		let moves;
		try {
			let aliases = App.data.getAliases();
			if (aliases[id]) id = Text.toId(aliases[id]);
			moves = Moves.getHazardsMoves(id, App);
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(translator.get('error', this.lang));
		}
		if (moves === null) {
			return this.errorReply(translator.get(5, this.lang) + ' ' + Chat.italics(id) + ' ' + translator.get(2, this.lang));
		} else if (!moves.length) {
			return this.errorReply(translator.get(15, this.lang) + ' ' + Chat.italics(Moves.getPokeName(id, App)) + '');
		} else {
			return this.restrictReply(translator.get(16, this.lang) + ' ' + Chat.italics(Moves.getPokeName(id, App)) + ': ' + moves.join(', '), 'pokemon');
		}
	},
};
