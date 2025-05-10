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
		this.stats = Object.create(null);
		this.evs = Object.create(null);
		this.ivs = Object.create(null);
		this.dvs = Object.create(null);
		this.nature = null;
		this.ability = null;
		this.level = 100;
		this.shiny = false;
		this.happiness = 255;
		this.status = false;
		this.hp = 100;
		this.tera = "";
		this.timesHit = 0;
		this.typechange = null;
		this.supressedAbility = false;
		this.moves = [];
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
		if (!gen) gen = 9;
		let stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
		let res = Object.create(null);
		for (let i = 0; i < stats.length; i++) {
			if (this.stats[stats[i]]) {
				res[stats[i]] = this.stats[stats[i]];
				continue;
			}

			let natureValue = 1;

			if (this.nature) {
				if (this.nature.plus === stats[i]) {
					natureValue = 1.1;
				} else if (this.nature.minus === stats[i]) {
					natureValue = 0.9;
				}
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
					res[stats[i]] = Math.floor(Math.floor((2 * this.getBaseStat(stats[i]) + this.getIV(stats[i]) + this.getEV(stats[i])) * this.level / 100 + 5) * natureValue);
				}
			}
		}
		if (this.template && this.template.maxHP) {
			res.hp = Math.min(this.template.maxHP, res.hp);
		}
		return res;
	}
}

class Conditions {
	constructor(data) {
		if (typeof data !== "object") throw new Error("Invalid conditions data");
		this.volatiles = Object.create(null);
		this.boosts = Object.create(null);
		this.side = Object.create(null);
		this.inmediate = Object.create(null);
		for (let i in data) {
			if (typeof this[i] === "undefined" || typeof this[i] === "function") continue;
			this[i] = data[i];
		}
	}
}

class Damage {
	constructor(hp, rolls, hasSturdy, isRedirected) {
		this.rolls = rolls || [];
		this.hp = hp || 0;
		this.percents = [];
		this.isRedirected = !!isRedirected;
		for (let i = 0; i < this.rolls.length; i++) {
			if (hp === 0) {
				this.percents.push(100);
				continue;
			}

			let roll = this.rolls[i];

			if (hasSturdy) {
				roll = Math.max(0, Math.min(roll, hp - 1));
			}

			this.percents.push(roll * 100 / hp);
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
	if (!gen) gen = 9;
	if (!gconditions) gconditions = Object.create(null);

	const pokeAIgnoredAbility = gen < 3 || pokeA.supressedAbility || ((gconditions["magicroom"] || conditionsA.volatiles["embargo"] || !pokeA.item || pokeA.item.id !== "abilityshield") && (gconditions["neutralizinggas"]));
	const pokeBIgnoredAbility = gen < 3 || pokeB.supressedAbility || ((gconditions["magicroom"] || conditionsB.volatiles["embargo"] || !pokeB.item || pokeB.item.id !== "abilityshield") && (gconditions["neutralizinggas"] || move.ignoreAbility || (pokeA.ability && !pokeAIgnoredAbility && (pokeA.ability.id in { "moldbreaker": 1, "turboblaze": 1, "teravolt": 1 }))));

	let originalTypes = pokeA.template.types.slice();
	let offTypes = originalTypes.slice();
	if (conditionsA.volatiles["typechange"] && conditionsA.volatiles["typechange"].length) offTypes = conditionsA.volatiles["typechange"].slice();
	if (conditionsA.volatiles["typeadd"]) offTypes.push(conditionsA.volatiles["typeadd"]);
	if (pokeA.typechange && pokeA.typechange.length) {
		offTypes = pokeA.typechange.slice();
	}
	if (pokeA.tera && pokeA.tera !== "Stellar") {
		offTypes = [pokeA.tera];
	}

	let statsA = pokeA.getStats(gen), statsB = pokeB.getStats(gen);

	let atk, def, bp, atkStat, defStat;
	let cat, defcat;
	let isRedirected = false;

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
			atk = 0;
			atkStat = "spa";
		}
		if (move.id in { 'photongeyser': 1, 'lightthatburnsthesky': 1, 'terablast': 1 }) {
			if (statsA.atk > statsA.spa) {
				atk = statsA.atk;
				atkStat = "atk";
			}
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
		if (!pokeA.ability || !pokeAIgnoredAbility || pokeA.ability.id !== "guts") atk = Math.floor(atk * 0.5);
	}

	if (atkStat === "atk" && pokeB.ability && !pokeBIgnoredAbility && pokeB.ability.id === "tabletsofruin") {
		atk = Math.floor(atk * 0.75);
	} else if (atkStat === "spa" && pokeB.ability && !pokeBIgnoredAbility && pokeB.ability.id === "vesselofruin") {
		atk = Math.floor(atk * 0.75);
	}

	if (defStat === "def" && pokeA.ability && !pokeAIgnoredAbility && pokeA.ability.id === "swordofruin") {
		def = Math.floor(def * 0.75);
	} else if (defStat === "spd" && pokeA.ability && !pokeAIgnoredAbility && pokeA.ability.id === "beadsofruin") {
		def = Math.floor(def * 0.75);
	}

	if (conditionsA.volatiles['quarkdrive' + atkStat] || conditionsA.volatiles['protosynthesis' + atkStat]) {
		atk = Math.floor(atk * 1.3);
	}

	if (conditionsB.volatiles['quarkdrive' + defStat] || conditionsB.volatiles['protosynthesis' + defStat]) {
		def = Math.floor(def * 1.3);
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

	const pokeAItemDisabled = gconditions["magicroom"] || conditionsA.volatiles["embargo"];
	const pokeBItemDisabled = gconditions["magicroom"] || conditionsB.volatiles["embargo"];

	switch (move.id) {
		case "naturalgift":
			if (pokeA.item && !pokeAItemDisabled && pokeA.item.naturalGift && pokeA.item.naturalGift.type) moveType = pokeA.item.naturalGift.type;
			else moveType = "Normal";
			break;
		case "judgment":
			if (pokeA.item && !pokeAItemDisabled && pokeA.item.onPlate) moveType = pokeA.item.onPlate;
			else moveType = "Normal";
			break;
		case "multiattack":
			if (pokeA.item && !pokeAItemDisabled && pokeA.item.onMemory) moveType = pokeA.item.onMemory;
			else moveType = "Normal";
			break;
		case "terablast":
		case "terastarstorm":
			if (pokeA.tera) moveType = pokeA.tera;
			else moveType = "Normal";
			break;
		case "weatherball":
			if (gconditions.weather === "primordialsea" || gconditions.weather === "raindance") moveType = "Water";
			else if (gconditions.weather === "desolateland" || gconditions.weather === "sunnyday") moveType = "Fire";
			else if (gconditions.weather === "sandstorm") moveType = "Rock";
			else if (gconditions.weather === "hail") moveType = "Ice";
			else moveType = "Normal";
			break;
		case "ivycudgel":
			switch (pokeA.template.species) {
				case 'Ogerpon-Wellspring':
				case 'Ogerpon-Wellspring-Tera':
					moveType = "Water";
					break;
				case 'Ogerpon-Hearthflame':
				case 'Ogerpon-Hearthflame-Tera':
					moveType = "Fire";
					break;
				case 'Ogerpon-Cornerstone':
				case 'Ogerpon-Cornerstone-Tera':
					moveType = "Rock";
					break;
			}
			break;
		case "thousandarrows":
			noLevitation = true;
			break;
	}

	if (pokeA.ability && !pokeAIgnoredAbility) {
		switch (pokeA.ability.id) {
			case "normalize":
				moveType = "Normal";
				break;
			case "liquidvoice":
				if (move.flags && move.flags.sound) {
					moveType = "Water";
				}
				break;
			case "sharpness":
				if (move.flags && move.flags.slicing) {
					atk = Math.floor(atk * 1.5);
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
			case "transistor":
				if (moveType === "Electric") atk = Math.floor(atk * 1.5);
				break;
			case "rockypayload":
				if (moveType === "Rock") atk = Math.floor(atk * 1.5);
				break;
		}
	}

	if (move.id === "aurawheel") {
		if (pokeA.template.species !== "Morpeko-Hangry") {
			moveType = "Dark";
		}
	}

	let eff;
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
	}

	if (pokeB.tera && pokeB.tera !== "Stellar") {
		defTypes = [pokeB.tera];
	}

	//debug(defTypes);
	for (let t = 0; t < defTypes.length; t++) {
		eff = typechart.getEffectiveness(moveType, defTypes[t], gen);
		//debug("EFF [" + moveType + ", " + defTypes[t] + "] = " + eff);
		if (!eff && defTypes[t] === "Ghost") {
			if (conditionsB.volatiles["foresight"]) eff = 1;
			if (pokeA.ability && !pokeAIgnoredAbility && pokeA.ability.id === "scrappy") eff = 1;
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

	if (pokeB.ability && !pokeBIgnoredAbility) {
		switch (pokeB.ability.id) {
			case "stormdrain":
				if (moveType === "Water") {
					inmune = true;
					isRedirected = true;
				}
				break;
			case "dryskin":
			case "waterabsorb":
				if (moveType === "Water") inmune = true;
				break;
			case "eartheater":
				if (moveType === "Ground") inmune = true;
				break;
			case "flashfire":
			case "wellbakedbody":
				if (moveType === "Fire") inmune = true;
				break;
			case "levitate":
				if (moveType === "Ground" && !noLevitation) inmune = true;
				break;
			case "lightningrod":
				if (moveType === "Electric") {
					inmune = true;
					isRedirected = true;
				}
				break;
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
			case "purifyingsalt":
				if (moveType === "Ghost") atk = Math.floor(atk * 0.5);
				break;
			case "wonderguard":
				if (typesMux < 2) typesMux = 0;
				break;
			case "bulletproof":
				if (move.flags && move.flags['bullet']) typesMux = 0;
				break;
			case "soundproof":
				if (move.flags && move.flags['sound']) typesMux = 0;
				break;
			case "windpower":
			case "windrider":
				if (move.flags && move.flags['wind']) typesMux = 0;
				break;
			case "terablast":
			case "terastarstorm":
				if (pokeA.tera === "Stellar" && pokeB.tera) {
					typesMux = 2;
				}
				break;
		}
	}

	if (pokeB.item && !pokeBItemDisabled) {
		switch (pokeB.item.id) {
			case "airballoon":
				if (moveType === "Ground" && !noLevitation) inmune = true;
				break;
		}
	}

	if (pokeB.isGrounded() || conditionsB.volatiles['smackdown'] || gconditions['gravity']) {
		if (gconditions["psychicterrain"] && move.priority > 0) inmune = true;
	}

	if ((!pokeA.ability || !pokeAIgnoredAbility || !(pokeA.ability.id in { 'airlock': 1, 'cloudnine': 1 })) && (!pokeB.ability || !pokeBIgnoredAbility || !(pokeB.ability.id in { 'airlock': 1, 'cloudnine': 1 }))) {
		if (gconditions.weather === "desolateland" && move.type === "Water") inmune = true;
		if (gconditions.weather === "primordialsea" && move.type === "Fire") inmune = true;
	}

	if (inmune || typesMux === 0) return new Damage(targetHP, null, false, isRedirected);

	/******************************
	* Base power
	*******************************/

	bp = move.basePower || 0;

	switch (move.id) {
		case "frustration":
			bp = Math.floor(((255 - pokeA.happiness) * 10) / 25) || 1;
			break;
		case "powertrip":
		case "storedpower":
			{
				bp = 20;
				for (let stat of Object.keys(conditionsA.boosts)) {
					if (conditionsA.boosts[stat] > 0) {
						bp += 20 * conditionsA.boosts[stat];
					}
				}
			}
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
			if (pokeA.item && !pokeAItemDisabled && pokeA.item.fling) bp = pokeA.item.fling.basePower || 0;
			else bp = 0;
			break;
		case "naturalgift":
			if (pokeA.item && !pokeAItemDisabled && pokeA.item.naturalGift && pokeA.item.naturalGift.basePower) bp = pokeA.item.naturalGift.basePower;
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
		case "beatup":
			if (conditionsA.inmediate["beatup_bp"]) {
				bp = conditionsA.inmediate["beatup_bp"];
			} else {
				bp = 5;
			}
			break;
		case "lastrespects":
			if (conditionsA.inmediate["last_respects_bp"]) {
				bp = conditionsA.inmediate["last_respects_bp"];
			} else {
				bp = 50;
			}
			break;
		case "snore":
			if (pokeA.status !== 'slp') bp = 0;
			break;
		case "dreameater":
			if (pokeB.status !== 'slp') bp = 0;
			break;
		case "upperhand":
			bp = 0; // TODO: Interaction with this move (Fails if user is not using a priority move)
			break;
		case "ragefist":
			bp = Math.min(300, 50 + (50 * (pokeA.timesHit || 0)));
			break;
		case "terablast":
			if (pokeA.tera === "Stellar") {
				bp = 100;
			}
			break;
	}

	if (move.isMax && (!move.isMaxModified || move.basePower === 0) && !conditionsA.volatiles['dynamax']) {
		return new Damage(targetHP, [1]);
	}

	if (!bp) {
		if (move.id === "naturesmadness" || move.id === "superfang" || move.id === "ruination") return new Damage(targetHP, [Math.floor((statsB.hp * (pokeB.hp / 2)) / 100)]);
		if (move.id === "guardianofalola") return new Damage(targetHP, [Math.floor((statsB.hp * (pokeB.hp / 2)) / 100)]);
		if (move.damage === "level") return new Damage(targetHP, [pokeA.level]);
		if (typeof move.damage === "number") return new Damage(targetHP, [move.damage]);

		if (move.ohko) {
			if (pokeA.level < pokeB.level) return new Damage(targetHP);
			if (pokeB.ability && !pokeBIgnoredAbility && pokeB.ability.id === "sturdy") return new Damage(targetHP);
			if (conditionsB.volatiles['dynamax']) return new Damage(targetHP);
			return new Damage(targetHP, [targetHP]);
		}

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
		case "doubleshock":
			if (offTypes.indexOf("Electric") === -1) bp = 0;
			break;
		case "retaliate":
			if (conditionsA.side.faintedLastTurn) bp = Math.floor(bp * 2);
			break;
		case "solarbeam":
		case "solarblade":
			if (gconditions.weather === "primordialsea" || gconditions.weather === "raindance" || gconditions.weather === "sandstorm" || gconditions.weather === "hail") bp = Math.floor(bp * 0.25);
			if (gconditions.weather !== "desolateland" && gconditions.weather !== "sunnyday" && (!pokeA.item || pokeA.item.id !== "powerherb")) bp = Math.floor(bp * 0.5);
			break;
		case "electroshot":
			if (gconditions.weather !== "primordialsea" && gconditions.weather !== "raindance" && (!pokeA.item || pokeA.item.id !== "powerherb")) bp = Math.floor(bp * 0.5);
			break;
		case "hyperspacefury":
			if (pokeA.template.species !== "Hoopa-Unbound") bp = 0;
			break;
		case "aurawheel":
			if (pokeA.template.species !== "Morpeko" && pokeA.template.species !== "Morpeko-Hangry") bp = 0;
			break;
		case "hardpress":
			bp = Math.floor(Math.floor((120 * (100 * Math.floor(pokeA.hp * 4096 / 100)) + 2048 - 1) / 4096) / 100) || 1;
			break;
		case "waterspout":
		case "eruption":
		case "dragonenergy":
			bp *= pokeA.hp / 100;
			break;
	}

	if (pokeA.ability && !pokeAIgnoredAbility) {
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

	if (pokeB.ability && !pokeBIgnoredAbility) {
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
		if (pokeA.ability && !pokeAIgnoredAbility && pokeA.ability.id === "skilllink") {
			bp = Math.floor(bp * maxhits);
		} else {
			bp = Math.floor(bp * ((minhits + maxhits) / 2));
		}
	}

	if (move.id in { skyattack: 1, skullbash: 1, razorwind: 1, meteorbeam: 1, iceburn: 1, freezeshock: 1 } && (!pokeA.item || !pokeAItemDisabled || pokeA.item.id !== "powerherb")) {
		bp = Math.floor(bp / 2);
	}

	if (pokeA.item && !pokeAItemDisabled) {
		switch (pokeA.item.id) {
			case "choiceband":
				if (atkStat === "atk") atk = Math.floor(atk * 1.5);
				break;
			case "choicespecs":
				if (atkStat === "spa") atk = Math.floor(atk * 1.5);
				break;
		}
	}

	/******************************
	* Modifiers
	*******************************/

	let modifier = 1;

	if (pokeA.item && !pokeAItemDisabled && pokeA.item.id === "lifeorb") modifier *= 1.3;

	/* STAB */
	if (offTypes.indexOf(moveType) >= 0 || (pokeA.ability && !pokeAIgnoredAbility && pokeA.ability.id in { "protean": 1, "libero": 1 } && (gen < 9 || !conditionsA.volatiles["typechange"] || conditionsA.volatiles["typechange"].length === 0))) {
		if (pokeA.ability && !pokeAIgnoredAbility && pokeA.ability.id === "adaptability") modifier *= 2;
		else modifier *= 1.5;
	}

	/* Tera */
	if (pokeA.tera) {
		if (originalTypes.indexOf(moveType) >= 0 && offTypes.indexOf(moveType) === -1) {
			modifier *= 1.5; // Preserve the original stabs
		}
		if ((moveType === pokeA.tera || pokeA.tera === "Stellar") && originalTypes.indexOf(moveType) >= 0) {
			modifier *= (4 / 3);
		}
	}

	/* Weather */
	if ((!pokeA.ability || !pokeAIgnoredAbility || !(pokeA.ability.id in { 'airlock': 1, 'cloudnine': 1 })) && (!pokeB.ability || !pokeBIgnoredAbility || !(pokeB.ability.id in { 'airlock': 1, 'cloudnine': 1 }))) {
		if (move.type === "Water" && (gconditions.weather === "primordialsea" || gconditions.weather === "raindance")) modifier *= 2;

		if (move.type === "Fire" && (gconditions.weather === "desolateland" || gconditions.weather === "sunnyday")) modifier *= 2;

		if (gconditions.weather === "desolateland" && move.type === "Water") modifier = 0;
		if (gconditions.weather === "primordialsea" && move.type === "Fire") modifier = 0;
	}

	if (gen >= 4 && defTypes.indexOf("Rock") >= 0 && gconditions.weather === "sandstorm") {
		if (defStat === "spd") def = Math.floor(def * 1.5);
	}

	if (defTypes.indexOf("Ice") >= 0 && gconditions.weather === "snow") {
		if (defStat === "def") def = Math.floor(def * 1.5);
	}

	/* Boosting */

	let stoleBoosts = 0;

	if (move.stealsBoosts) {
		if (conditionsB.boosts[atkStat] && conditionsB.boosts[atkStat] > 0) {
			stoleBoosts = conditionsB.boosts[atkStat];
		}
	}

	if (conditionsA.boosts[atkStat] || stoleBoosts) {
		let selfBoosts = conditionsA.boosts[atkStat] || 0;
		if (!pokeB.ability || !pokeBIgnoredAbility || pokeB.ability.id !== "unaware") {
			let muxOff = 1 + (0.5) * Math.abs(selfBoosts + stoleBoosts);
			if (selfBoosts + stoleBoosts < 0) muxOff = 1 / muxOff;
			atk = Math.floor(atk * muxOff);
		}
	}

	if (conditionsB.boosts[defStat]) {
		if (!conditionsA.inmediate["crit"] && !move.willCrit && !move.ignoreDefensive && (!pokeA.ability || !pokeAIgnoredAbility || pokeA.ability.id !== "unaware") && !move.stealsBoosts) {
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

	if (gconditions["gametype"] in { "doubles": 1, "triples": 1, "multi": 1, "freeforall": 1 }) {
		if (move.target in { "allAdjacentFoes": 1, "all": 1 }) modifier *= 0.75;
	}

	/******************************
	* Damage
	*******************************/

	let dmg = (((((2 * pokeA.level / 5) + 2) * atk * bp / def) / 50) + 2) * typesMux * modifier;
	if (bp === 0) dmg = 0;

	return new Damage(targetHP, getRolls(dmg), (pokeB.hp >= 100 && pokeB.ability && !pokeBIgnoredAbility && pokeB.ability.id === "sturdy"));
};
