/**
 * Commands File
 */

'use strict';

const Path = require('path');

const getGeneration = require(Path.resolve(__dirname, 'gen.js'));
const Moves = require(Path.resolve(__dirname, 'moves.js'));

const Text = Tools.get('text.js');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));

App.parser.addPermission('pokemon', {group: 'voice'});

module.exports = {
	gen: function () {
		let id = Text.toId(this.arg);
		if (!id) return this.errorReply(this.usage({desc: 'pokemon/item/ability/move'}));
		let gen;
		try {
			let aliases = App.data.getAliases();
			if (aliases[id]) id = Text.toId(aliases[id]);
			gen = getGeneration(id);
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
			text = translator.get(1, this.lang) + " __" + id + "__ " + translator.get(2, this.lang);
			break;
		default:
			text = translator.get(3, this.lang) + " __" + gen.name + "__: " + translator.get(4, this.lang) + " " + gen.gen;
		}
		this.restrictReply(text, 'pokemon');
	},

	viablemoves: 'randommoves',
	randommoves: function () {
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
			moves = Moves.getRandomBattleMoves(id, type);
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(translator.get('error', this.lang));
		}
		if (moves === null) {
			return this.errorReply(translator.get(5, this.lang) + ' __' + id + '__ ' + translator.get(2, this.lang));
		} else if (!moves.length) {
			return this.errorReply(translator.get(6, this.lang) + ' __' + Moves.getPokeName(id) + '__');
		} else if (doubles) {
			return this.restrictReply(translator.get(7, this.lang) + ' __' + Moves.getPokeName(id) + '__: ' + moves.join(', '), 'pokemon');
		} else {
			return this.restrictReply(translator.get(8, this.lang) + ' __' + Moves.getPokeName(id) + '__: ' + moves.join(', '), 'pokemon');
		}
	},

	priority: function () {
		if (!this.arg) return this.errorReply(this.usage({desc: 'pokemon'}));
		let id = Text.toId(this.args[0]);
		if (!id) return this.errorReply(this.usage({desc: 'pokemon'}));
		let moves;
		try {
			let aliases = App.data.getAliases();
			if (aliases[id]) id = Text.toId(aliases[id]);
			moves = Moves.getPriorityMoves(id);
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(translator.get('error', this.lang));
		}
		if (moves === null) {
			return this.errorReply(translator.get(5, this.lang) + ' __' + id + '__ ' + translator.get(2, this.lang));
		} else if (!moves.length) {
			return this.errorReply(translator.get(9, this.lang) + ' __' + Moves.getPokeName(id) + '__');
		} else {
			return this.restrictReply(translator.get(10, this.lang) + ' __' + Moves.getPokeName(id) + '__: ' + moves.join(', '), 'pokemon');
		}
	},

	boosting: function () {
		if (!this.arg) return this.errorReply(this.usage({desc: 'pokemon'}));
		let id = Text.toId(this.args[0]);
		if (!id) return this.errorReply(this.usage({desc: 'pokemon'}));
		let moves;
		try {
			let aliases = App.data.getAliases();
			if (aliases[id]) id = Text.toId(aliases[id]);
			moves = Moves.getBoostingMoves(id);
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(translator.get('error', this.lang));
		}
		if (moves === null) {
			return this.errorReply(translator.get(5, this.lang) + ' __' + id + '__ ' + translator.get(2, this.lang));
		} else if (!moves.length) {
			return this.errorReply(translator.get(11, this.lang) + ' __' + Moves.getPokeName(id) + '__');
		} else {
			return this.restrictReply(translator.get(12, this.lang) + ' __' + Moves.getPokeName(id) + '__: ' + moves.join(', '), 'pokemon');
		}
	},

	recovery: function () {
		if (!this.arg) return this.errorReply(this.usage({desc: 'pokemon'}));
		let id = Text.toId(this.args[0]);
		if (!id) return this.errorReply(this.usage({desc: 'pokemon'}));
		let moves;
		try {
			let aliases = App.data.getAliases();
			if (aliases[id]) id = Text.toId(aliases[id]);
			moves = Moves.getRecoveryMoves(id);
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(translator.get('error', this.lang));
		}
		if (moves === null) {
			return this.errorReply(translator.get(5, this.lang) + ' __' + id + '__ ' + translator.get(2, this.lang));
		} else if (!moves.length) {
			return this.errorReply(translator.get(13, this.lang) + ' __' + Moves.getPokeName(id) + '__');
		} else {
			return this.restrictReply(translator.get(14, this.lang) + ' __' + Moves.getPokeName(id) + '__: ' + moves.join(', '), 'pokemon');
		}
	},

	hazards: function () {
		if (!this.arg) return this.errorReply(this.usage({desc: 'pokemon'}));
		let id = Text.toId(this.args[0]);
		if (!id) return this.errorReply(this.usage({desc: 'pokemon'}));
		let moves;
		try {
			let aliases = App.data.getAliases();
			if (aliases[id]) id = Text.toId(aliases[id]);
			moves = Moves.getHazardsMoves(id);
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(translator.get('error', this.lang));
		}
		if (moves === null) {
			return this.errorReply(translator.get(5, this.lang) + ' __' + id + '__ ' + translator.get(2, this.lang));
		} else if (!moves.length) {
			return this.errorReply(translator.get(15, this.lang) + ' __' + Moves.getPokeName(id) + '__');
		} else {
			return this.restrictReply(translator.get(16, this.lang) + ' __' + Moves.getPokeName(id) + '__: ' + moves.join(', '), 'pokemon');
		}
	},
};
