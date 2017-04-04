/**
 * Commands File
 *
 * gen: gets generation of pokemon, moves, items...
 * randommoves: gets moves used in Random Battle format
 * priority: gets priority moves a pokemon can learn
 * boosting: gets boosting moves a pokemon can learn
 * recovery: gets recovery moves a pokemon can learn
 * hazards: gets hazards moves a pokemon can learn
 */

'use strict';

const Path = require('path');

const getGeneration = require(Path.resolve(__dirname, 'gen.js'));
const Moves = require(Path.resolve(__dirname, 'moves.js'));

const Text = Tools('text');
const Chat = Tools('chat');
const Inexact = Tools('inexact-pokemon');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

module.exports = {
	gen: function (App) {
		this.setLangFile(Lang_File);
		let id = Text.toId(this.arg);
		if (!id) return this.errorReply(this.usage({desc: this.mlt(17)}));
		let gen;
		try {
			let aliases = App.data.getAliases();
			if (aliases[id]) id = Text.toId(aliases[id]);
			gen = getGeneration(id, App);
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(this.mlt('error'));
		}
		let inexact, text = '';
		switch (gen.gen) {
		case 'metronome':
			text = this.mlt(0);
			break;
		case 0:
			inexact = Inexact.safeResolve(App, id, {natures: 0, formats: 0, others: 1});
			text = this.mlt(1) + " " + Chat.italics(id) + " " + this.mlt(2) +
				(inexact ? (". " + this.mlt('inexact') + " " + Chat.italics(inexact) + "?") : "");
			break;
		default:
			text = this.mlt(3) + " " + Chat.italics(gen.name) + ": " + this.mlt(4) + " " + Chat.italics(gen.gen);
		}
		this.restrictReply(text, 'pokemon');
	},

	viablemoves: 'randommoves',
	randommoves: function (App) {
		this.setLangFile(Lang_File);
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
			return this.errorReply(this.mlt('error'));
		}
		if (moves === null) {
			let inexact = Inexact.safeResolve(App, id, {pokemon: 1, others: 0});
			return this.errorReply(this.mlt(5) + ' ' + Chat.italics(id) + ' ' + this.mlt(2) +
				(inexact ? (". " + this.mlt('inexact') + " " + Chat.italics(inexact) + "?") : ""));
		} else if (!moves.length) {
			return this.errorReply(this.mlt(6) + ' ' + Chat.italics(Moves.getPokeName(id, App)));
		} else if (doubles) {
			return this.restrictReply(this.mlt(7) + ' ' + Chat.italics(Moves.getPokeName(id, App)) + ': ' + moves.join(', '), 'pokemon');
		} else {
			return this.restrictReply(this.mlt(8) + ' ' + Chat.italics(Moves.getPokeName(id, App)) + ': ' + moves.join(', '), 'pokemon');
		}
	},

	priority: function (App) {
		this.setLangFile(Lang_File);
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
			return this.errorReply(this.mlt('error'));
		}
		if (moves === null) {
			let inexact = Inexact.safeResolve(App, id, {pokemon: 1, others: 0});
			return this.errorReply(this.mlt(5) + ' ' + Chat.italics(id) + ' ' + this.mlt(2) +
				(inexact ? (". " + this.mlt('inexact') + " " + Chat.italics(inexact) + "?") : ""));
		} else if (!moves.length) {
			if (id === "smeargle") {
				return this.restrictReply(Chat.italics(Moves.getPokeName(id, App)) + ' ' + this.mlt(18) + '.', 'pokemon');
			} else {
				return this.errorReply(this.mlt(9) + ' ' + Chat.italics(Moves.getPokeName(id, App)));
			}
		} else {
			return this.restrictReply(this.mlt(10) + ' ' + Chat.italics(Moves.getPokeName(id, App)) + ': ' + moves.join(', '), 'pokemon');
		}
	},

	boosting: function (App) {
		this.setLangFile(Lang_File);
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
			return this.errorReply(this.mlt('error'));
		}
		if (moves === null) {
			let inexact = Inexact.safeResolve(App, id, {pokemon: 1, others: 0});
			return this.errorReply(this.mlt(5) + ' ' + Chat.italics(id) + ' ' + this.mlt(2) +
				(inexact ? (". " + this.mlt('inexact') + " " + Chat.italics(inexact) + "?") : ""));
		} else if (!moves.length) {
			if (id === "smeargle") {
				return this.restrictReply(Chat.italics(Moves.getPokeName(id, App)) + ' ' + this.mlt(18) + '.', 'pokemon');
			} else {
				return this.errorReply(this.mlt(11) + ' ' + Chat.italics(Moves.getPokeName(id, App)));
			}
		} else {
			return this.restrictReply(this.mlt(12) + ' ' + Chat.italics(Moves.getPokeName(id, App)) + ': ' + moves.join(', '), 'pokemon');
		}
	},

	recovery: function (App) {
		this.setLangFile(Lang_File);
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
			return this.errorReply(this.mlt('error'));
		}
		if (moves === null) {
			let inexact = Inexact.safeResolve(App, id, {pokemon: 1, others: 0});
			return this.errorReply(this.mlt(5) + ' ' + Chat.italics(id) + ' ' + this.mlt(2) +
				(inexact ? (". " + this.mlt('inexact') + " " + Chat.italics(inexact) + "?") : ""));
		} else if (!moves.length) {
			if (id === "smeargle") {
				return this.restrictReply(Chat.italics(Moves.getPokeName(id, App)) + ' ' + this.mlt(18) + '.', 'pokemon');
			} else {
				return this.errorReply(this.mlt(13) + ' ' + Chat.italics(Moves.getPokeName(id, App)));
			}
		} else {
			return this.restrictReply(this.mlt(14) + ' ' + Chat.italics(Moves.getPokeName(id, App)) + ': ' + moves.join(', '), 'pokemon');
		}
	},

	hazards: function (App) {
		this.setLangFile(Lang_File);
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
			return this.errorReply(this.mlt('error'));
		}
		if (moves === null) {
			let inexact = Inexact.safeResolve(App, id, {pokemon: 1, others: 0});
			return this.errorReply(this.mlt(5) + ' ' + Chat.italics(id) + ' ' + this.mlt(2) +
				(inexact ? (". " + this.mlt('inexact') + " " + Chat.italics(inexact) + "?") : ""));
		} else if (!moves.length) {
			if (id === "smeargle") {
				return this.restrictReply(Chat.italics(Moves.getPokeName(id, App)) + ' ' + this.mlt(18) + '.', 'pokemon');
			} else {
				return this.errorReply(this.mlt(15) + ' ' + Chat.italics(Moves.getPokeName(id, App)) + '');
			}
		} else {
			return this.restrictReply(this.mlt(16) + ' ' + Chat.italics(Moves.getPokeName(id, App)) + ': ' + moves.join(', '), 'pokemon');
		}
	},
};
