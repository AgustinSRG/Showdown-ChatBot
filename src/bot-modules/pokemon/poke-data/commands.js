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

const Moves = require(Path.resolve(__dirname, 'moves.js'));

const Text = Tools('text');
const Chat = Tools('chat');
const Inexact = Tools('inexact-pokemon');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

module.exports = {
	gen: function (App) {
		this.errorReply(this.deprecated('/details [Pokémon/item/move/ability/nature]'));
	},

	viablemoves: 'randommoves',
	randommoves: function (App) {
		this.errorReply(this.deprecated('/randbats [pokemon], [gen]'));
	},

	priority: function (App) {
		this.errorReply(this.deprecated('/ms [pokemon], priority'));
	},

	boosting: function (App) {
		this.errorReply(this.deprecated('/ms [pokemon], boosts [atk | def | spa | spd | spe]'));
	},

	recovery: function (App) {
		this.errorReply(this.deprecated('/ms [pokemon], recovery'));
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
