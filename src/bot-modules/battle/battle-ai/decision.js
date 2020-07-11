/**
 * Decision maker
 */

'use strict';

class MoveDecision {
	constructor(moveId, target, mega, move, zmove, ultra, dynamax) {
		this.type = "move";
		this.move = move || "struggle";
		this.moveId = moveId || 0;
		this.mega = mega || false;
		this.zmove = zmove || false;
		this.ultra = ultra || false;
		this.dynamax = dynamax || false;
		this.target = target;
	}
}

class SwitchDecision {
	constructor(pokeId, poke) {
		this.type = "switch";
		this.poke = poke || "pikachu";
		this.pokeId = pokeId || 0;
	}
}

class TeamDecision {
	constructor(team) {
		this.type = "team";
		this.team = team || [0, 1, 2, 3, 4, 5];
	}
}

class PassDecision {
	constructor() {
		this.type = "pass";
	}
}

class ShiftDecision {
	constructor() {
		this.type = "shift";
	}
}

exports.MoveDecision = MoveDecision;
exports.SwitchDecision = SwitchDecision;
exports.TeamDecision = TeamDecision;
exports.PassDecision = PassDecision;
exports.ShiftDecision = ShiftDecision;

function isTooFar(battle, a, b) {
	if (battle.gametype === 'triples') {
		return ((a === 0 && b === 0) || (a === 2 && b === 2));
	} else {
		return false;
	}
}

function combinateTeamPreview(array, i, values, solutions) {
	if (i >= array.length) {
		solutions.push(array.slice());
		return;
	}
	for (let j = 0; j < values.length; j++) {
		if (array.indexOf(values[j]) >= 0) continue; //Repeated
		array[i] = values[j];
		combinateTeamPreview(array, i + 1, values, solutions);
		array[i] = -1;
	}
}

function generateTeamCombinations(sideLength, requiredLength) {
	let comb = [];
	let values = [];
	let array = [];
	for (let i = 0; i < sideLength; i++) {
		values.push(i);
	}
	for (let i = 0; i < requiredLength; i++) {
		array.push(-1);
	}
	combinateTeamPreview(array, 0, values, comb);
	return comb;
}

function validateDecision(des) {
	let megaConsumed = false;
	let ultraConsumed = false;
	let zMoveConsumed = false;
	let dynamaxConsumed = false;
	let shiftConsumed = false;
	let passed = true;
	let switched = [];
	for (let i = 0; i < des.length; i++) {
		if (des[i].mega) {
			if (megaConsumed) return false; // 2 mega evolutions at the same time
			megaConsumed = true;
		}
		if (des[i].ultra) {
			if (ultraConsumed) return false; // 2 ultra burst at the same time
			ultraConsumed = true;
		}
		if (des[i].zmove) {
			if (zMoveConsumed) return false; // Only one z-move per battle
			zMoveConsumed = true;
		}
		if (des[i].dynamax) {
			if (dynamaxConsumed) return false; // Only one dynamax per battle
			dynamaxConsumed = true;
		}
		if (des[i].type === "switch") {
			if (switched.indexOf(des[i].pokeId) >= 0) return false; // Switch to the same pokemon
			switched.push(des[i].pokeId);
		} else if (des[i].type === "shift") {
			if (shiftConsumed) return false; // 2 shifts at the same time
			shiftConsumed = true;
		}
		if (des[i].type !== "pass") passed = false;
	}
	if (passed) return false; // You can't pass the turn
	return true;
}

function nextCombinationDecision(array, i, tables, solutions) {
	if (i >= array.length) {
		//validate combinational decision
		if (!validateDecision(array)) return;
		//add it
		solutions.push(array.slice());
		return;
	}
	for (let j = 0; j < tables[i].length; j++) {
		array[i] = tables[i][j];
		nextCombinationDecision(array, i + 1, tables, solutions);
	}
}

function cartesianProduct(tables) {
	let array = [];
	let comb = [];
	for (let i = 0; i < tables.length; i++) array.push(null);
	nextCombinationDecision(array, 0, tables, comb);
	return comb;
}

exports.getDecisions = function (battle) {
	let res = [];
	let req = battle.request;
	if (!req) return null;
	if (req.wait) return null; // Nothing to do
	if (req.teamPreview) {
		/* Team required */
		let n = 1;
		if (battle.gametype === 'doubles') n = 2;
		else if (battle.gametype === 'triples') n = 3;
		let comb = generateTeamCombinations(req.side.pokemon.length, n);
		for (let i = 0; i < comb.length; i++) {
			res.push([new TeamDecision(comb[i])]);
		}
	} else if (req.forceSwitch) {
		let fw = req.forceSwitch;
		let tables = [];
		let toSw, canSw;
		toSw = 0;
		for (let i = 0; i < fw.length; i++) if (fw[i]) toSw++;
		for (let i = 0; i < fw.length; i++) {
			tables.push([]);
			if (!fw[i]) {
				tables[i].push(new PassDecision());
			} else {
				canSw = 0;
				for (let k = 0; k < req.side.pokemon.length; k++) {
					if (req.side.pokemon[k].condition === "0 fnt") continue; // Fainted
					if (req.side.pokemon[k].active) continue; // Active
					canSw++;
					tables[i].push(new SwitchDecision(k, req.side.pokemon[k].ident));
				}
				if (canSw < toSw) {
					tables[i].push(new PassDecision());
				}
			}
		}
		res = cartesianProduct(tables);
	} else if (req.active) {
		let tables = [];
		for (let i = 0; i < req.active.length; i++) {
			tables.push([]);
			if (req.side.pokemon[i].condition === "0 fnt") {
				//fainted, pass
				tables[i].push(new PassDecision());
				continue;
			}
			let active = req.active[i];
			let auxHasTarget;
			//moves
			for (let j = 0; j < active.moves.length; j++) {
				if (active.moves[j].disabled || active.moves[j].pp === 0) continue; // No more moves
				let target = active.moves[j].target;
				let dmax = false;
				if (battle.self && battle.self.active && battle.self.active[i] && battle.self.active[i].volatiles && battle.self.active[i].volatiles.dynamax) {
					continue; // When dynamaxed you can only use max moves
				}
				let mega = false;
				let ultra = false;
				if (active.canMegaEvo || (req.side.pokemon[i] && req.side.pokemon[i].canMegaEvo)) mega = true;
				if (active.canUltraBurst) ultra = true;
				if (!target) {
					// No need to set the target
					if (mega) tables[i].push(new MoveDecision(j, null, true, active.moves[j].move, false, false, dmax));
					if (ultra) tables[i].push(new MoveDecision(j, null, false, active.moves[j].move, false, true, dmax));
					tables[i].push(new MoveDecision(j, null, false, active.moves[j].move, false, false, dmax));
				} else if (target in { 'any': 1, 'normal': 1, 'adjacentFoe': 1 }) {
					auxHasTarget = false;
					for (let tar = 0; tar < battle.foe.active.length; tar++) {
						if (!battle.foe.active[tar] || battle.foe.active[tar].fainted) continue; // Target not found
						if (target in { 'normal': 1, 'adjacentFoe': 1 } && isTooFar(battle, tar, i)) continue; // Target too far
						auxHasTarget = true;
					}
					for (let tar = 0; tar < battle.foe.active.length; tar++) {
						if (auxHasTarget && (!battle.foe.active[tar] || battle.foe.active[tar].fainted)) continue; // Target not found
						if (target in { 'normal': 1, 'adjacentFoe': 1 } && isTooFar(battle, tar, i)) continue; // Target too far
						if (mega) tables[i].push(new MoveDecision(j, tar, true, active.moves[j].move, false, false, dmax));
						if (ultra) tables[i].push(new MoveDecision(j, tar, false, active.moves[j].move, false, true, dmax));
						tables[i].push(new MoveDecision(j, tar, false, active.moves[j].move, false, false, dmax));
					}
					for (let tar = 0; tar < battle.self.active.length; tar++) {
						if (tar === i) continue; // Not self target allowed
						if (!battle.self.active[tar] || battle.self.active[tar].fainted) continue; // Target not found
						if (target in { 'normal': 1, 'adjacentFoe': 1 } && Math.abs(tar - i) > 1) continue; // Target too far
						if (mega) tables[i].push(new MoveDecision(j, (-1) * (tar + 1), true, active.moves[j].move, false, false, dmax));
						if (ultra) tables[i].push(new MoveDecision(j, (-1) * (tar + 1), false, active.moves[j].move, false, true, dmax));
						tables[i].push(new MoveDecision(j, (-1) * (tar + 1), false, active.moves[j].move, false, false, dmax));
					}
				} else if (target in { 'adjacentAlly': 1 }) {
					let auxHasAllies = false;
					for (let tar = 0; tar < battle.self.active.length; tar++) {
						if (tar === i) continue; // Not self target allowed
						if (!battle.self.active[tar] || battle.self.active[tar].fainted) continue; // Target not found
						if (Math.abs(tar - i) > 1) continue; // Target too far
						auxHasAllies = true;
					}
					for (let tar = 0; tar < battle.self.active.length; tar++) {
						if (tar === i) continue; // Not self target allowed
						if (auxHasAllies && (!battle.self.active[tar] || battle.self.active[tar].fainted)) continue; // Target not found
						if (Math.abs(tar - i) > 1) continue; // Target too far
						if (mega) tables[i].push(new MoveDecision(j, (-1) * (tar + 1), true, active.moves[j].move, false, false, dmax));
						if (ultra) tables[i].push(new MoveDecision(j, (-1) * (tar + 1), false, active.moves[j].move, false, true, dmax));
						tables[i].push(new MoveDecision(j, (-1) * (tar + 1), false, active.moves[j].move, false, false, dmax));
					}
				} else if (target in { 'adjacentAllyOrSelf': 1 }) {
					for (let tar = 0; tar < battle.self.active.length; tar++) {
						if (!battle.self.active[tar] || battle.self.active[tar].fainted) continue; // Target not found
						if (Math.abs(tar - i) > 1) continue; // Target too far
						if (mega) tables[i].push(new MoveDecision(j, (-1) * (tar + 1), true, active.moves[j].move, false, false, dmax));
						if (ultra) tables[i].push(new MoveDecision(j, (-1) * (tar + 1), false, active.moves[j].move, false, true, dmax));
						tables[i].push(new MoveDecision(j, (-1) * (tar + 1), false, active.moves[j].move, false, false, dmax));
					}
				} else {
					// No need to set the target
					if (mega) tables[i].push(new MoveDecision(j, null, true, active.moves[j].move, false, false, dmax));
					if (ultra) tables[i].push(new MoveDecision(j, null, false, active.moves[j].move, false, true, dmax));
					tables[i].push(new MoveDecision(j, null, false, active.moves[j].move, false, false, dmax));
				}
			}
			//z-moves -----------------------------------------------------------------------------------
			let zMove = active.canZMove || (req.side.pokemon[i] ? req.side.pokemon[i].canZMove : false);
			if (zMove && zMove.length) {
				for (let j = 0; j < zMove.length; j++) {
					let z = zMove[j] ? zMove[j].move : "";
					if (!z) continue;
					if (!active.moves[j]) continue;
					let zData = zMove[j];
					if (active.moves[j].pp === 0) continue; // No more moves
					let mega = false;
					let ultra = false;
					if (active.canMegaEvo || (req.side.pokemon[i] && req.side.pokemon[i].canMegaEvo)) mega = true;
					if (active.canUltraBurst) ultra = true;
					if (!zData.target) {
						// No need to set the target
						if (mega) tables[i].push(new MoveDecision(j, null, true, z, true));
						if (ultra) tables[i].push(new MoveDecision(j, null, false, z, true, true));
						tables[i].push(new MoveDecision(j, null, false, z, true));
					} else if (zData.target in { 'any': 1, 'normal': 1, 'adjacentFoe': 1 }) {
						auxHasTarget = false;
						for (let tar = 0; tar < battle.foe.active.length; tar++) {
							if (!battle.foe.active[tar] || battle.foe.active[tar].fainted) continue; // Target not found
							if (zData.target in { 'normal': 1, 'adjacentFoe': 1 } && isTooFar(battle, tar, i)) continue; // Target too far
							auxHasTarget = true;
						}
						for (let tar = 0; tar < battle.foe.active.length; tar++) {
							if (auxHasTarget && (!battle.foe.active[tar] || battle.foe.active[tar].fainted)) continue; // Target not found
							if (zData.target in { 'normal': 1, 'adjacentFoe': 1 } && isTooFar(battle, tar, i)) continue; // Target too far
							if (mega) tables[i].push(new MoveDecision(j, tar, true, z, true));
							if (ultra) tables[i].push(new MoveDecision(j, tar, false, z, true, true));
							tables[i].push(new MoveDecision(j, tar, false, z, true));
						}
						for (let tar = 0; tar < battle.self.active.length; tar++) {
							if (tar === i) continue; // Not self target allowed
							if (!battle.self.active[tar] || battle.self.active[tar].fainted) continue; // Target not found
							if (zData.target in { 'normal': 1, 'adjacentFoe': 1 } && Math.abs(tar - i) > 1) continue; // Target too far
							if (mega) tables[i].push(new MoveDecision(j, (-1) * (tar + 1), true, z, true));
							if (ultra) tables[i].push(new MoveDecision(j, (-1) * (tar + 1), false, z, true, true));
							tables[i].push(new MoveDecision(j, (-1) * (tar + 1), false, z, true));
						}
					} else if (zData.target in { 'adjacentAlly': 1 }) {
						let auxHasAllies = false;
						for (let tar = 0; tar < battle.self.active.length; tar++) {
							if (tar === i) continue; // Not self target allowed
							if (!battle.self.active[tar] || battle.self.active[tar].fainted) continue; // Target not found
							if (Math.abs(tar - i) > 1) continue; // Target too far
							auxHasAllies = true;
						}
						for (let tar = 0; tar < battle.self.active.length; tar++) {
							if (tar === i) continue; // Not self target allowed
							if (auxHasAllies && (!battle.self.active[tar] || battle.self.active[tar].fainted)) continue; // Target not found
							if (Math.abs(tar - i) > 1) continue; // Target too far
							if (mega) tables[i].push(new MoveDecision(j, (-1) * (tar + 1), true, z, true));
							if (ultra) tables[i].push(new MoveDecision(j, (-1) * (tar + 1), true, z, true));
							tables[i].push(new MoveDecision(j, (-1) * (tar + 1), false, z, true));
						}
					} else {
						// No need to set the target
						if (mega) tables[i].push(new MoveDecision(j, null, true, z, true));
						if (ultra) tables[i].push(new MoveDecision(j, null, false, z, true, true));
						tables[i].push(new MoveDecision(j, null, false, z, true));
					}
				}
			}
			//dynamax -----------------------------------------------------------------------------------
			let maxMoves = active.maxMoves ? active.maxMoves.maxMoves : null;
			if (maxMoves && maxMoves.length) {
				for (let j = 0; j < maxMoves.length; j++) {
					let z = maxMoves[j] ? maxMoves[j].move : "";
					if (!z) continue;
					if (!active.moves[j]) continue;
					let zData = maxMoves[j];
					if (active.moves[j].pp === 0) continue; // No more moves
					let mega = false;
					let ultra = false;
					if (active.canMegaEvo || (req.side.pokemon[i] && req.side.pokemon[i].canMegaEvo)) mega = true;
					if (active.canUltraBurst) ultra = true;
					let dmax = true;
					if (battle.self && battle.self.active && battle.self.active[i] && battle.self.active[i].volatiles && battle.self.active[i].volatiles.dynamax) {
						dmax = 'still'; // Already Dynamaxed
					}
					if (!zData.target) {
						// No need to set the target
						if (mega) tables[i].push(new MoveDecision(j, null, true, z, false, false, dmax));
						if (ultra) tables[i].push(new MoveDecision(j, null, false, z, false, dmax, dmax));
						tables[i].push(new MoveDecision(j, null, false, z, false, false, dmax));
					} else if (zData.target in { 'any': 1, 'normal': 1, 'adjacentFoe': 1 }) {
						auxHasTarget = false;
						for (let tar = 0; tar < battle.foe.active.length; tar++) {
							if (!battle.foe.active[tar] || battle.foe.active[tar].fainted) continue; // Target not found
							if (zData.target in { 'normal': 1, 'adjacentFoe': 1 } && isTooFar(battle, tar, i)) continue; // Target too far
							auxHasTarget = true;
						}
						for (let tar = 0; tar < battle.foe.active.length; tar++) {
							if (auxHasTarget && (!battle.foe.active[tar] || battle.foe.active[tar].fainted)) continue; // Target not found
							if (zData.target in { 'normal': 1, 'adjacentFoe': 1 } && isTooFar(battle, tar, i)) continue; // Target too far
							if (mega) tables[i].push(new MoveDecision(j, tar, true, z, false, false, dmax));
							if (ultra) tables[i].push(new MoveDecision(j, tar, false, z, false, true, dmax));
							tables[i].push(new MoveDecision(j, tar, false, z, false, false, dmax));
						}
						for (let tar = 0; tar < battle.self.active.length; tar++) {
							if (tar === i) continue; // Not self target allowed
							if (!battle.self.active[tar] || battle.self.active[tar].fainted) continue; // Target not found
							if (zData.target in { 'normal': 1, 'adjacentFoe': 1 } && Math.abs(tar - i) > 1) continue; // Target too far
							if (mega) tables[i].push(new MoveDecision(j, (-1) * (tar + 1), true, z, false, false, dmax));
							if (ultra) tables[i].push(new MoveDecision(j, (-1) * (tar + 1), false, z, false, true, dmax));
							tables[i].push(new MoveDecision(j, (-1) * (tar + 1), false, z, false, false, dmax));
						}
					} else if (zData.target in { 'adjacentAlly': 1 }) {
						let auxHasAllies = false;
						for (let tar = 0; tar < battle.self.active.length; tar++) {
							if (tar === i) continue; // Not self target allowed
							if (!battle.self.active[tar] || battle.self.active[tar].fainted) continue; // Target not found
							if (Math.abs(tar - i) > 1) continue; // Target too far
							auxHasAllies = true;
						}
						for (let tar = 0; tar < battle.self.active.length; tar++) {
							if (tar === i) continue; // Not self target allowed
							if (auxHasAllies && (!battle.self.active[tar] || battle.self.active[tar].fainted)) continue; // Target not found
							if (Math.abs(tar - i) > 1) continue; // Target too far
							if (mega) tables[i].push(new MoveDecision(j, (-1) * (tar + 1), true, z, false, false, dmax));
							if (ultra) tables[i].push(new MoveDecision(j, (-1) * (tar + 1), true, z, false, true, dmax));
							tables[i].push(new MoveDecision(j, (-1) * (tar + 1), false, z, false, false, dmax));
						}
					} else {
						// No need to set the target
						if (mega) tables[i].push(new MoveDecision(j, null, true, z, false, false, dmax));
						if (ultra) tables[i].push(new MoveDecision(j, null, false, z, false, true, dmax));
						tables[i].push(new MoveDecision(j, null, false, z, false, false, dmax));
					}
				}
			}
			//switchs
			if (!active.trapped) {
				for (let k = 0; k < req.side.pokemon.length; k++) {
					if (req.side.pokemon[k].condition === "0 fnt") continue; // Fainted
					if (req.side.pokemon[k].active) continue; // Active
					tables[i].push(new SwitchDecision(k, req.side.pokemon[k].ident));
				}
			}
			//shifts
			if (req.active.length === 3) {
				if ((i === 0 || i === 2)) tables[i].push(new ShiftDecision());
			}
		}
		res = cartesianProduct(tables);
	}
	return res;
};
