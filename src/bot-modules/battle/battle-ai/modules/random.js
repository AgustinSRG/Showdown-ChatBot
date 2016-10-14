/**
 * Random Decision
 */

'use strict';

exports.setup = function () {
	const BattleModule = {};
	BattleModule.id = "random";

	BattleModule.decide = function (battle, decisions) {
		return decisions[Math.floor(Math.random() * decisions.length)];
	};

	return BattleModule;
};
