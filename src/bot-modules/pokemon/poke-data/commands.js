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
};
