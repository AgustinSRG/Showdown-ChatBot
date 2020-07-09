/**
 * Ingame (No Status)
 *
 * Simple algorithm, just choose the move that causes more damage
 * No switchs, No status moves
 *
 * Recommended: 1v1, Challenge Cup 1v1
 *
 * System:
 *
 *  - Priority 100000 - Moves that causes > 0
 *	- Priority 1000 - Status moves
 *  - Priority 0 - Team
 *  - Priority -1000 - Switch / Shift / Pass
 *	- Priority -100000 - Moves 0 damage
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Calc = require(Path.resolve(__dirname, '..', 'calc.js'));
const Pokemon = Calc.Pokemon;
const Conditions = Calc.Conditions;

exports.setup = function (Data) {
	const BattleModule = {};
	BattleModule.id = "ingame-nostatus";

	/* Bad moves for 1v1 */
	const BadMoves = ['focuspunch', 'explosion', 'selfdestruct', 'lastresort', 'futuresight', 'firstimpression', 'synchronoise'];

	/* Moves which require 2 turns without any protection */
	const DoubleTurnMoves = ['solarbeam'];

	/* Team and Switch Decisions */

	function getPokemonAverage(battle, s) {
		if (!battle.foe.teamPv.length) return 0;

		let p = battle.request.side.pokemon[s];
		let pokeA = battle.getCalcRequestPokemon(s, true);
		if (Text.toId(battle.tier || "").indexOf("challengecup") >= 0) pokeA.happiness = 100;

		let final = 0;
		let conditions = new Conditions({});
		for (let i = 0; i < battle.foe.teamPv.length; i++) {
			let pokeView = battle.foe.teamPv[i];
			let template = Data.getPokemon(pokeView.species, battle.gen);
			let poke = new Pokemon(template, {
				level: pokeView.level,
				gender: pokeView.gender,
				evs: {hp: 192, def: 124, spd: 124},
			});
			if (Text.toId(battle.tier || "").indexOf("challengecup") >= 0) poke.happiness = 100;
			if (template.abilities) poke.ability = Data.getAbility(template.abilities[0], battle.gen);
			let calcVal = 0;
			for (let j = 0; j < p.moves.length; j++) {
				let move = Data.getMove(p.moves[j], battle.gen);
				if (move.category === "Status") continue;
				if (BadMoves.indexOf(move.id) >= 0) continue;
				let dmg = Calc.calculate(pokeA, poke, move, conditions, conditions, battle.conditions, battle.gen);
				//debug("DMG [" + pokeA.species + ", " + poke.species + ", " + move.name + "] = " + dmg.getMax());
				if (DoubleTurnMoves.indexOf(move.id) >= 0) calcVal += dmg.getMax() * 0.5;
				else calcVal += dmg.getMax();
			}
			final += (calcVal / 4);
		}
		return 0 + final;
	}

	function evaluateTeamDecision(battle, des) {
		let final = 0;
		for (let i = 0; i < des.team.length; i++) {
			final += getPokemonAverage(battle, des.team[i]);
		}
		return final;
	}

	/* Switch Decisions */

	function getSwitchAverage(battle, s) {
		let final = 0;
		let p = battle.request.side.pokemon[s];
		let pokeA = battle.getCalcRequestPokemon(s, true);
		if (Text.toId(battle.tier || "").indexOf("challengecup") >= 0) pokeA.happiness = 100;
		let conditionsA = new Conditions({
			side: battle.self.side,
			volatiles: {},
			boosts: {},
		});
		for (let i = 0; i < p.moves.length; i++) {
			let move = Data.getMove(p.moves[i], battle.gen);
			let targets = battle.foe.active;
			for (let j = 0; j < targets.length; j++) {
				if (!targets[j]) continue;
				let conditionsB = new Conditions({
					side: battle.foe.side,
					volatiles: targets[j].volatiles,
					boosts: targets[j].boosts,
				});
				let pokeB = new Pokemon(targets[j].template, {
					level: targets[j].level,
					gender: targets[j].gender,
					shiny: targets[j].shiny,
					evs: {hp: 192, def: 124, spd: 124},
				});
				pokeB.hp = targets[j].hp;
				pokeB.status = targets[j].status;
				if (targets[j].item === "&unknown") {
					pokeB.item = null;
				} else {
					pokeB.item = targets[j].item;
				}
				if (!targets[j].supressedAbility) {
					if (targets[j].ability === "&unknown") {
						pokeB.ability = pokeB.template.abilities ? pokeB.template.abilities[0] : null;
					} else {
						pokeB.ability = targets[j].ability;
					}
				}
				let dmg = Calc.calculate(pokeA, pokeB, move, conditionsA, conditionsB, battle.conditions, battle.gen);
				//debug("DMG [" + pokeA.species + ", " + pokeB.species + ", " + move.name + "] = " + dmg.getMax());
				if (DoubleTurnMoves.indexOf(move.id) >= 0) final += dmg.getMax() * 0.5;
				else final += dmg.getMax();
			}
		}
		if (!p.moves.length) return 0;
		return final / p.moves.length;
	}

	function evaluateSwitchDecision(battle, des) {
		let final = -1000;
		final += getSwitchAverage(battle, des.pokeId);
		return final;
	}

	/* Move Decisions */

	function evaluateMoveDecision(battle, desEnv, des, act) {
		let final = 0;
		let p = battle.request.side.pokemon[act];
		let a = battle.request.active[act];
		let move = Data.getMove(p.moves[des.moveId]);
		if (des.zmove) {
			let zmove = Data.getMove(des.move);
			if (zmove.basePower === 1) zmove.basePower = Data.getZPower(move.basePower || 0);
			zmove.category = move.category;
			move = zmove;
		}
		if (des.dynamax) {
			let dmove = Data.getMove(des.move);
			dmove.basePower = Data.getMaxPower(move.basePower || 0, Text.toId(dmove.name));
			dmove.category = move.category;
			move = dmove;
		}

		if (move.category === "Status") return 0;
		if (BadMoves.indexOf(move.id) >= 0) return 0;
		if (des.target < 0) return -1000000; // Do not kill your own allies

		if (a.canMegaEvo || p.canMegaEvo) {
			if (!des.mega) return 0; // Mega evolve by default
		}

		if (a.canUltraBurst) {
			if (!des.ultra) return 0; // Ultra burst always
		}

		if (move.id === "fakeout") {
			if (!(battle.self.active[act].helpers.sw === battle.turn || battle.self.active[act].helpers.sw === battle.turn - 1)) {
				return 0; // Fake out only works for first turn
			}
		}

		let pokeA = battle.getCalcRequestPokemon(act, true);
		if (Text.toId(battle.tier || "").indexOf("challengecup") >= 0) pokeA.happiness = 100; // Random
		let conditionsA = new Conditions({
			side: battle.self.side,
			volatiles: battle.self.active[act].volatiles,
			boosts: battle.self.active[act].boosts,
		});

		let targets = [];
		if (typeof des.target === "number") {
			targets = [battle.foe.active[des.target]];
		} else {
			targets = battle.foe.active;
		}

		for (let i = 0; i < targets.length; i++) {
			if (!targets[i]) continue;
			if (targets[i].fainted) continue;
			if (move.flags && move.flags['charge'] && targets[i].moves) {
				let hasDangerousMove = false;
				for (let dangerousMove of targets[i].moves) {
					if (dangerousMove.id in {'protect': 1, 'detect': 1, 'kingsshield': 1, 'spikyshield': 1, 'dig': 1, 'fly': 1}) {
						hasDangerousMove = true;
						break;
					}
				}
				if (hasDangerousMove) continue;
			}
			let conditionsB = new Conditions({
				side: battle.foe.side,
				volatiles: targets[i].volatiles,
				boosts: targets[i].boosts,
			});
			let pokeB = new Pokemon(targets[i].template, {
				level: targets[i].level,
				gender: targets[i].gender,
				shiny: targets[i].shiny,
				evs: {hp: 192, def: 124, spd: 124},
			});
			pokeB.hp = targets[i].hp;
			pokeB.status = targets[i].status;
			if (targets[i].item === "&unknown") {
				pokeB.item = null;
			} else {
				pokeB.item = targets[i].item;
			}
			if (!targets[i].supressedAbility) {
				if (targets[i].ability === "&unknown") {
					pokeB.ability = pokeB.template.abilities ? Data.getAbility(pokeB.template.abilities[0]) : null;
				} else {
					pokeB.ability = targets[i].ability;
				}
			}
			let dmg = Calc.calculate(pokeA, pokeB, move, conditionsA, conditionsB, battle.conditions, battle.gen);
			//debug("DMG [" + pokeA.species + ", " + pokeB.species + ", " + move.name + "] = " + dmg.getMax());
			if (DoubleTurnMoves.indexOf(move.id) >= 0) final += dmg.getMax() * 0.5;
			else final += dmg.getMax();
		}
		if (!final) return -100000; // Inmmune
		return 100000 + final;
	}

	/* Swapper */

	function getDecisionValue(battle, decisions, desEnv, des, act) {
		if (des.type === "team") {
			return evaluateTeamDecision(battle, des);
		} else if (des.type === "move") {
			return evaluateMoveDecision(battle, desEnv, des, act);
		} else if (des.type === "switch") {
			return evaluateSwitchDecision(battle, des);
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
				p += getDecisionValue(battle, decisions, decisions[d], decisions[d][i], i);
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
