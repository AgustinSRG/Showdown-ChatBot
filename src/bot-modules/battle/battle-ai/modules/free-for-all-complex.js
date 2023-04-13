/**
 * Complex module for Free-For-All
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Calc = require(Path.resolve(__dirname, '..', 'calc.js'));
const TypeChart = require(Path.resolve(__dirname, '..', 'typechart.js'));
const Pokemon = Calc.Pokemon;
const Conditions = Calc.Conditions;

const SkillSwapFails = new Set(["Wonder Guard", "Multitype", "Illusion", "Stance Change", "Schooling", "Comatose", "Shields Down", "Disguise", "RKS System", "Battle Bond", "Power Construct", "Ice Face", "Gulp Missile", "Neutralizing Gas"].map(a => Text.toId(a)));
const EntrainmentFails = new Set(["Truant", "Multitype", "Stance Change", "Schooling", "Comatose", "Shields Down", "Disguise", "RKS System", "Battle Bond", "Ice Face", "Gulp Missile"].map(a => Text.toId(a)));

function getFoePlayers(battle) {
	let res = [];
	let self = battle.self.id;
	for (let id in battle.players) {
		if (id !== self) {
			res.push(battle.players[id]);
		}
	}
	return res;
}

function getTargets(battle) {
	const foes = getFoePlayers(battle);
	let res = [];
	for (let foe of foes) {
		for (let active of foe.active) {
			if (active) {
				res.push({ pokemon: active, player: foe });
			}
		}
	}
	return res;
}

function findAnyNotNull(arr) {
	for (let el of arr) {
		if (el) {
			return el;
		}
	}
	return null;
}

function findValidDecision(decisionArray, types) {
	for (let i = 0; i < decisionArray.length; i++) {
		let des = decisionArray[i];
		if (types.indexOf(des.type) >= 0) {
			return { des: des, act: i };
		}
	}
	return null;
}

function getSpecificTarget(battle, target) {
	if (target < 0) {
		const players = getAdjacentPlayers(battle);
		const realTarget = (target * (-1)) - 1;
		for (let p of players) {
			if (p.active[realTarget]) {
				return { pokemon: p.active[realTarget], player: p };
			}
		}
		return null;
	} else {
		const players = getFrontPlayers(battle);
		for (let p of players) {
			if (p.active[target]) {
				return { pokemon: p.active[target], player: p };
			}
		}
		return null;
	}
}

function getFrontPlayers(battle) {
	let res = [];
	let self = battle.self.id;
	let selfTeam = parseInt(self.substr(1)) % 2;
	for (let id in battle.players) {
		if (id !== self) {
			let foeTeam = parseInt(id.substr(1)) % 2;
			if (selfTeam !== foeTeam) {
				res.push(battle.players[id]);
			}
		}
	}
	return res;
}

function getAdjacentPlayers(battle) {
	let res = [];
	let self = battle.self.id;
	let selfTeam = parseInt(self.substr(1)) % 2;
	for (let id in battle.players) {
		let foeTeam = parseInt(id.substr(1)) % 2;
		if (selfTeam === foeTeam) {
			res.push(battle.players[id]);
		}
	}
	return res;
}

exports.setup = function (Data) {
	const BattleModule = Object.create(null);
	BattleModule.id = "free-for-all-complex";

	BattleModule.gametypes = ["freeforall"];

	function getBestSpread(template) {
		let stats = (template || {}).baseStats || {};

		let hAtk = Math.max(stats.atk || 0, stats.spa || 0);
		let hDef = Math.max(stats.def || 0, stats.spd || 0);

		if (hAtk > hDef) {
			return { atk: 252, spa: 252, spe: 252 };
		} else if (hDef > hAtk) {
			return { hp: 252, def: 120, spd: 120 };
		} else {
			return { hp: 252, spe: 252 };
		}
	}

	function suposeActiveFoes(battle) {
		const foes = getFoePlayers(battle);
		const result = [];

		for (let foe of foes) {
			let target = findAnyNotNull(foe.active);
			if (!target || target.fainted) {
				continue;
			}

			let pokeB = new Pokemon(target.template, {
				level: target.level,
				gender: target.gender,
				shiny: target.shiny,
				evs: getBestSpread(target.template),
			});
			pokeB.hp = target.hp;
			pokeB.status = target.status;
			pokeB.tera = target.tera;
			pokeB.timesHit = target.timesHit;
			pokeB.supressedAbility = target.supressedAbility;
			if (target.item === "&unknown") {
				pokeB.item = null;
			} else {
				pokeB.item = target.item;
			}
			if (target.ability === "&unknown") {
				pokeB.ability = pokeB.template.abilities ? Data.getAbility(pokeB.template.abilities[0]) : null;
			} else {
				pokeB.ability = target.ability;
			}

			result.push({ poke: pokeB, foe: foe, active: target });
		}

		return result;
	}

	function selectTarget(targets) {
		let viabletargets = [];
		for (let target of targets) {
			if (!target.pokemon.fainted) {
				viabletargets.push(target);
			}
		}
		if (viabletargets.length > 0) {
			return viabletargets[Math.floor(Math.random() * viabletargets.length)];
		} else {
			return null;
		}
	}

	function suposeActiveFoe(battle, battleTarget) {
		let target = battleTarget.pokemon;

		let pokeB = new Pokemon(target.template, {
			level: target.level,
			gender: target.gender,
			shiny: target.shiny,
			evs: getBestSpread(target.template),
		});
		pokeB.hp = target.hp;
		pokeB.status = target.status;
		pokeB.tera = target.tera;
		pokeB.timesHit = target.timesHit;
		pokeB.supressedAbility = target.supressedAbility;
		if (target.item === "&unknown") {
			pokeB.item = null;
		} else {
			pokeB.item = target.item;
		}
		if (target.ability === "&unknown") {
			pokeB.ability = pokeB.template.abilities ? Data.getAbility(pokeB.template.abilities[0]) : null;
		} else {
			pokeB.ability = target.ability;
		}

		return pokeB;
	}

	function countHazards(side, ignoreScreens) {
		let count = 0;
		for (let hazard of Object.keys(side)) {
			switch (hazard) {
				case "stealthrock":
				case "gmaxsteelsurge":
					count += 30;
					break;
				case "spikes":
					count += (side[hazard] * 10);
					break;
				case "toxicspikes":
					count += (side[hazard] * 15);
					break;
				case "stickyweb":
					count += 20;
					break;
				case "reflect":
				case "lightscreen":
				case "auroraveil":
					if (!ignoreScreens) count -= 20; // Screens count as negative hazards
					break;
			}
		}
		return count;
	}

	function evaluatePokemon(battle, sideId, noMega) {
		let res = { t: 0, d: 0 };
		let pokeA = battle.getCalcRequestPokemon(sideId, !noMega);

		const activeFoes = suposeActiveFoes(battle);

		for (let activeFoe of activeFoes) {
			const pokeB = activeFoe.poke;
			const foe = activeFoe.foe;
			const activeMon = activeFoe.active;

			let conditionsA, conditionsB;
			let t = 0;
			conditionsB = new Conditions({
				side: foe.side,
				volatiles: activeMon.volatiles,
				boosts: activeMon.boosts,
			});
			if (sideId < battle.self.active.length) {
				conditionsA = new Conditions({
					side: battle.self.side,
					volatiles: findAnyNotNull(battle.self.active).volatiles,
					boosts: findAnyNotNull(battle.self.active).boosts,
					inmediate: { beatup_bp: battle.getBeatupBasePower(), last_respects_bp: battle.getLastRespectsBasePower() }
				});
			} else {
				conditionsA = new Conditions({
					side: battle.self.side,
					volatiles: Object.create(null),
					boosts: Object.create(null),
				});
			}

			/* Calculate t - types mux */
			let offTypes = pokeA.template.types.slice();

			if (conditionsA.volatiles["typechange"] && conditionsA.volatiles["typechange"].length) offTypes = conditionsA.volatiles["typechange"].slice();
			if (conditionsA.volatiles["typeadd"]) offTypes.push(conditionsA.volatiles["typeadd"]);

			if (pokeA.typechange && pokeA.typechange.length) {
				offTypes = pokeA.typechange.slice();
			} else if (pokeA.tera && (!conditionsA.volatiles["typechange"] || !conditionsA.volatiles["typechange"].length)) {
				offTypes = [pokeA.tera];
			}

			let defTypes = pokeB.template.types.slice();

			if (conditionsB.volatiles["zoroark"]) {
				defTypes = ["Dark"];
			} else if (conditionsB.volatiles["zoroarkhisui"]) {
				defTypes = ["Normal", "Ghost"];
			}

			if (conditionsB.volatiles["typechange"] && conditionsB.volatiles["typechange"].length) defTypes = conditionsB.volatiles["typechange"].slice();
			if (conditionsB.volatiles["typeadd"]) defTypes.push(conditionsB.volatiles["typeadd"]);

			if (pokeB.typechange && pokeB.typechange.length) {
				defTypes = pokeB.typechange.slice();
			} else if (pokeB.tera && (!conditionsB.volatiles["typechange"] || !conditionsB.volatiles["typechange"].length)) {
				defTypes = [pokeB.tera];
			}

			let inverse = !!battle.conditions["inversebattle"];
			let mux, tmux;
			for (let i = 0; i < 2; i++) {
				if (defTypes[i]) {
					mux = 1;
					for (let j = 0; j < offTypes.length; j++) {
						tmux = TypeChart.getEffectiveness(defTypes[i], offTypes[j], battle.gen);
						if (inverse) {
							if (tmux === 0) tmux = 2;
							else tmux = 1 / tmux;
						}
						mux *= tmux;
					}
					t += mux;
				} else {
					t += 1;
				}
			}
			res.t += t;

			/* Calculate d - max damage */
			let moves = battle.request.side.pokemon[sideId].moves;
			let d = 0;
			for (let i = 0; i < moves.length; i++) {
				let move = Data.getMove(moves[i], battle.gen);
				let dmg = Calc.calculate(pokeA, pokeB, move, conditionsA, conditionsB, battle.conditions, battle.gen).getMax();
				if (dmg > d) d = dmg;
			}
			res.d += d;
		}

		return res;
	}

	/* Moves */

	function foeCanSwitch(battle, foe) {
		let totalPokes = foe.teamPv.length || 6;
		if (foe.pokemon.length === totalPokes) {
			for (let i = 0; i < foe.pokemon.length; i++) {
				if (!foe.pokemon[i].fainted && !foe.pokemon[i].active) {
					return true;
				}
			}
			return false;
		}
		return true;
	}

	function selfCanSwitch(battle) {
		for (let i = 0; i < battle.request.side.pokemon.length; i++) {
			if (battle.request.side.pokemon[i].condition !== "0 fnt" && !battle.request.side.pokemon[i].active) {
				return true;
			}
		}
		return false;
	}

	function selfHasStatus(battle) {
		for (let i = 0; i < battle.request.side.pokemon.length; i++) {
			if (battle.parseStatus(battle.request.side.pokemon[i].condition).status in { "slp": 1, "brn": 1, "psn": 1, "tox": 1, "par": 1, "frz": 1 }) {
				return true;
			}
		}
		return false;
	}

	function alreadyOppSleeping(battle, foe) {
		for (let i = 0; i < foe.pokemon.length; i++) {
			if (foe.pokemon[i].status === "slp") {
				return true;
			}
		}
		return false;
	}

	function moveIsRedirectedImmune(battle, move, pokeA, conditionsA) {
		let targets = getTargets(battle);

		for (let i = 0; i < targets.length; i++) {
			if (!targets[i] || !targets[i].pokemon) continue;
			if (targets[i].pokemon.fainted) continue;

			let pokeB = suposeActiveFoe(battle, targets[i]);

			let conditionsB = new Conditions({
				side: targets[i].player.side,
				volatiles: targets[i].pokemon.volatiles,
				boosts: targets[i].pokemon.boosts,
			});

			let dmg = Calc.calculate(pokeA, pokeB, move, conditionsA, conditionsB, battle.conditions, battle.gen);

			if (dmg.isRedirected) {
				return true; // Move gets redirected
			}
		}

		return false;
	}

	let getViableSupportMoves = BattleModule.getViableSupportMoves = function (battle, decisions) {
		let res = {
			viable: [],
			unviable: [],
			sleepTalk: null,
			total: 0,
		};
		let sideId = 0; // Active, singles
		let pokeA = battle.getCalcRequestPokemon(sideId, true);
		let originalTera = pokeA.tera;

		let conditionsA = new Conditions({
			side: battle.self.side,
			volatiles: findAnyNotNull(battle.self.active).volatiles,
			boosts: findAnyNotNull(battle.self.active).boosts,
			inmediate: { beatup_bp: battle.getBeatupBasePower(), last_respects_bp: battle.getLastRespectsBasePower() },
		});

		let offTypes = pokeA.template.types.slice();
		if (conditionsA.volatiles["typechange"] && conditionsA.volatiles["typechange"].length) offTypes = conditionsA.volatiles["typechange"].slice();
		if (conditionsA.volatiles["typeadd"]) offTypes.push(conditionsA.volatiles["typeadd"]);

		for (let i = 0; i < decisions.length; i++) {
			let validDes = findValidDecision(decisions[i], ['move']);
			if (!validDes) continue;
			let des = validDes.des;
			let act = validDes.act;
			if (des.type !== "move") continue; // not a move

			if (des.terastallize && battle.request.active && battle.request.active[sideId] && battle.request.active[sideId].canTerastallize) {
				pokeA.tera = battle.request.active[sideId].canTerastallize;
				pokeA.typechange = [pokeA.tera];
			} else {
				pokeA.tera = originalTera;
				pokeA.typechange = null;
			}

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
				dmove.basePower = Data.getMaxPower(move.basePower || 0, Text.toId(dmove.name), move.isMax);
				dmove.category = move.category;
				dmove.isMaxModified = true;
				move = dmove;
			}
			if (des.dynamax && move.category === "Status") {
				res.unviable.push(decisions[i]);
				continue;
			}

			if (a.canMegaEvo || p.canMegaEvo) {
				// Mega evolve by default
				if (!des.mega) {
					res.unviable.push(decisions[i]);
					continue;
				}
			}

			if (a.canUltraBurst) {
				// Ultra burst always
				if (!des.ultra) {
					res.unviable.push(decisions[i]);
					continue;
				}
			}

			if (['flowershield', 'helpinghand', 'holdhands', 'followme'].indexOf(move.id) >= 0) {
				// Moves not good
				res.unviable.push(decisions[i]);
				continue;
			}

			let targets = [];
			if (typeof des.target === "number") {
				targets = [getSpecificTarget(battle, des.target)];

				if (moveIsRedirectedImmune(battle, move, pokeA, conditionsA)) {
					res.unviable.push(decisions[i]);
					continue;
				}
			} else {
				targets = getTargets(battle);
			}

			const selectedTarget = selectTarget(targets);

			if (!selectedTarget) {
				res.unviable.push(decisions[i]);
				continue;
			}

			const pokeB = suposeActiveFoe(battle, selectedTarget);
			const foe = selectedTarget.player;
			const foeActivePokemon = selectedTarget.pokemon;

			let conditionsB = new Conditions({
				side: foe.side,
				volatiles: foeActivePokemon.volatiles,
				boosts: foeActivePokemon.boosts,
			});

			let defTypes = pokeB.template.types.slice();
			if (conditionsB.volatiles["zoroark"]) {
				defTypes = ["Dark"];
			} else if (conditionsB.volatiles["zoroarkhisui"]) {
				defTypes = ["Normal", "Ghost"];
			}
			if (conditionsB.volatiles["typechange"] && conditionsB.volatiles["typechange"].length) defTypes = conditionsB.volatiles["typechange"].slice();
			if (conditionsB.volatiles["typeadd"]) defTypes.push(conditionsB.volatiles["typeadd"]);

			const pokeAIgnoredAbility = battle.gen < 3 || pokeA.supressedAbility || ((battle.conditions["magicroom"] || conditionsA.volatiles["embargo"] || !pokeA.item || pokeA.item.id !== "abilityshield") && (battle.conditions["neutralizinggas"]));
			const pokeBIgnoredAbility = battle.gen < 3 || pokeB.supressedAbility || ((battle.conditions["magicroom"] || conditionsB.volatiles["embargo"] || !pokeB.item || pokeB.item.id !== "abilityshield") && (battle.conditions["neutralizinggas"] || move.ignoreAbility || (pokeA.ability && !pokeAIgnoredAbility && (pokeA.ability.id in { "moldbreaker": 1, "turboblaze": 1, "teravolt": 1, "myceliummight": 1 }))));

			if (move.category === "Status") {
				res.total++;
				if (move.flags && move.flags['reflectable'] && pokeB.ability && !pokeBIgnoredAbility && pokeB.ability.id === "magicbounce") {
					res.unviable.push(decisions[i]);
					continue;
				}
				if (move.target !== "self" && battle.gen >= 7 && pokeA.ability && !pokeAIgnoredAbility && pokeA.ability.id === "prankster" && defTypes.indexOf("Dark") >= 0) {
					res.unviable.push(decisions[i]);
					continue;
				}
				if (conditionsB.volatiles["substitute"] && move.target !== "self" && move.target !== "allySide" && move.target !== "foeSide" && move.target !== "allyTeam") {
					if (!move.flags || !move.flags['authentic']) {
						res.unviable.push(decisions[i]);
						continue;
					}
				}
				if (pokeB.ability && !pokeBIgnoredAbility && pokeB.ability.id === "goodasgold" && move.target !== "self" && move.target !== "allySide" && move.target !== "foeSide" && move.target !== "allyTeam") {
					res.unviable.push(decisions[i]);
					continue;
				}
			} else {
				if (Calc.calculate(pokeA, pokeB, move, conditionsA, conditionsB, battle.conditions, battle.gen).getMax() === 0) {
					res.unviable.push(decisions[i]);
					continue;
				}
			}

			if (move.flags && move.flags["powder"] && battle.gen > 5) {
				if (pokeB.ability && !pokeBIgnoredAbility && pokeB.ability.id === "overcoat") {
					res.unviable.push(decisions[i]);
					continue;
				}
				if (defTypes.indexOf("Grass") >= 0) {
					res.unviable.push(decisions[i]);
					continue;
				}
			}
			if (move.id === "stockpile") {
				if (conditionsA.volatiles["stockpile3"]) {
					res.unviable.push(decisions[i]);
					continue;
				}
			}
			if (move.id === "rest" && battle.gen > 6 && pokeA.isGrounded() && battle.conditions['electricterrain']) {
				res.unviable.push(decisions[i]);
				continue;
			}
			if (move.id in { "auroraveil": 1, "gmaxresonance": 1 } && battle.conditions.weather !== "hail") {
				res.unviable.push(decisions[i]);
				continue;
			}
			if (move.id in { "spikes": 1, "toxicspikes": 1, "stealthrock": 1, "stickyweb": 1, "gmaxcannonade": 1, "gmaxsteelsurge": 1 }) {
				if (foe.countAlivePokemon() < 2) {
					res.unviable.push(decisions[i]);
					continue;
				}
			}
			switch (move.id) {
				case "spikes":
					if (foeCanSwitch(battle, foe) && conditionsB.side["spikes"] !== 3) res.viable.push(decisions[i]);
					else res.unviable.push(decisions[i]);
					continue;
				case "toxicspikes":
					if (foeCanSwitch(battle, foe) && conditionsB.side["toxicspikes"] !== 2) res.viable.push(decisions[i]);
					else res.unviable.push(decisions[i]);
					continue;
				case "gmaxstonesurge":
				case "stealthrock":
					if (foeCanSwitch(battle, foe) && !conditionsB.side["stealthrock"]) res.viable.push(decisions[i]);
					else res.unviable.push(decisions[i]);
					continue;
				case "gmaxsteelsurge":
					if (foeCanSwitch(battle, foe) && !conditionsB.side["gmaxsteelsurge"]) res.viable.push(decisions[i]);
					else res.unviable.push(decisions[i]);
					continue;
				case "stickyweb":
					if (foeCanSwitch(battle, foe) && !conditionsB.side["stickyweb"]) res.viable.push(decisions[i]);
					else res.unviable.push(decisions[i]);
					continue;
				case "gmaxvinelash":
				case "gmaxvolcalith":
				case "gmaxwildfire":
				case "gmaxcannonade":
					if (!conditionsB.side[move.id]) res.viable.push(decisions[i]);
					else res.unviable.push(decisions[i]);
					continue;
				case "wish":
					if (findAnyNotNull(battle.self.active).helpers.lastMove !== "wish") res.viable.push(decisions[i]);
					else res.unviable.push(decisions[i]);
					continue;
				case "rapidspin":
				case "mortalspin":
					if (selfCanSwitch(battle) && countHazards(conditionsA.side, true) > 0) {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "defog":
				case "tidyup":
					if (battle.gen < 6) {
						// Defog does not work before gen 6
						res.unviable.push(decisions[i]);
						continue;
					}
					if (selfCanSwitch(battle) && (countHazards(conditionsA.side) > 0 || countHazards(conditionsB.side) < 0)) {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "gmaxwindrage":
					if (selfCanSwitch(battle) && (countHazards(conditionsA.side) > 0 || countHazards(conditionsB.side) < 0)) {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "courtchange":
					if (selfCanSwitch(battle) && countHazards(conditionsA.side) > countHazards(conditionsB.side)) {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "sleeptalk":
					if (pokeA.ability && pokeA.ability.id === "comatose") {
						res.viable.push(decisions[i]);
					} else if (pokeA.status === "slp") {
						if (typeof findAnyNotNull(battle.self.active).helpers.sleepCounter === "number") {
							if (findAnyNotNull(battle.self.active).helpers.sleepCounter < 2) res.sleepTalk = decisions[i];
						}
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "substitute":
					if (!conditionsA.volatiles["substitute"] && pokeA.hp > 25) res.viable.push(decisions[i]);
					else res.unviable.push(decisions[i]);
					continue;
				case "leechseed":
					if (!conditionsB.volatiles["leechseed"] && defTypes.indexOf("Grass") < 0) res.viable.push(decisions[i]);
					else res.unviable.push(decisions[i]);
					continue;
				case "endeavor":
				case "painsplit":
					if (pokeA.hp < pokeB.hp) res.viable.push(decisions[i]);
					else res.unviable.push(decisions[i]);
					continue;
				case "bellydrum":
					if (pokeA.hp >= 60 && conditionsA.boosts.atk && conditionsA.boosts.atk < 3) res.viable.push(decisions[i]);
					else res.unviable.push(decisions[i]);
					continue;
				case "filletaway":
					if (pokeA.hp >= 60 && conditionsA.boosts.atk && conditionsA.boosts.atk < 2) res.viable.push(decisions[i]);
					else res.unviable.push(decisions[i]);
					continue;
				case "shedtail":
					if (pokeA.hp >= 60) res.viable.push(decisions[i]);
					else res.unviable.push(decisions[i]);
					continue;
				case "geomancy":
					if (pokeA.item && pokeA.item.id === "powerherb" && !battle.conditions["magicroom"] && !conditionsA.volatiles["embargo"]) res.viable.push(decisions[i]);
					else if (!pokeA.item) res.unviable.push(decisions[i]);
					continue;
				case "destinybond":
					res.viable.push(decisions[i]);
					continue;
				case "disable":
				case "encore":
					if (!conditionsB.volatiles[move.volatileStatus] && foeActivePokemon.helpers.sw && foeActivePokemon.helpers.lastMove && foeActivePokemon.helpers.lastMove !== "struggle" && foeActivePokemon.helpers.sw && battle.turn - foeActivePokemon.helpers.sw > 1 && foeActivePokemon.helpers.lastMoveTurn > foeActivePokemon.helpers.sw) {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "attract":
					if (!conditionsB.volatiles[move.volatileStatus] && (pokeA.gender === "M" || pokeA.gender === "F") && (pokeB.gender === "M" || pokeB.gender === "F") && (pokeA.gender !== pokeB.gender)) {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "curse":
					if (offTypes.indexOf("Ghost") >= 0) {
						if (!conditionsB.volatiles[move.volatileStatus]) res.viable.push(decisions[i]);
						else res.unviable.push(decisions[i]);
					} else {
						let curseBoosts = { "atk": 1, "def": 1 };
						let alCurBoost = 0;
						for (let cb in curseBoosts) {
							alCurBoost++;
							if (conditionsA.boosts[cb] && conditionsA.boosts[cb] >= 6) alCurBoost--;
						}
						if (alCurBoost > 0) res.viable.push(decisions[i]);
						else res.unviable.push(decisions[i]);
					}
					continue;
				case "yawn":
					if (!conditionsB.volatiles[move.volatileStatus] && pokeB.status !== "slp") {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "foresight":
				case "odorsleuth":
					if (!conditionsB.volatiles[move.volatileStatus] && defTypes.indexOf("Ghost") >= 0) {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "gastroacid":
					if (pokeB.item && pokeB.item.id === "abilityshield" && !battle.conditions["magicroom"] && !conditionsB.volatiles["embargo"]) {
						res.unviable.push(decisions[i]);
						continue;
					}
					if (foeActivePokemon.helpers.hasAbilityCannotBeDisabled) {
						res.unviable.push(decisions[i]);
						continue;
					}
					if (!foeActivePokemon.supressedAbility) {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "simplebeam":
					if (pokeB.item && pokeB.item.id === "abilityshield" && !battle.conditions["magicroom"] && !conditionsB.volatiles["embargo"]) {
						res.unviable.push(decisions[i]);
						continue;
					}
					if (foeActivePokemon.helpers.hasAbilityCannotBeDisabled) {
						res.unviable.push(decisions[i]);
						continue;
					}
					if (!pokeB.ability || pokeB.ability.id !== "simple") {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "worryseed":
					if (pokeB.item && pokeB.item.id === "abilityshield" && !battle.conditions["magicroom"] && !conditionsB.volatiles["embargo"]) {
						res.unviable.push(decisions[i]);
						continue;
					}
					if (foeActivePokemon.helpers.hasAbilityCannotBeDisabled) {
						res.unviable.push(decisions[i]);
						continue;
					}
					if (!pokeB.ability || pokeB.ability.id !== "insomnia") {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "entrainment":
					if (pokeB.item && pokeB.item.id === "abilityshield" && !battle.conditions["magicroom"] && !conditionsB.volatiles["embargo"]) {
						res.unviable.push(decisions[i]);
						continue;
					}
					if (pokeA.ability && pokeB.ability && pokeA.ability.id !== pokeB.ability.id && !EntrainmentFails.has(pokeB.ability.id) && !foeActivePokemon.helpers.hasAbilityCannotBeEntrainment) {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "doodle":
					if (pokeA.ability && pokeB.ability && pokeA.ability.id !== pokeB.ability.id) {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "skillswap":
					if (pokeB.item && pokeB.item.id === "abilityshield" && !battle.conditions["magicroom"] && !conditionsB.volatiles["embargo"]) {
						res.unviable.push(decisions[i]);
						continue;
					}
					if (pokeA.ability && pokeB.ability && pokeA.ability.id !== pokeB.ability.id && !SkillSwapFails.has(pokeB.ability.id) && !foeActivePokemon.helpers.hasAbilityCannotBeSwapped) {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "nightmare":
					if (!conditionsB.volatiles[move.volatileStatus] && pokeB.status === "slp") {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "perishsong":
					if (!conditionsB.volatiles["perish3"] && !conditionsB.volatiles["perish2"] && !conditionsB.volatiles["perish1"]) {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "reflect":
					if (conditionsA.volatiles["reflect"]) { // Gen 1
						res.unviable.push(decisions[i]);
					}
					continue;
				case "soak":
					if (!conditionsB.volatiles["typechange"] && defTypes.join() !== "Water") {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "trickortreat":
					if (!conditionsB.volatiles["typechange"] && defTypes.indexOf("Ghost") === -1) {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
				case "forestscurse":
					if (!conditionsB.volatiles["typechange"] && defTypes.indexOf("Grass") === -1) {
						res.viable.push(decisions[i]);
					} else {
						res.unviable.push(decisions[i]);
					}
					continue;
			}
			if (move.target !== "self" && move.target !== "allySide" && move.target !== "allyTeam" && move.target !== "foeSide" && move.ignoreImmunity === false) {
				let mvCat = move.category;
				let mvBp = move.basePower;
				move.basePower = 50;
				move.category = "Physical";
				if (Calc.calculate(pokeA, pokeB, move, conditionsA, conditionsB, battle.conditions, battle.gen).getMax() === 0) {
					move.basePower = mvBp;
					move.category = mvCat;
					res.unviable.push(decisions[i]);
					continue;
				} else {
					move.basePower = mvBp;
					move.category = mvCat;
				}
			}
			if (move.target === 'allySide' && move.sideCondition) {
				if (!conditionsA.side[Text.toId(move.sideCondition)]) res.viable.push(decisions[i]);
				else res.unviable.push(decisions[i]);
				continue;
			}
			let singleTurnMoves = { "protect": 1, "detect": 1, "endure": 1, "kingsshield": 1, "quickguard": 1, "spikyshield": 1, "silktrap": 1, "wideguard": 1, "maxguard": 1, "obstruct": 1 };
			if (move.id in singleTurnMoves) {
				if (findAnyNotNull(battle.self.active).helpers.lastMove in singleTurnMoves) res.unviable.push(decisions[i]);
				else res.viable.push(decisions[i]);
				continue;
			}
			if (move.id in { "refresh": 1, "healbell": 1, "aromatherapy": 1 }) {
				battle.debug(move.id);
				if (selfHasStatus(battle)) res.viable.push(decisions[i]);
				else res.unviable.push(decisions[i]);
				continue;
			}
			if (move.id in { "haze": 1 }) {
				let boostsHaze = 0;
				for (let j in conditionsB.boosts) {
					if (conditionsB.boosts[j] > 0) boostsHaze++;
				}
				if (boostsHaze) {
					res.viable.push(decisions[i]);
				} else {
					res.unviable.push(decisions[i]);
				}
				continue;
			}
			if (move.id in { "heartswap": 1, "powerswap": 1, "guardswap": 1 }) {
				let boostSelf = 0;
				for (let j in conditionsA.boosts) {
					if (move.id === "powerswap" && j !== "atk" && j !== "spa") continue;
					if (move.id === "guardswap" && j !== "def" && j !== "spd") continue;
					boostSelf += conditionsA.boosts[j];
				}
				let boostFoe = 0;
				for (let j in conditionsB.boosts) {
					if (move.id === "powerswap" && j !== "atk" && j !== "spa") continue;
					if (move.id === "guardswap" && j !== "def" && j !== "spd") continue;
					boostFoe += conditionsB.boosts[j];
				}
				if (boostSelf < boostFoe) {
					res.viable.push(decisions[i]);
				} else {
					res.unviable.push(decisions[i]);
				}
				continue;
			}
			if (move.id in { "revivalblessing": 1 }) {
				const faintedPokemon = battle.countFaintedPokemon().fainted;
				if (faintedPokemon > 0) {
					res.viable.push(decisions[i]);
				} else {
					res.unviable.push(decisions[i]);
				}
			}
			if (move.id in { "batonpass": 1 }) {
				let boostsToPass = 0;
				for (let j in conditionsA.boosts) {
					boostsToPass += conditionsA.boosts[j];
				}
				const livePokemon = battle.countFaintedPokemon().alive;
				if (livePokemon > 0 && boostsToPass > 0 && !conditionsA.volatiles["perish3"] && !conditionsA.volatiles["perish2"] && !conditionsA.volatiles["perish1"]) {
					res.viable.push(decisions[i]);
				} else {
					res.unviable.push(decisions[i]);
				}
				continue;
			}
			if (move.id in { "whirlwind": 1, "roar": 1 }) {
				if (foeCanSwitch(battle, foe) && !conditionsB.volatiles["ingrain"]) {
					res.viable.push(decisions[i]);
				} else {
					res.unviable.push(decisions[i]);
				}
				continue;
			}
			if (move.status) {
				if (pokeB.status || (pokeB.isGrounded() && battle.conditions['mistyterrain'])) {
					res.unviable.push(decisions[i]);
					continue;
				}
				if (pokeB.ability && (pokeB.ability.id in { 'purifyingsalt': 1, 'comatose': 1 })) {
					res.unviable.push(decisions[i]);
					continue;
				}
				if (move.status === "par") {
					if (battle.gen > 5 && defTypes.indexOf("Electric") >= 0) {
						res.unviable.push(decisions[i]);
						continue;
					}
				} else if (move.status === "brn") {
					if (defTypes.indexOf("Fire") >= 0) {
						res.unviable.push(decisions[i]);
						continue;
					}
				} else if (move.status === "psn" || move.status === "tox") {
					if (defTypes.indexOf("Poison") >= 0) {
						res.unviable.push(decisions[i]);
						continue;
					}
					if (battle.gen > 2 && defTypes.indexOf("Steel") >= 0) {
						res.unviable.push(decisions[i]);
						continue;
					}
				} else if (move.status === "slp") {
					if (battle.rules.indexOf("Sleep Clause Mod") >= 0 && alreadyOppSleeping(battle, foe)) {
						res.unviable.push(decisions[i]);
						continue;
					} else if (pokeB.isGrounded() && battle.conditions['electricterrain']) {
						res.unviable.push(decisions[i]);
						continue;
					}
				}
				res.viable.push(decisions[i]);
				continue;
			}
			if (move.heal || move.id in { "rest": 1, "synthesis": 1, "morningsun": 1, "moonlight": 1 }) {
				if (pokeA.hp > 85) {
					res.unviable.push(decisions[i]);
					continue;
				} else {
					res.viable.push(decisions[i]);
					continue;
				}
			}
			if (move.boosts && move.target === "self") {
				if (pokeA.hp < 75) {
					res.unviable.push(decisions[i]);
					continue;
				}
				let alreadyBoost = 0;
				for (let b in move.boosts) {
					alreadyBoost++;
					if (conditionsA.boosts[b] && conditionsA.boosts[b] >= 6) { // Max
						alreadyBoost--;
					}
				}
				if (alreadyBoost > 0) {
					res.viable.push(decisions[i]);
				} else {
					res.unviable.push(decisions[i]);
				}
				continue;
			} else if (move.boosts) {
				let sumBoost = 0;
				let usefulBoosts = 0;
				for (let b in move.boosts) {
					sumBoost += move.boosts[b];
					if (move.boosts[b] > 0 || !conditionsB.boosts[b] || conditionsB.boosts[b] > -6) {
						usefulBoosts++;
					}
				}

				if (usefulBoosts < 0) {
					res.unviable.push(decisions[i]);
					continue;
				} else if (sumBoost < 0 && ((pokeB.item && pokeB.item.id === "clearamulet" && !battle.conditions["magicroom"] && !conditionsB.volatiles["embargo"]) || (pokeB.ability && pokeB.ability.id === "clearbody"))) {
					res.unviable.push(decisions[i]);
					continue;
				}
			}
			if (move.id in { "supersonic": 1, "swagger": 1, "sweetkiss": 1, "confuseray": 1, "teeterdance": 1, "flatter": 1, "embargo": 1, "taunt": 1, "telekinesis": 1, "torment": 1, "healblock": 1 }) {
				if (move.volatileStatus === "confusion") {
					if (pokeB.isGrounded() && battle.conditions['mistyterrain']) {
						res.unviable.push(decisions[i]);
						continue;
					}
				}
				if (conditionsB.volatiles[move.volatileStatus]) {
					res.unviable.push(decisions[i]);
				} else {
					res.viable.push(decisions[i]);
				}
				continue;
			}
			if (move.id in { "ingrain": 1, "acuaring": 1, "focusenergy": 1, "imprison": 1, "magnetrise": 1, "powertrick": 1 }) {
				if (conditionsA.volatiles[move.volatileStatus]) {
					res.unviable.push(decisions[i]);
				} else {
					res.viable.push(decisions[i]);
				}
				continue;
			}
			if (move.weather && battle.conditions.weather) {
				let weather = Text.toId(battle.conditions.weather);
				if (weather && ((weather in { 'desolateland': 1, 'primordialsea': 1, 'deltastream': 1 }) || weather === Text.toId(move.weather))) {
					res.unviable.push(decisions[i]);
				} else {
					res.viable.push(decisions[i]);
				}
				continue;
			}
			if (move.target === 'all') {
				if (battle.conditions[move.id]) {
					res.unviable.push(decisions[i]);
				} else {
					res.viable.push(decisions[i]);
				}
				continue;
			}
			if (move.id === 'metronome') {
				res.viable.push(decisions[i]);
				continue;
			}
			res.unviable.push(decisions[i]);
		}
		return res;
	};

	let getViableDamageMoves = BattleModule.getViableDamageMoves = function (battle, decisions) {
		let res = {
			ohko: [], // +90% -> replace status moves
			thko: [], // +50% -> No switch
			meh: [], // +30% -> shitch only if better types
			bad: [], // 0-29 -> better types or same types and better damage
			immune: [],
			total: 0,
		};
		let sideId = 0; // Active, singles
		let pokeA = battle.getCalcRequestPokemon(sideId, true);
		let originalTera = pokeA.tera;
		let conditionsA = new Conditions({
			side: battle.self.side,
			volatiles: findAnyNotNull(battle.self.active).volatiles,
			boosts: findAnyNotNull(battle.self.active).boosts,
			inmediate: { beatup_bp: battle.getBeatupBasePower(), last_respects_bp: battle.getLastRespectsBasePower() }
		});
		for (let i = 0; i < decisions.length; i++) {
			let validDes = findValidDecision(decisions[i], ['move']);
			if (!validDes) continue;
			let des = validDes.des;
			let act = validDes.act;
			if (des.type !== "move") continue; // not a move

			if (des.terastallize && battle.request.active && battle.request.active[sideId] && battle.request.active[sideId].canTerastallize) {
				pokeA.tera = battle.request.active[sideId].canTerastallize;
				pokeA.typechange = [pokeA.tera];
			} else {
				pokeA.tera = originalTera;
				pokeA.typechange = null;
			}

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
				dmove.basePower = Data.getMaxPower(move.basePower || 0, Text.toId(dmove.name), move.isMax);
				dmove.category = move.category;
				dmove.isMaxModified = true;
				move = dmove;
			}

			if (a.canMegaEvo || p.canMegaEvo) {
				// Mega evolve by default
				if (!des.mega) {
					res.immune.push(decisions[i]);
					continue;
				}
			}

			if (a.canUltraBurst) {
				// Ultra burst always
				if (!des.ultra) {
					res.immune.push(decisions[i]);
					continue;
				}
			}

			if (move.category !== "Physical" && move.category !== "Special") continue; // Status move

			let targets = [];
			if (typeof des.target === "number") {
				targets = [getSpecificTarget(battle, des.target)];

				if (moveIsRedirectedImmune(battle, move, pokeA, conditionsA)) {
					res.immune.push(decisions[i]);
					continue;
				}
			} else {
				targets = getTargets(battle);
			}

			for (let j = 0; j < targets.length; j++) {
				if (!targets[j]) continue;
				if (targets[j].pokemon.fainted) continue;

				let pokeB = suposeActiveFoe(battle, targets[j]);

				let conditionsB = new Conditions({
					side: targets[j].player.side,
					volatiles: targets[j].pokemon.volatiles,
					boosts: targets[j].pokemon.boosts,
				});

				let defTypes = pokeB.template.types.slice();
				if (conditionsB.volatiles["zoroark"]) {
					defTypes = ["Dark"];
				} else if (conditionsB.volatiles["zoroarkhisui"]) {
					defTypes = ["Normal", "Ghost"];
				}
				if (conditionsB.volatiles["typechange"] && conditionsB.volatiles["typechange"].length) defTypes = conditionsB.volatiles["typechange"].slice();
				if (conditionsB.volatiles["typeadd"]) defTypes.push(conditionsB.volatiles["typeadd"]);
				if (pokeB.typechange && pokeB.typechange.length) {
					defTypes = pokeB.typechange.slice();
				} else if (pokeB.tera && (!conditionsB.volatiles["typechange"] || !conditionsB.volatiles["typechange"].length)) {
					defTypes = [pokeB.tera];
				}

				const pokeAIgnoredAbility = battle.gen < 3 || pokeA.supressedAbility || ((battle.conditions["magicroom"] || conditionsA.volatiles["embargo"] || !pokeA.item || pokeA.item.id !== "abilityshield") && (battle.conditions["neutralizinggas"]));

				let dmgData = Calc.calculate(pokeA, pokeB, move, conditionsA, conditionsB, battle.conditions, battle.gen);
				let dmg = dmgData.getMax();
				let dmgMin = dmgData.getMin();
				if (move.ohko) {
					if (!pokeA.ability || !pokeAIgnoredAbility || !(pokeA.ability.id in { 'noguard': 1 })) {
						dmg = dmg * (0.3 * (pokeA.level / (pokeB.level || 100)));
						dmgMin = dmgMin * (0.3 * (pokeA.level / (pokeB.level || 100)));
					}
				}
				let hp = pokeB.hp;
				if (dmg === 0 || move.id === "struggle") {
					res.immune.push(decisions[i]);
					continue;
				}
				let pc = dmg * 100 / hp;
				let pcMin = dmgMin * 100 / hp;
				battle.debug("Move: " + move.name + " | Target: " + pokeB.name + " | Damage = " + dmg + " | Percent: " + pc);
				if (move.id === "fakeout") {
					if (findAnyNotNull(battle.self.active).helpers.sw === battle.turn || findAnyNotNull(battle.self.active).helpers.sw === battle.turn - 1) {
						if (TypeChart.getMultipleEff("Normal", defTypes, battle.gen, true, !!battle.conditions["inversebattle"]) >= 1) {
							if (pc >= 90) {
								res.ohko.push(decisions[i]);
							} else {
								res.thko.push(decisions[i]);
							}
							res.total++;
							continue;
						}
					} else {
						res.immune.push(decisions[i]);
						continue;
					}
				} else if (move.id === "firstimpression") {
					if (!(findAnyNotNull(battle.self.active).helpers.sw === battle.turn || findAnyNotNull(battle.self.active).helpers.sw === battle.turn - 1)) {
						res.immune.push(decisions[i]);
						continue;
					}
				} else if (move.id === "futuresight") {
					if (findAnyNotNull(battle.self.active).volatiles && findAnyNotNull(battle.self.active).volatiles['futuresight']) {
						res.immune.push(decisions[i]);
						continue;
					}
				}
				res.total++;
				if (pcMin >= 100) {
					res.ohko.push(decisions[i]);
				} else if (pc >= 50) {
					res.thko.push(decisions[i]);
				} else if (pc >= 30) {
					res.meh.push(decisions[i]);
				} else {
					res.bad.push(decisions[i]);
				}
			}
		}
		return res;
	};

	function debugBestMove(battle, bestSw, damageMoves, supportMoves) {
		let bSwitchSingle = bestSw ? findValidDecision(bestSw, 'switch') : null;
		battle.debug("Best switch: " + (bSwitchSingle ? bSwitchSingle.des.poke : "none"));
		let tmp;
		for (let i in damageMoves) {
			if (!damageMoves[i] || !damageMoves[i].length) continue;
			tmp = [];
			for (let j = 0; j < damageMoves[i].length; j++) {
				let vd = findValidDecision(damageMoves[i][j], 'move');
				if (!vd) continue;
				tmp.push(vd.des.move);
			}
			battle.debug("Damage Moves (" + i + ") -> " + tmp);
		}
		for (let i in supportMoves) {
			if (!supportMoves[i] || !supportMoves[i].length) continue;
			tmp = [];
			for (let j = 0; j < supportMoves[i].length; j++) {
				let vd = findValidDecision(supportMoves[i][j], 'move');
				if (!vd) continue;
				tmp.push(vd.des.move);
			}
			battle.debug("Support Moves (" + i + ") -> " + tmp);
		}
	}

	let getBestMove = BattleModule.getBestMove = function (battle, decisions) {
		let bestSW = BattleModule.getBestSwitch(battle, decisions);
		let damageMoves = getViableDamageMoves(battle, decisions);
		let supportMoves = getViableSupportMoves(battle, decisions);

		let ev = evaluatePokemon(battle, 0);
		let evNoMega = evaluatePokemon(battle, 0, true);

		debugBestMove(battle, bestSW, damageMoves, supportMoves);

		/* Special switch cases */

		let switchIfNoOption = false;
		let pokeA = battle.getCalcRequestPokemon(0, true);
		let conditionsA = new Conditions({
			side: battle.self.side,
			volatiles: findAnyNotNull(battle.self.active).volatiles,
			boosts: findAnyNotNull(battle.self.active).boosts,
			inmediate: { beatup_bp: battle.getBeatupBasePower(), last_respects_bp: battle.getLastRespectsBasePower() }
		});
		if (bestSW) {
			if (conditionsA.volatiles["perish1"] && bestSW) return bestSW; // Perish Song
			if ((!pokeA.item || pokeA.item.id !== "heavydutyboots" || battle.conditions["magicroom"] || conditionsA.volatiles["embargo"]) && Calc.getHazardsDamage(pokeA, conditionsA, battle.gen, !!battle.conditions["inversebattle"]) > pokeA.hp) bestSW = null; //No switch if you die
			if (conditionsA.volatiles["substitute"] && damageMoves.meh.length) bestSW = null;
			if (conditionsA.volatiles["leechseed"]) switchIfNoOption = true;
			if (conditionsA.boosts["spa"] && conditionsA.boosts["spa"] < 1) switchIfNoOption = true;
			if (conditionsA.boosts["atk"] && conditionsA.boosts["atk"] < 1) switchIfNoOption = true;
		}

		/* Normal situations */

		if (damageMoves.ohko.length) {
			if (supportMoves.sleepTalk) return supportMoves.sleepTalk;
			return damageMoves.ohko[Math.floor(Math.random() * damageMoves.ohko.length)];
		} else if (damageMoves.thko.length) {
			if (supportMoves.sleepTalk) return supportMoves.sleepTalk;
			if (supportMoves.viable.length && (Math.random() * 100) > 50) {
				return supportMoves.viable[Math.floor(Math.random() * supportMoves.viable.length)];
			} else {
				return damageMoves.thko[Math.floor(Math.random() * damageMoves.thko.length)];
			}
		} else if (damageMoves.meh.length) {
			let moves = damageMoves.meh.concat(supportMoves.viable);
			let bestSwitchDecision = bestSW ? findValidDecision(bestSW, 'switch') : null;
			if (bestSW && bestSwitchDecision) {
				let evBS = evaluatePokemon(battle, bestSwitchDecision.des.pokeId);
				if ((evBS.t < ev.t && evBS.t < evNoMega.t) || (evBS.t === ev.t && evBS.d > ev.d)) {
					return bestSW;
				} else {
					if (supportMoves.sleepTalk) return supportMoves.sleepTalk;
					return moves[Math.floor(Math.random() * moves.length)];
				}
			} else {
				if (supportMoves.sleepTalk) return supportMoves.sleepTalk;
				return moves[Math.floor(Math.random() * moves.length)];
			}
		} else if (damageMoves.bad.length || supportMoves.viable.length) {
			let moves = damageMoves.bad.concat(supportMoves.viable);
			let bestSwitchDecision = bestSW ? findValidDecision(bestSW, 'switch') : null;
			if (bestSW && bestSwitchDecision) {
				let evBS = evaluatePokemon(battle, bestSwitchDecision.des.pokeId);
				if ((evBS.t < ev.t && evBS.t < evNoMega.t) || (evBS.t === ev.t && evBS.d > ev.d) || switchIfNoOption) {
					return bestSW;
				} else {
					if (supportMoves.sleepTalk) return supportMoves.sleepTalk;
					return moves[Math.floor(Math.random() * moves.length)];
				}
			} else {
				if (supportMoves.sleepTalk) return supportMoves.sleepTalk;
				return moves[Math.floor(Math.random() * moves.length)];
			}
		} else if (bestSW) {
			return bestSW;
		} else {
			return decisions[Math.floor(Math.random() * decisions.length)];
		}
	};

	/* Switches */

	let getBestSwitch = BattleModule.getBestSwitch = function (battle, decisions) {
		let chosen = null;
		let tmp, maxi = null;
		for (let i = 0; i < decisions.length; i++) {
			let validDes = findValidDecision(decisions[i], ['switch']);
			if (!validDes) continue;
			let des = validDes.des;
			if (des.type !== "switch") continue; // not a move

			tmp = evaluatePokemon(battle, des.pokeId);
			if (maxi === null) {
				maxi = tmp;
				chosen = decisions[i];
			} else if (maxi.t > tmp.t || (maxi.t === tmp.t && maxi.d < tmp.d)) {
				maxi = tmp;
				chosen = decisions[i];
			}
		}
		return chosen;
	};

	/* Swapper */

	BattleModule.decide = function (battle, decisions) {
		if (battle.request.forceSwitch) {
			return getBestSwitch(battle, decisions);
		} else if (battle.request.active) {
			return getBestMove(battle, decisions);
		} else {
			return decisions[Math.floor(Math.random() * decisions.length)];
		}
	};

	return BattleModule;
};
