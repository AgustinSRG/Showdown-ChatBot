/**
 * Pokemon Showdown Bot - Damage calculator
 */

'use strict';

const Path = require('path');

const typechart = require(Path.resolve(__dirname, 'typechart.js'));

class Pokemon {
	constructor(template, properties) {
		if (!template || typeof template !== "object") throw new Error("Invalid pokemon template");
		this.template = template;
		this.name = this.template.species;
		this.species = this.template.species;
		this.gender = false;
		this.item = null;
		this.stats = {};
		this.evs = {};
		this.ivs = {};
		this.dvs = {};
		this.nature = null;
		this.ability = null;
		this.level = 100;
		this.shiny = false;
		this.happiness = 255;
		this.status = false;
		this.hp = 100;
		for (let i in properties) {
			if (typeof this[i] === "undefined" || typeof this[i] === "function") continue;
			if (i === "template") continue;
			this[i] = properties[i];
		}
	}

	isGrounded() {
		if (this.template.types.indexOf("Flying") >= 0) return false;
		if (this.ability && this.ability.id === "levitate") return false;
		if (this.item && this.item.id === "airballoon") return false;
		return true;
	}

	getEV(ev) {
		return this.evs[ev] || 0;
	}

	getIV(iv) {
		return this.ivs[iv] || 31;
	}

	getDV(dv) {
		return this.dvs[dv] || 15;
	}

	getBaseStat(stat) {
		if (this.template && this.template.baseStats) {
			return this.template.baseStats[stat] || 0;
		} else {
			return 0;
		}
	}

	getStats(gen) {
		if (!gen) gen = 8;
		let stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
		let res = {};
		for (let i = 0; i < stats.length; i++) {
			if (this.stats[stats[i]]) {
				res[stats[i]] = this.stats[stats[i]];
				continue;
			}
			if (gen <= 2) {
				if (stats[i] === 'hp') {
					res[stats[i]] = Math.floor(((this.getBaseStat(stats[i]) + this.getDV(stats[i])) * 2 + Math.floor((Math.sqrt(65024) + 1) / 4)) * this.level / 100) + 10 + this.level;
				} else {
					res[stats[i]] = Math.floor(((this.getBaseStat(stats[i]) + this.getDV(stats[i])) * 2 + Math.floor((Math.sqrt(65024) + 1) / 4)) * this.level / 100) + 5;
				}
			} else {
				if (stats[i] === 'hp') {
					res[stats[i]] = Math.floor((2 * this.getBaseStat(stats[i]) + this.getIV(stats[i]) + this.getEV(stats[i])) * this.level / 100 + this.level + 10);
				} else {
					res[stats[i]] = Math.floor(Math.floor((2 * this.getBaseStat(stats[i]) + this.getIV(stats[i]) + this.getEV(stats[i])) * this.level / 100 + 5) * (this.nature ? (this.nature.value || 1) : 1));
				}
			}
		}
		return res;
	}
}

class Conditions {
	constructor(data) {
		if (typeof data !== "object") throw new Error("Invalid conditions data");
		this.volatiles = {};
		this.boosts = {};
		this.side = {};
		this.inmediate = {};
		for (let i in data) {
			if (typeof this[i] === "undefined" || typeof this[i] === "function") continue;
			this[i] = data[i];
		}
	}
}

class Damage {
	constructor(hp, rolls) {
		this.rolls = rolls || [];
		this.hp = hp || 0;
		this.percents = [];
		for (let i = 0; i < this.rolls.length; i++) {
			if (hp === 0) {
				this.percents.push(100);
				continue;
			}
			this.percents.push(this.rolls[i] * 100 / hp);
		}
	}

	getChance(p) {
		if (!this.percents || this.percents.length) return 0;
		if (!this.hp || this.hp <= 0) return 100;
		let s = 0;
		for (let i = 0; i < this.percents.length; i++) {
			if (this.percents[i] >= p) s++;
		}
		return (s * 100 / this.percents.length);
	}

	getMax() {
		if (!this.percents.length) return 0;
		return this.percents[this.percents.length - 1];
	}

	getMin() {
		if (!this.percents.length) return 0;
		return this.percents[0];
	}
}

exports.Pokemon = Pokemon;
exports.Conditions = Conditions;
exports.Damage = Damage;

const getRolls = exports.getRolls = function (n, p) {
	if (!p) p = 0.85;
	let r = [];
	for (let m = n * p; m <= n; m++) {
		r.push(m);
	}
	return r;
};

exports.getHazardsDamage = function (poke, conditions, gen, inverse) {
	let dmg = 0;
	let side = conditions.side;
	if (gen >= 3 && poke.ability && poke.ability.id === "magicguard") return 0;
	if (side["stealthrock"]) {
		dmg += (100 / 8) * typechart.getMultipleEff("Rock", poke.template.types, gen, inverse);
	}
	if (side["spikes"]) {
		if (typechart.getMultipleEff("Ground", poke.template.types, gen, inverse) !== 0 && (gen < 3 || !poke.ability || poke.ability.id !== "levitate")) {
			dmg += (100 / 24) * (side["spikes"] || 1);
		}
	}
	return dmg;
};

/*
 * Damage calculator function
 *
 * Arguments:
 *
 *  - pokeA, pokeB (Pokemon)
 *  - move (move template)
 *
 * Optional arguments:
 *
 *  - conditionsA, conditionsB (Conditions)
 *  - gconditions (Global conditions)
 *  - gen (6 by default)
*/

exports.calculate = function (pokeA, pokeB, move, conditionsA, conditionsB, gconditions, gen) {
	if (!gen) gen = 8;
	if (!gconditions) gconditions = {};
	if (!conditionsA) conditionsA = {};
	if (!conditionsB) conditionsB = {};

	let offTypes = pokeA.template.types.slice();
	if (conditionsA.volatiles["typechange"] && conditionsA.volatiles["typechange"].length) offTypes = conditionsA.volatiles["typechange"].slice();
	if (conditionsA.volatiles["typeadd"]) offTypes.push(conditionsA.volatiles["typeadd"]);

	let statsA = pokeA.getStats(gen), statsB = pokeB.getStats(gen);

	let atk, def, bp, atkStat, defStat;
	let cat, defcat;

	let targetHP = statsB.hp;

	if (conditionsB.volatiles['dynamax']) {
		targetHP = targetHP * 2; // Dynamax doubles hp
	}

	/******************************
	* Attack and Defense Stats
	*******************************/
	if (gen > 3) {
		if (move.category === "Special") {
			atk = move.useSourceDefensiveAsOffensive ? statsA.spd : statsA.spa;
			atkStat = "spa";
		} else if (move.category === "Physical") {
			atk = move.useSourceDefensiveAsOffensive ? statsA.def : statsA.atk;
			atkStat = "atk";
		} else {
			return new Damage(targetHP);
		}
		cat = defcat = move.category;
		if (move.defensiveCategory) defcat = move.defensiveCategory;
		if (defcat === "Special") {
			def = statsA.spd;
			defStat = "spd";
		} else {
			def = statsA.def;
			defStat = "def";
		}
	} else {
		let specialTypes = { Fire: 1, Water: 1, Grass: 1, Ice: 1, Electric: 1, Dark: 1, Psychic: 1, Dragon: 1 };
		if (move.type && move.type in specialTypes) {
			cat = defcat = "Special";
			atk = statsA.spa;
			atkStat = "spa";
		} else {
			cat = defcat = "Physical";
			atk = statsA.atk;
			atkStat = "atk";
		}
		if (move.defensiveCategory) defcat = move.defensiveCategory;
		if (defcat === "Special") {
			def = statsA.spd;
			defStat = "spd";
		} else {
			def = statsA.def;
			defStat = "def";
		}
	}

	if (atkStat === "atk" && pokeA.status === "brn") {
		if (gen < 3 || !pokeA.ability || pokeA.ability.id !== "guts") atk = Math.floor(atk * 0.5);
	}

	/******************************
	* Inmunity (0 damage)
	* Types (effectiveness)
	*******************************/

	let typesMux = 1;
	let moveType = move.type;
	let inmune = false;
	let noLevitation = false;

	if (gconditions['gravity'] || conditionsB.volatiles['smackdown']) {
		noLevitation = true;
	}

	switch (move.id) {
		case "naturalgift":
			if (pokeA.item && pokeA.item.naturalGift && pokeA.item.naturalGift.type) moveType = pokeA.item.naturalGift.type;
			else moveType = "Normal";
			break;
		case "judgment":
			if (pokeA.item && pokeA.item.onPlate) moveType = pokeA.item.onPlate;
			else moveType = "Normal";
			break;
		case "weatherball":
			if (gconditions.weather === "primordialsea" || gconditions.weather === "raindance") moveType = "Water";
			else if (gconditions.weather === "desolateland" || gconditions.weather === "sunnyday") moveType = "Fire";
			else if (gconditions.weather === "sandstorm") moveType = "Rock";
			else if (gconditions.weather === "hail") moveType = "Ice";
			else moveType = "Normal";
			break;
		case "thousandarrows":
			noLevitation = true;
			break;
	}

	if (gen >= 3 && pokeA.ability) {
		switch (pokeA.ability.id) {
			case "normalize":
				moveType = "Normal";
				break;
			case "liquidvoice":
				if (move.flags && move.flags.sound) {
					moveType = "Water";
				}
				break;
			case "aerilate":
				if (moveType === "Normal") moveType = "Flying";
				break;
			case "pixilate":
				if (moveType === "Normal") moveType = "Fairy";
				break;
			case "refrigerate":
				if (moveType === "Normal") moveType = "Ice";
				break;
			case "blaze":
				if (moveType === "Fire" && pokeA.hp <= (100 / 3)) atk = Math.floor(atk * 1.5);
				break;
			case "defeatist":
				if (pokeA.hp < 50 && cat === "Physical") atk = Math.floor(atk * 0.5);
				break;
			case "guts":
				if (pokeA.status && cat === "Physical") atk = Math.floor(atk * 1.5);
				break;
			case "hugepower":
			case "purepower":
				if (cat === "Physical") atk = Math.floor(atk * 2);
				break;
			case "hustle":
				if (cat === "Physical") atk = Math.floor(atk * 1.5);
				break;
			case "overgrow":
				if (moveType === "Grass" && pokeA.hp <= (100 / 3)) atk = Math.floor(atk * 1.5);
				break;
			case "swarm":
				if (moveType === "Bug" && pokeA.hp <= (100 / 3)) atk = Math.floor(atk * 1.5);
				break;
			case "torrent":
				if (moveType === "Water" && pokeA.hp <= (100 / 3)) atk = Math.floor(atk * 1.5);
				break;
		}
	}

	let eff;
	let defTypes = pokeB.template.types.slice();
	if (conditionsB.volatiles["typechange"] && conditionsB.volatiles["typechange"].length) defTypes = conditionsB.volatiles["typechange"].slice();
	if (conditionsB.volatiles["typeadd"]) defTypes.push(conditionsB.volatiles["typeadd"]);
	//debug(defTypes);
	for (let t = 0; t < defTypes.length; t++) {
		eff = typechart.getEffectiveness(moveType, defTypes[t], gen);
		//debug("EFF [" + moveType + ", " + defTypes[t] + "] = " + eff);
		if (!eff && defTypes[t] === "Ghost") {
			if (conditionsB.volatiles["foresight"]) eff = 1;
			if (gen >= 3 && pokeA.ability && pokeA.ability.id === "scrappy") eff = 1;
		}
		if (move.id === "freezedry" && defTypes[t] === "Water") eff = 2;
		if (moveType === "Ground" && noLevitation && defTypes[t] === "Flying") eff = 1;
		if (gconditions["inversebattle"]) {
			if (eff === 0) eff = 2;
			else eff = 1 / eff;
		}
		typesMux *= eff;
	}

	if (move.id === 'thousandarrows' && !gconditions['gravity'] && !conditionsB.volatiles['smackdown'] && !pokeB.isGrounded()) {
		typesMux = 1; /* Hit neutral */
	}

	if (gen >= 3 && pokeB.ability && (!pokeA.ability || !(pokeA.ability.id in { "moldbreaker": 1, "turboblaze": 1, "teravolt": 1 }))) {
		switch (pokeB.ability.id) {
			case "dryskin":
			case "stormdrain":
			case "waterabsorb":
				if (moveType === "Water") inmune = true;
				break;
			case "flashfire":
				if (moveType === "Fire") inmune = true;
				break;
			case "levitate":
				if (moveType === "Ground" && !noLevitation) inmune = true;
				break;
			case "lightningrod":
			case "motordrive":
			case "voltabsorb":
				if (moveType === "Electric") inmune = true;
				break;
			case "sapsipper":
				if (moveType === "Grass") inmune = true;
				break;
			case "thickfat":
				if (moveType === "Ice" || moveType === "Fire") atk = Math.floor(atk * 0.5);
				break;
			case "wonderguard":
				if (typesMux < 2) typesMux = 0;
				break;
			case "bulletproof":
				if (move.flags && move.flags['bullet']) typesMux = 0;
				break;
		}
	}

	if (inmune || typesMux === 0) return new Damage(targetHP);

	/******************************
	* Base power
	*******************************/

	bp = move.basePower || 0;

	switch (move.id) {
		case "frustration":
			bp = Math.floor(((255 - pokeA.happiness) * 10) / 25) || 1;
			break;
		case "return":
			bp = Math.floor((pokeA.happiness * 10) / 25) || 1;
			break;
		case "steelroller":
			if (!gconditions["electricterrain"] && !gconditions["grassyterrain"] && !gconditions["mistyterrain"] && !gconditions["psychicterrain"]) {
				bp = 0;
			}
			break;
		case "fling":
			if (pokeA.item && pokeA.item.fling) bp = pokeA.item.fling.basePower || 0;
			else bp = 0;
			break;
		case "naturalgift":
			if (pokeA.item && pokeA.item.naturalGift && pokeA.item.naturalGift.basePower) bp = pokeA.item.naturalGift.basePower;
			else bp = 0;
			break;
		case "grassknot":
		case "lowkick":
			if (conditionsB.volatiles['dynamax']) {
				bp = 0;
			} else if (pokeB.template.weightkg) {
				if (pokeB.template.weightkg >= 200) {
					bp = 120;
				} else if (pokeB.template.weightkg >= 100) {
					bp = 100;
				} else if (pokeB.template.weightkg >= 50) {
					bp = 80;
				} else if (pokeB.template.weightkg >= 25) {
					bp = 60;
				} else if (pokeB.template.weightkg >= 10) {
					bp = 40;
				} else {
					bp = 20;
				}
			}
			break;
		case "heavyslam":
		case "heatcrash":
			if (conditionsB.volatiles['dynamax']) {
				bp = 0;
			} else if (pokeB.template.weightkg && pokeA.template.weightkg) {
				let relW = pokeB.template.weightkg / pokeA.template.weightkg;
				if (relW >= 0.5) {
					bp = 40;
				} else if (relW >= 0.33) {
					bp = 60;
				} else if (relW >= 0.25) {
					bp = 80;
				} else if (relW >= 0.2) {
					bp = 100;
				} else {
					bp = 120;
				}
			}
			break;
		case "gyroball":
			bp = (Math.floor(25 * statsB.spe / statsA.spe) || 1);
			if (bp > 150) bp = 150;
			break;
		case "snore":
			if (pokeA.status !== 'slp') bp = 0;
			break;
		case "dreameater":
			if (pokeB.status !== 'slp') bp = 0;
			break;
	}

	if (!bp) {
		if (move.id === "naturesmadness" || move.id === "superfang") return new Damage(targetHP, [Math.floor((statsB.hp * (pokeB.hp / 2)) / 100)]);
		if (move.id === "guardianofalola") return new Damage(targetHP, [Math.floor((statsB.hp * (pokeB.hp / 2)) / 100)]);
		if (move.damage === "level") return new Damage(targetHP, [pokeA.level]);
		if (typeof move.damage === "number") return new Damage(targetHP, [move.damage]);
		return new Damage(targetHP);
	}

	switch (move.id) {
		case "behemothbash":
		case "behemothblade":
		case "dynamaxcannon":
			if (conditionsB.volatiles['dynamax']) bp = Math.floor(bp * 2);
			break;
		case "venoshock":
			if (pokeB.status === 'psn' || pokeB.status === 'tox') bp = Math.floor(bp * 2);
			break;
		case "brine":
			if (pokeB.hp < 50) bp = Math.floor(bp * 2);
			break;
		case "facade":
			if (pokeA.status && pokeA.status !== 'slp') bp = Math.floor(bp * 2);
			break;
		case "knockoff":
			if (pokeB.item && !pokeB.onTakeItem) bp = Math.floor(bp * 1.5);
			break;
		case "poltergeist":
			if (!pokeB.item || pokeB.onTakeItem) bp = 0;
			break;
		case "burnup":
			if (offTypes.indexOf("Fire") === -1) bp = 0;
			break;
		case "retaliate":
			if (conditionsA.side.faintedLastTurn) bp = Math.floor(bp * 2);
			break;
		case "solarbeam":
		case "solarblade":
			if (gconditions.weather === "primordialsea" || gconditions.weather === "raindance" || gconditions.weather === "sandstorm" || gconditions.weather === "hail") bp = Math.floor(bp * 0.25);
			if (gconditions.weather !== "desolateland" && gconditions.weather !== "sunnyday" && (!pokeA.item || pokeA.item.id !== "powerherb")) bp = Math.floor(bp * 0.5);
			break;
		case "hyperspacefury":
			if (pokeA.template.species !== "Hoopa-Unbound") bp = 0;
			break;
		case "waterspout":
		case "eruption":
			bp *= pokeA.hp / 100;
			break;
	}

	if (gen >= 3 && pokeA.ability) {
		switch (pokeA.ability.id) {
			case "technician":
				if (bp <= 60) bp = Math.floor(bp * 1.5);
				break;
			case "toxicboost":
				if (cat === "Physical" && (pokeA.status === "psn" || pokeA.status === "tox")) bp = Math.floor(bp * 1.5);
				break;
			case "toughclaws":
				if (move.flags && move.flags['contact']) bp = Math.floor(bp * 1.3);
				break;
			case "aerilate":
			case "pixilate":
			case "refrigerate":
				if (move.type === "Normal") bp = Math.floor(bp * 1.3);
				break;
			case "flareboost":
				if (cat === "Special" && pokeA.status === "brn") bp = Math.floor(bp * 1.5);
				break;
			case "ironfist":
				if (move.flags && move.flags['punch']) bp = Math.floor(bp * 1.2);
				break;
			case "megalauncher":
				if (move.flags && move.flags['pulse']) bp = Math.floor(bp * 1.5);
				break;
			case "parentalbond":
				if (!move.selfdestruct && !move.multihit && (!move.flags || !move.flags['charge']) && !move.spreadHit) {
					bp = Math.floor(bp * 1.5); //Multi Hit
				}
				break;
			case "reckless":
				if (move.recoil || move.hasCustomRecoil) bp = Math.floor(bp * 1.2);
				break;
			case "rivalry":
				if (pokeA.gender && pokeB.gender) {
					if (pokeA.gender === pokeB.gender) {
						bp = Math.floor(bp * 1.25);
					} else {
						bp = Math.floor(bp * 0.75);
					}
				}
				break;
			case "sandforce":
				if (gconditions.weather === "sandstorm") {
					if (moveType === 'Rock' || moveType === 'Ground' || moveType === 'Steel') {
						bp = Math.floor(bp * 1.3);
					}
				}
				break;
			case "sheerforce":
				if (move.secondaries) bp = Math.floor(bp * 1.5);
				break;
			case "strongjaw":
				if (move.flags && move.flags['bite']) bp = Math.floor(bp * 1.5);
				break;
		}
	}

	if (gen >= 3 && pokeB.ability && (!pokeA.ability || !(pokeA.ability.id in { "moldbreaker": 1, "turboblaze": 1, "teravolt": 1 }))) {
		switch (pokeB.ability.id) {
			case "dryskin":
				if (moveType === "Fire") bp = Math.floor(bp * 1.3);
				break;
			case "heatproof":
				if (moveType === "Fire") bp = Math.floor(bp * 0.5);
				break;
		}
	}

	if (move.multihit) {
		let minhits = 1;
		let maxhits = 5;
		if (move.multihit instanceof Array) {
			minhits = move.multihit[0] || 0;
			maxhits = move.multihit[1] || move.multihit[0] || 0;
		} else {
			minhits = move.multihit;
			maxhits = move.multihit;
		}
		if (gen >= 3 && pokeA.ability && pokeA.ability.id === "skilllink") {
			bp = Math.floor(bp * maxhits);
		} else {
			bp = Math.floor(bp * ((minhits + maxhits) / 2));
		}
	}

	if (move.id in {skyattack: 1, skullbash: 1, razorwind: 1, meteorbeam: 1, iceburn: 1, freezeshock: 1} && (!pokeA.item || pokeA.item.id !== "powerherb")) {
		bp = Math.floor(bp / 2);
	}

	if (pokeA.item) {
		switch (pokeA.item.id) {
			case "choiceband":
				if (atkStat === "atk") atk = Math.floor(atk * 1.5);
				break;
			case "choicespecs":
				if (atkStat === "spa") atk = Math.floor(atk * 1.5);
				break;
		}
	}

	if (pokeB.item) {
		switch (pokeB.item.id) {
			case "airballoon":
				if (moveType === "Ground" && !noLevitation) bp = 0;
				break;
		}
	}

	/******************************
	* Modifiers
	*******************************/

	let modifier = 1;

	if (pokeA.item && pokeA.item.id === "lifeorb") modifier *= 1.3;

	/* STAB */
	if (offTypes.indexOf(moveType) >= 0 || (gen >= 3 && pokeA.ability && pokeA.ability.id in { "protean": 1, "libero": 1 })) {
		if (gen >= 3 && pokeA.ability && pokeA.ability.id === "adaptability") modifier *= 2;
		else modifier *= 1.5;
	}

	/* Weather */
	if (gen < 3 || !pokeA.ability || pokeA.supressedAbility || !(pokeA.ability.id in { 'airlock': 1, 'cloudnine': 1 })) {
		if (move.type === "Water" && (gconditions.weather === "primordialsea" || gconditions.weather === "raindance")) modifier *= 2;

		if (move.type === "Fire" && (gconditions.weather === "desolateland" || gconditions.weather === "sunnyday")) modifier *= 2;

		if (gconditions.weather === "desolateland" && move.type === "Water") modifier = 0;
		if (gconditions.weather === "primordialsea" && move.type === "Fire") modifier = 0;
	}

	if (gen >= 4 && defTypes.indexOf("Rock") >= 0 && gconditions.weather === "sandstorm") {
		if (defStat === "spd") def = Math.floor(def * 1.5);
	}

	/* Boosting */

	if (conditionsA.boosts[atkStat]) {
		if (!pokeB.ability || pokeB.ability.id !== "unaware") {
			let muxOff = 1 + (0.5) * Math.abs(conditionsA.boosts[atkStat]);
			if (conditionsA.boosts[atkStat] < 0) muxOff = 1 / muxOff;
			atk = Math.floor(atk * muxOff);
		}
	}

	if (conditionsB.boosts[defStat]) {
		if (!conditionsA.inmediate["crit"] && !move.willCrit && !move.ignoreDefensive && (!pokeA.ability || pokeA.ability.id !== "unaware")) {
			let muxDef = 1 + (0.5) * Math.abs(conditionsB.boosts[defStat]);
			if (conditionsB.boosts[defStat] < 0) muxDef = 1 / muxDef;
			def = Math.floor(def * muxDef);
		}
	}

	/* Inmediate */

	if (conditionsA.inmediate["crit"] || move.willCrit) {
		if (gen > 5) modifier *= 1.5;
		else modifier *= 2;
	}

	if (conditionsA.inmediate["helpinghand"]) modifier *= 1.5;

	/* Side */

	if (conditionsB.side["reflect"] && cat === "Physical") modifier *= 0.5;
	if (conditionsB.volatiles["reflect"] && cat === "Physical") modifier *= 0.5; // Gen 1

	if (conditionsB.side["lightscreen"] && cat === "Special") modifier *= 0.5;

	if (conditionsB.volatiles["magnetrise"] && moveType === "Ground") modifier = 0;

	/* Field */

	if (pokeA.isGrounded() || conditionsA.volatiles['smackdown'] || gconditions['gravity']) {
		if (gconditions["electricterrain"] && moveType === "Electric") bp = Math.floor(bp * 1.5);
		if (gconditions["grassyterrain"] && moveType === "Grass") bp = Math.floor(bp * 1.5);
		if (gconditions["psychicterrain"] && moveType === "Psychic") bp = Math.floor(bp * 1.5);

		if (gconditions["electricterrain"] && move.id === "risingvoltage") {
			bp = Math.floor(bp * 2);
		}

		if (gconditions["psychicterrain"] && move.id === "expandingforce") {
			bp = Math.floor(bp * 2);
		}
	}

	if (pokeB.isGrounded() || conditionsB.volatiles['smackdown'] || gconditions['gravity']) {
		if (gconditions["psychicterrain"] && move.priority > 0) bp = 0;
		if (gconditions["grassyterrain"] && (move.id in { "bulldoze": 1, "earthquake": 1, "magnitude": 1 })) bp = Math.floor(bp * 0.5);
		if (gconditions["mistyterrain"] && moveType === "Dragon") bp = Math.floor(bp * 0.5);
	}

	if (gconditions["gametype"] === "doubles" || gconditions["gametype"] === "triples") {
		if (move.target === "allAdjacentFoes") modifier *= 0.75;
	}

	/******************************
	* Damage
	*******************************/

	let dmg = (((((2 * pokeA.level / 5) + 2) * atk * bp / def) / 50) + 2) * typesMux * modifier;
	if (bp === 0) dmg = 0;

	return new Damage(targetHP, getRolls(dmg));
};
