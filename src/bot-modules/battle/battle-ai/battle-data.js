/**
 * Battle data
 */

'use strict';

const Path = require('path');
const Text = Tools('text');

const BAT_DATA_DIR = Path.resolve(__dirname, '..', 'data');

exports.setup = function (App) {
	const BattleDataManager = {};

	BattleDataManager.getEffect = function (effect, gen) {
		if (!effect || typeof effect === 'string') {
			let name = (effect || '').trim();
			if (name.substr(0, 5) === 'item:') {
				return BattleDataManager.getItem(name.substr(5), gen);
			} else if (name.substr(0, 8) === 'ability:') {
				return BattleDataManager.getAbility(name.substr(8), gen);
			} else if (name.substr(0, 5) === 'move:') {
				return BattleDataManager.getMove(name.substr(5), gen);
			}

			let id = Text.toId(name);
			effect = {};

			let pMove = BattleDataManager.getMove(id, gen);
			let pAbility = BattleDataManager.getAbility(id, gen);
			let pItem = BattleDataManager.getItem(id, gen);
			let statuses = require(Path.resolve(BAT_DATA_DIR, "statuses.js")).BattleStatuses;

			if (id && statuses && statuses[id]) {
				effect = statuses[id];
				effect.exists = true;
			} else if (id && pMove.effect) {
				effect = pMove.effect;
				effect.exists = true;
			} else if (id && pAbility.effect) {
				effect = pAbility.effect;
				effect.exists = true;
			} else if (id && pItem.effect) {
				effect = pItem.effect;
				effect.exists = true;
			} else if (id === 'recoil') {
				effect = {
					effectType: 'Recoil',
				};
				effect.exists = true;
			} else if (id === 'drain') {
				effect = {
					effectType: 'Drain',
				};
				effect.exists = true;
			}
			if (!effect.id) effect.id = id;
			if (!effect.name) effect.name = Text.escapeHTML(name);
			if (!effect.category) effect.category = 'Effect';
			if (!effect.effectType) effect.effectType = 'Effect';
		}
		return effect;
	};

	BattleDataManager.getPokemon = BattleDataManager.getTemplate = function (poke, gen) {
		if (!gen || gen > 8 || gen < 1) gen = 8;
		poke = Text.toId(poke || "");
		let pokemon = {};
		let temp;
		try {
			temp = App.data.getPokedex()[poke];
			for (let i in temp) pokemon[i] = temp[i];
		} catch (e) { }
		for (let i = 7; i >= gen; i--) {
			try {
				temp = require(Path.resolve(BAT_DATA_DIR, "gen" + i, "pokedex.js")).BattlePokedex[poke];
				if (!temp) continue;
			} catch (e) {
				continue;
			}
			if (!temp.inherit) {
				for (let i in pokemon) delete pokemon[i];
			}
			for (let i in temp) pokemon[i] = temp[i];
		}
		if (pokemon.name) {
			pokemon.species = pokemon.name;
		}
		if (!pokemon.species) {
			return {
				num: 235,
				species: "Smeargle",
				types: ["Normal"],
				baseStats: { hp: 55, atk: 20, def: 35, spa: 20, spd: 45, spe: 75 },
				abilities: { 0: "Own Tempo", 1: "Technician", H: "Moody" },
				heightm: 1.2,
				weightkg: 58,
				color: "White",
				eggGroups: ["Field"],
			};
		}
		return pokemon;
	};


	BattleDataManager.getZPower = function (basePower) {
		if (basePower >= 140) {
			return 200;
		} else if (basePower >= 130) {
			return 195;
		} else if (basePower >= 120) {
			return 190;
		} else if (basePower >= 110) {
			return 185;
		} else if (basePower >= 100) {
			return 180;
		} else if (basePower >= 90) {
			return 175;
		} else if (basePower >= 80) {
			return 160;
		} else if (basePower >= 70) {
			return 140;
		} else if (basePower >= 60) {
			return 120;
		} else {
			return 100;
		}
	};

	BattleDataManager.getMaxPower = function (basePower, maxMove) {
		if (maxMove in { maxknuckle: 1, maxooze: 1 }) {
			if (basePower >= 150) {
				return 100;
			} else if (basePower >= 110) {
				return 95;
			} else if (basePower >= 75) {
				return 90;
			} else if (basePower >= 65) {
				return 85;
			} else if (basePower >= 55) {
				return 80;
			} else if (basePower >= 45) {
				return 75;
			} else {
				return 70;
			}
		} else {
			if (basePower >= 150) {
				return 150;
			} else if (basePower >= 110) {
				return 140;
			} else if (basePower >= 75) {
				return 130;
			} else if (basePower >= 65) {
				return 120;
			} else if (basePower >= 55) {
				return 110;
			} else if (basePower >= 45) {
				return 100;
			} else {
				return 90;
			}
		}
	};

	BattleDataManager.getMove = function (move, gen) {
		if (!gen || gen > 8 || gen < 1) gen = 8;
		move = Text.toId(move || "");
		if (move.indexOf("hiddenpower") === 0) {
			move = move.replace(/[0-9]/g, "");
		}
		let moveData = {};
		let temp;
		try {
			temp = App.data.getMoves()[move];
			for (let i in temp) moveData[i] = temp[i];
		} catch (e) { }
		for (let i = 7; i >= gen; i--) {
			try {
				temp = require(Path.resolve(BAT_DATA_DIR, "gen" + i, "moves.js")).BattleMovedex[move];
				if (!temp) continue;
			} catch (e) {
				continue;
			}
			if (!temp.inherit) {
				for (let i in moveData) delete moveData[i];
			}
			for (let i in temp) moveData[i] = temp[i];
		}
		if (moveData.name) {
			moveData.id = Text.toId(moveData.name);
		}
		if (!moveData.id && move.length > 0 && move.charAt(move.length - 1) === 'z') {
			return BattleDataManager.getMove(move.substr(0, move.length - 1), gen);
		} else if (!moveData.id) {
			return {
				num: 165,
				accuracy: true,
				basePower: 50,
				category: "Physical",
				desc: "Deals typeless damage to one adjacent foe at random. If this move was successful, the user loses 1/4 of its maximum HP, rounded half up; the Ability Rock Head does not prevent this. This move can only be used if none of the user's known moves can be selected.",
				shortDesc: "User loses 25% of its max HP as recoil.",
				id: "struggle",
				name: "Struggle",
				pp: 1,
				noPPBoosts: true,
				priority: 0,
				flags: { contact: 1, protect: 1 },
				noSketch: true,
				effectType: "Move",
			};
		}
		if (!moveData.effectType) moveData.effectType = 'Move';
		return moveData;
	};

	BattleDataManager.getItem = function (item, gen) {
		if (!gen || gen > 8 || gen < 1) gen = 8;
		item = Text.toId(item || "");
		let itemData = {};
		let temp;
		try {
			temp = App.data.getItems()[item];
			for (let i in temp) itemData[i] = temp[i];
		} catch (e) { }
		for (let i = 7; i >= gen; i--) {
			try {
				temp = require(Path.resolve(BAT_DATA_DIR, "gen" + i, "items.js")).BattleItems[item];
				if (!temp) continue;
			} catch (e) {
				continue;
			}
			if (!temp.inherit) {
				for (let i in itemData) delete itemData[i];
			}
			for (let i in temp) itemData[i] = temp[i];
		}
		if (itemData.name) {
			itemData.id = Text.toId(itemData.name);
		}
		if (!itemData.id) {
			return {
				id: "pokeball",
				name: "Poke Ball",
				spritenum: 345,
				num: 4,
				gen: 1,
				desc: "A device for catching wild Pokemon. It is designed as a capsule system.",
				category: "Effect",
				effectType: "Item",
			};
		}
		if (!itemData.category) itemData.category = 'Effect';
		if (!itemData.effectType) itemData.effectType = 'Item';
		return itemData;
	};

	BattleDataManager.getAbility = function (ab, gen) {
		if (!gen || gen > 8 || gen < 1) gen = 8;
		ab = Text.toId(ab || "");
		let ability = {};
		let temp;
		try {
			temp = App.data.getAbilities()[ab];
			for (let i in temp) ability[i] = temp[i];
		} catch (e) { }
		for (let i = 7; i >= gen; i--) {
			try {
				temp = require(Path.resolve(BAT_DATA_DIR, "gen" + i, "abilities.js")).BattleAbilities[ab];
				if (!temp) continue;
			} catch (e) {
				continue;
			}
			if (!temp.inherit) {
				for (let i in ability) delete ability[i];
			}
			for (let i in temp) ability[i] = temp[i];
		}
		if (ability.name) {
			ability.id = Text.toId(ability.name);
		}
		if (!ability.id) {
			return {
				desc: "This Pokemon has no ability.",
				shortDesc: "This Pokemon has no ability.",
				id: "none",
				name: "None",
				rating: 1,
				num: 1,
				category: "Effect",
				effectType: "Ability",
			};
		}
		if (!ability.category) ability.category = 'Effect';
		if (!ability.effectType) ability.effectType = 'Ability';
		return ability;
	};

	class Move {
		constructor(template) {
			if (!template || typeof template !== "object") throw new Error("Invalid move template");
			this.template = template;
			this.name = this.template.name;
			this.id = this.template.id;
			this.pp = Math.floor(this.template.pp * 1.60);
			this.disabled = false;
			this.helpers = {};
		}

		restorePP(pp) {
			if (pp) {
				this.pp += pp;
			} else {
				this.pp = Math.floor(this.template.pp * 1.60);
			}
		}
	}

	BattleDataManager.Move = Move;

	class Pokemon {
		constructor(template, properties) {
			if (!template || typeof template !== "object") throw new Error("Invalid pokemon template");

			this.template = template;
			this.species = this.template.species;
			this.name = this.template.species;

			this.transformed = false;
			this.transformPrev = null;

			this.gender = false;
			this.level = 100;
			this.shiny = false;

			this.item = "&unknown";
			this.itemEffect = '';
			this.prevItem = null;
			this.prevItemEffect = '';

			this.ability = "&unknown";
			this.supressedAbility = false;
			this.baseAbility = "&unknown";
			this.abilityStack = [];

			this.moves = [];

			this.active = false;
			this.slot = -1;

			this.hp = 100;
			this.fainted = false;
			this.status = false;
			this.volatiles = {};
			this.boosts = {};

			this.passing = false;
			this.prepared = null;

			this.helpers = {};

			for (let i in properties) {
				if (typeof this[i] === "undefined" || typeof this[i] === "function") continue;
				if (i === "template") continue;
				this[i] = properties[i];
			}
		}

		addVolatile(volatile) {
			volatile = Text.toId(volatile);
			this.volatiles[volatile] = true;
		}

		removeVolatile(volatile) {
			volatile = Text.toId(volatile);
			if (this.volatiles[volatile]) delete this.volatiles[volatile];
		}

		removeAllVolatiles() {
			for (let i in this.volatiles) delete this.volatiles[i];
		}

		addBoost(stat, n) {
			if (!this.boosts[stat]) this.boosts[stat] = 0;
			this.boosts[stat] += n;
		}

		setBoost(stat, n) {
			this.boosts[stat] = n;
		}

		invertAllBoosts() {
			for (let i in this.boosts) {
				this.boosts[i] = this.boosts[i] * (-1);
			}
		}

		removeAllBoosts() {
			for (let i in this.boosts) delete this.boosts[i];
		}

		markAbility(id, isNotBase) {
			this.ability = BattleDataManager.getAbility(id);
			if ((!this.baseAbility || this.baseAbility === "&unknown") && !isNotBase) {
				this.baseAbility = this.ability;
				this.abilityStack.push(this.ability.id);
			} else if (isNotBase && this.baseAbility && this.baseAbility !== "&unknown") {
				if (this.ability.id === this.baseAbility.id) {
					if (this.abilityStack[this.abilityStack.length - 1] === this.ability.id) {
						this.abilityStack.pop();
					}
					if (this.abilityStack[this.abilityStack.length - 1]) {
						this.baseAbility = BattleDataManager.getAbility(this.abilityStack[this.abilityStack.length - 1]);
					} else {
						this.baseAbility = "&unknown";
					}
				}
			}
		}

		prepareMove(move, target) {
			this.prepared = {
				move: move,
				target: target,
			};
		}

		markMove(id, deduct) {
			id = Text.toId(id);
			let move = null;
			for (let i = 0; i < this.moves.length; i++) {
				if (this.moves[i].id === id) {
					move = this.moves[i];
				}
			}
			if (move && deduct) {
				move.pp += deduct;
			}
			return move;
		}

		transformInto(pokemon) {
			this.transformPrev = {
				template: this.template,
				species: this.species,
				shiny: this.shiny,
				moves: this.moves,
				ability: this.ability,
				baseAbility: this.baseAbility,
				abilityStack: this.abilityStack,
			};
			this.species = pokemon.species;
			this.template = pokemon.template;
			this.shiny = pokemon.shiny;
			this.ability = pokemon.shiny;
			this.baseAbility = pokemon.shiny;
			this.abilityStack = pokemon.abilityStack.slice();
			this.moves = [];
			let mv;
			for (let i = 0; i < pokemon.moves.length; i++) {
				mv = new Move(pokemon.moves[i].template);
				mv.pp = 5;
				this.moves.push(mv);
			}
			this.transformed = true;
			this.removeAllBoosts();
			for (let i in pokemon.boosts) this.boosts[i] = pokemon.boosts[i];
			this.addVolatile('transform');
			this.addVolatile('formechange');
			this.volatiles.formechange = (pokemon.volatiles.formechange ? pokemon.volatiles.formechange : pokemon.species);
		}

		unTransform() {
			this.transformed = false;
			if (this.transformPrev) {
				this.template = this.transformPrev.template;
				this.species = this.transformPrev.species;
				this.shiny = this.transformPrev.shiny;
				this.moves = this.transformPrev.moves;
				this.ability = this.transformPrev.ability;
				this.baseAbility = this.transformPrev.baseAbility;
				this.abilityStack = this.transformPrev.abilityStack;
			}
			this.transformPrev = null;
		}
	}

	BattleDataManager.Pokemon = Pokemon;

	class Player {
		constructor(id, name, avatar) {
			this.id = id || "p0";
			this.name = name || "";
			this.userid = Text.toId(name || "");
			this.avatar = avatar || 0;
			this.active = [];
			this.side = {};
			this.pokemon = [];
			this.teamPv = [];
		}

		setName(name) {
			this.name = name;
			this.userid = Text.toId(name);
		}

		removeSideCondition(condition) {
			condition = Text.toId(condition);
			if (this.side[condition]) delete this.side[condition];
		}

		addSideCondition(condition) {
			condition = Text.toId(condition);
			if (!this.side[condition]) this.side[condition] = 0;
			this.side[condition]++;
		}

		countAlivePokemon() {
			let alive = this.teamPv.length || 6;
			for (let poke of this.pokemon) {
				if (poke.fainted) alive--;
			}
			return alive;
		}
	}

	BattleDataManager.Player = Player;

	BattleDataManager.getFormatsData = function (gen) {
		if (!gen || gen > 8 || gen < 1) gen = 8;
		try {
			return require(Path.resolve(BAT_DATA_DIR, "gen" + gen, "formats-data.js")).BattleFormatsData;
		} catch (e) {
			try {
				return App.data.getFormatsData();
			} catch (ex) {
				return null;
			}
		}
	};

	return BattleDataManager;
};
