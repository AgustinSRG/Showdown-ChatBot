/**
 * Random Move (No dynamax)
 */

'use strict';

exports.setup = function () {
	const BattleModule = {};
	BattleModule.id = "randommovenodyna";

	function getDecisionValue(des) {
		if (des.type === "team") {
			return 5000;
		} else if (des.type === "move") {
			if (des.dynamax) {
				return 100;
			} else {
				return 1000;
			}
		} else if (des.type === "switch") {
			return 100;
		} else {
			return -1000; // Pass, Shift
		}
	}

	BattleModule.decide = function (battle, decisions) {
		let dTable = [];
		let p, maxP;
		maxP = null;
		for (let d = 0; d < decisions.length; d++) {
			p = 0;
			for (let i = 0; i < decisions[d].length; i++) {
				p += getDecisionValue(decisions[d][i]);
			}
			dTable.push({des: d, val: p});
			if (maxP === null || maxP < p) maxP = p;
		}
		let chosen = [];
		for (let j = 0; j < dTable.length; j++) {
			if (dTable[j].val === maxP && decisions[dTable[j].des]) {
				chosen.push(decisions[dTable[j].des]);
			}
		}
		return chosen[Math.floor(Math.random() * chosen.length)];
	};

	return BattleModule;
};
