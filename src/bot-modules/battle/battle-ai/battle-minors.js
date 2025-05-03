/**
 * Battle Minors
 */

'use strict';

const Text = Tools('text');

exports.setup = function (App, BattleData) {
	return {
		"-damage": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let hp = this.parseHealth(args[2]);
			poke.hp = hp;
			if (kwargs.from) {
				let effect = BattleData.getEffect(kwargs.from, this.gen);
				let ofpoke = this.getActive(kwargs.of);
				if (effect.effectType === 'Ability' && ofpoke) {
					ofpoke.markAbility(effect.name);
				}
				switch (effect.id) {
					case 'stealthrock':
					case 'spikes':
					case 'recoil':
					case 'sandstorm':
					case 'hail':
					case 'baddreams':
					case 'nightmare':
					case 'roughskin':
					case 'ironbarbs':
					case 'aftermath':
					case 'liquidooze':
					case 'dryskin':
					case 'solarpower':
					case 'confusion':
					case 'leechseed':
					case 'flameburst':
					case 'firepledge':
					case 'jumpkick':
					case 'highjumpkick':
						break;
					case 'brn':
					case 'psn':
						if (!poke.helpers.stausCounter) poke.helpers.stausCounter = 0;
						poke.helpers.stausCounter++;
						break;
					default:
						if (ofpoke) {
							return;
						} else if (effect.effectType === 'Item') {
							poke.item = BattleData.getItem(effect.name, this.gen);
						} else if (effect.effectType === 'Ability') {
							poke.markAbility(effect.name);
						}
						break;
				}
			} else {
				poke.timesHit++;
			}
		},

		"-heal": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let det = this.parsePokemonIdent(args[1]);
			let hp = this.parseHealth(args[2]);
			poke.hp = hp;
			poke.fainted = false;
			if (kwargs.from) {
				let effect = BattleData.getEffect(kwargs.from, this.gen);
				if (effect.effectType === 'Ability') {
					poke.markAbility(effect.name);
				} else if (effect.effectType === 'Item') {
					poke.item = BattleData.getItem(effect.id, this.gen);
				}
				switch (effect.id) {
					case 'ingrain':
					case 'aquaring':
					case 'drain':
						break;
					case 'lunardance':
						for (let i = 0; i < poke.moves.length; i++) {
							poke.moves[i].restorePP();
						}
						this.players[det.side].side.wish = null;
						break;
					case 'healingwish':
					case 'wish':
						this.players[det.side].side.wish = null;
						break;
				}
			}
		},

		"-sethp": function (args, kwargs) {
			let poke, hp;
			for (let i = 1; i < args.length - 1; i += 2) {
				poke = this.getActive(args[i]);
				hp = this.parseHealth(args[i + 1]);
				poke.hp = hp;
			}
		},

		"-boost": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let stat = args[2];
			let n = parseInt(args[3]) || 0;
			poke.addBoost(stat, n);
			if (kwargs.from) {
				let effect = BattleData.getEffect(kwargs.from, this.gen);
				let ofpoke = this.getActive(kwargs.of);
				if (effect.effectType === 'Ability' && !(effect.id === 'weakarmor' && stat === 'spe')) {
					(ofpoke || poke).markAbility(effect.name);
				} else if (effect.effectType === 'Item') {
					(ofpoke || poke).item = BattleData.getItem(effect.id, this.gen);
				}
			}
		},

		"-unboost": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let stat = args[2];
			let n = parseInt(args[3]) || 0;
			poke.addBoost(stat, (-1) * n);
			if (kwargs.from) {
				let effect = BattleData.getEffect(kwargs.from, this.gen);
				let ofpoke = this.getActive(kwargs.of);
				if (effect.effectType === 'Ability') {
					(ofpoke || poke).markAbility(effect.name);
				} else if (effect.effectType === 'Item') {
					(ofpoke || poke).item = BattleData.getItem(effect.id, this.gen);
				}
			}
		},

		"-setboost": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let stat = args[2];
			let n = parseInt(args[3]) || 0;
			poke.setBoost(stat, (-1) * n);
			if (kwargs.from) {
				let effect = BattleData.getEffect(kwargs.from, this.gen);
				switch (effect.id) {
					case 'bellydrum':
						break;
					case 'angerpoint':
						poke.markAbility('Anger Point');
						break;
				}
			}
		},

		"-swapboost": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let poke2 = this.getActive(args[2]);
			if (args[3]) {
				let stats = args[3].split(",");
				let stat, tmp;
				for (let i = 0; i < stats.length; i++) {
					stat = Text.toId(stats[i]);
					tmp = poke.boosts[stat];
					poke.boosts[stat] = poke2.boosts[stat];
					poke2.boosts[stat] = tmp;
					if (!poke.boosts[stat]) delete poke.boosts[stat];
					if (!poke2.boosts[stat]) delete poke2.boosts[stat];
				}
			} else {
				let tmp = poke.boosts;
				poke.boosts = poke2.boosts;
				poke2.boosts = tmp;
			}
		},

		"-restoreboost": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			for (let i in poke.boosts) {
				if (poke.boosts[i] < 0) delete poke.boosts[i];
			}
		},

		"-copyboost": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let poke2 = this.getActive(args[2]);
			if (args[3]) {
				let stats = args[3].split(",");
				let stat;
				for (let i = 0; i < stats.length; i++) {
					stat = Text.toId(stats[i]);
					poke.boosts[stat] = poke2.boosts[stat];
					if (!poke.boosts[stat]) delete poke.boosts[stat];
				}
			} else {
				poke.removeAllBoosts();
				for (let i in poke2.boosts) {
					poke.boosts[i] = poke2.boosts[i];
					if (!poke.boosts[i]) delete poke.boosts[i];
				}
			}
		},

		"-clearboost": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			poke.removeAllBoosts();
		},

		"-invertboost": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			poke.invertAllBoosts();
		},

		"-clearallboost": function (args, kwargs) {
			for (let p in this.players) {
				for (let i = 0; i < this.players[p].active.length; i++) {
					if (this.players[p].active[i]) {
						this.players[p].active[i].removeAllBoosts();
					}
				}
			}
		},

		"-miss": function (args, kwargs, isIntro) {
			if (isIntro) return;
			let ident = this.parsePokemonIdent(args[1]);
			let identSource = this.parsePokemonIdent(args[2] || args[1]);

			this.message('miss', ident.side, ident.name, identSource.side, identSource.name);
		},

		"-crit": function (args, kwargs, isIntro) {
			if (isIntro) return;
			let ident = this.parsePokemonIdent(args[1]);

			let source = null;

			if (this.lastMove && this.lastMove.source) {
				source = this.lastMove.source;
			}

			this.message('crit', ident.side, ident.name, source ? source.side : null, source ? source.name : null);
		},

		"-immune": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let det = this.parsePokemonIdent(args[1]);
			let effect = BattleData.getEffect(args[2], this.gen);
			let fromeffect = BattleData.getEffect(kwargs.from, this.gen);
			switch (effect.id) {
				case 'confusion':
					break;
				default:
					if (fromeffect && fromeffect.effectType === 'Ability') {
						poke.markAbility(fromeffect.name);
					} else if (fromeffect && fromeffect.effectType === 'Item') {
						poke.item = BattleData.getItem(fromeffect.id, this.gen);
					}
					this.onImmune(poke, fromeffect, this.players[det.side]);
			}
		},

		"-fail": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let effect = BattleData.getEffect(args[2], this.gen);
			let fromeffect = BattleData.getEffect(kwargs.from, this.gen);
			if (fromeffect.id === 'skydrop') {
				return;
			}
			switch (effect.id) {
				case 'brn':
				case 'tox':
				case 'psn':
				case 'slp':
				case 'par':
				case 'frz':
				case 'substitute':
					break;
				case 'hyperspacefury':
				case 'magikarpsrevenge':
				case 'skydrop':
					break;
				case 'sunnyday':
				case 'raindance':
				case 'sandstorm':
				case 'hail':
					break;
				case 'unboost':
					if (fromeffect.effectType === 'Ability') {
						poke.markAbility(fromeffect.id);
					} else if (fromeffect.effectType === 'Item') {
						poke.item = BattleData.getItem(fromeffect.id, this.gen);
					}
					break;
			}
			if (poke.helpers.lastMove) {
				if (poke.helpers.lastMoveTarget) {
					const target = poke.helpers.lastMoveTarget;

					switch (poke.helpers.lastMove) {
						case "trick":
						case "switcheroo":
							target.helpers.hasItemCannotBeChanged = true;
							break;
						case "skillswap":
							target.helpers.hasAbilityCannotBeSwapped = true;
							break;
						case "entrainment":
							target.helpers.hasAbilityCannotBeEntrainment = true;
							break;
						case "gastroacid":
						case "simplebeam":
						case "worryseed":
							target.helpers.hasAbilityCannotBeDisabled = true;
							break;
					}
				}
			}
		},

		"-prepare": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let move = args[2];
			let target = this.parsePokemonIdent(args[3]);
			poke.prepareMove(move, target ? target.slot : 0);
		},

		"-status": function (args, kwargs, isIntro) {
			let poke = this.getActive(args[1]);
			poke.status = args[2];
			poke.helpers.stausCounter = 0;
			if (poke.status === "slp") {
				poke.helpers.sleepCounter = 0;
			}
		},

		"-curestatus": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			poke.status = '';
			if (!args[2] || args[2] === "confusion") poke.removeVolatile('confusion');
		},

		"-cureteam": function (args, kwargs) {
			let ident = this.parsePokemonIdent(args[1]);
			if (this.players[ident.side]) {
				let pokes = this.players[ident.side].pokemon;
				for (let i = 0; i < pokes.length; i++) {
					pokes[i].status = '';
				}
			}
		},

		"-item": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let item = BattleData.getItem(args[2], this.gen);
			let effect = BattleData.getEffect(kwargs.from, this.gen);
			let ofpoke = this.getActive(kwargs.of);
			poke.item = item;
			poke.itemEffect = '';
			poke.removeVolatile('airballoon');
			if (item.id === 'airballoon') poke.addVolatile('airballoon');
			if (effect.id) {
				switch (effect.id) {
					case 'pickup':
						poke.markAbility('Pickup');
						poke.itemEffect = 'found';
						break;
					case 'recycle':
						poke.itemEffect = 'found';
						break;
					case 'frisk':
						ofpoke.markAbility('Frisk');
						if (kwargs.identify) { // used for gen 6
							poke.itemEffect = 'frisked';
						}
						break;
					case 'magician':
					case 'pickpocket':
						poke.markAbility(effect.name);
						poke.itemEffect = 'stolen';
						break;
					case 'thief':
					case 'covet':
						poke.itemEffect = 'stolen';
						break;
					case 'harvest':
						poke.itemEffect = 'harvested';
						poke.markAbility('Harvest');
						break;
					case 'bestow':
						poke.itemEffect = 'bestowed';
						break;
					case 'trick':
						poke.itemEffect = 'tricked';
						break;
				}
			}
		},

		"-enditem": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let item = BattleData.getItem(args[2], this.gen);
			let effect = BattleData.getEffect(kwargs.from, this.gen);
			poke.item = '';
			poke.itemEffect = '';
			poke.prevItem = item;
			poke.prevItemEffect = '';
			poke.removeVolatile('airballoon');
			if (kwargs.eat) {
				poke.prevItemEffect = 'eaten';
			} else if (effect.id) {
				switch (effect.id) {
					case 'fling':
						poke.prevItemEffect = 'flung';
						break;
					case 'knockoff':
						poke.prevItemEffect = 'knocked off';
						break;
					case 'stealeat':
						poke.prevItemEffect = 'stolen';
						break;
					case 'gem':
						poke.prevItemEffect = 'consumed';
						break;
					case 'incinerate':
						poke.prevItemEffect = 'incinerated';
						break;
				}
			} else {
				switch (item.id) {
					case 'airballoon':
						poke.prevItemEffect = 'popped';
						poke.removeVolatile('airballoon');
						break;
					case 'focussash':
						poke.prevItemEffect = 'consumed';
						break;
					case 'focusband':
						break;
					case 'powerherb':
						poke.prevItemEffect = 'consumed';
						break;
					case 'whiteherb':
						poke.prevItemEffect = 'consumed';
						break;
					case 'ejectbutton':
						poke.prevItemEffect = 'consumed';
						break;
					case 'redcard':
						poke.prevItemEffect = 'held up';
						break;
					default:
						poke.prevItemEffect = 'consumed';
				}
			}
		},

		"-ability": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let ident = this.parsePokemonIdent(args[1]);
			let ability = BattleData.getAbility(args[2], this.gen);
			let effect = BattleData.getEffect(kwargs.from, this.gen);
			poke.markAbility(ability.name, effect.id && !kwargs.fail);
			poke.supressedAbility = false;
			switch (ability.id) {
				case 'neutralizinggas':
					if (!this.conditions["neutralizinggas"]) {
						this.conditions["neutralizinggas"] = Object.create(null);
					}
					this.conditions["neutralizinggas"][ident.side + ident.slot] = 1;
					break;
			}
		},

		"-endability": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			poke.supressedAbility = true;
		},

		"-transform": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let tpoke = this.getActive(args[2]);
			let effect = BattleData.getEffect(kwargs.from, this.gen);
			if (effect.effectType === 'Ability') {
				poke.markAbility(effect.name);
			}
			poke.transformInto(tpoke);
		},

		"-formechange": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let template = BattleData.getPokemon(args[2], this.gen);
			let fromeffect = BattleData.getEffect(kwargs.from, this.gen);
			poke.removeVolatile('typeadd');
			poke.removeVolatile('typechange');
			if (fromeffect.effectType === 'Ability') {
				poke.markAbility(fromeffect.name);
			} else if (fromeffect.effectType === 'Item') {
				poke.item = BattleData.getItem(fromeffect.id, this.gen);
			}
			poke.addVolatile('formechange');
			poke.volatiles.formechange = template.species;
		},

		"-mega": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let item = BattleData.getItem(args[3], this.gen);
			if (args[2] !== 'Rayquaza') {
				poke.item = item;
			}
		},

		"-start": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let ident = this.parsePokemonIdent(args[1]);
			let effect = BattleData.getEffect(args[2], this.gen);
			let ofpoke = this.getActive(kwargs.of);
			let fromeffect = BattleData.getEffect(kwargs.from, this.gen);
			poke.addVolatile(effect.id);
			switch (effect.id) {
				case 'typechange':
					poke.removeVolatile('typeadd');
					if (fromeffect.id) {
						if (fromeffect.id === 'colorchange') {
							poke.markAbility('Color Change');
							poke.volatiles.typechange = (args[3] ? args[3].split("/") : []);
						} else if (fromeffect.id === 'reflecttype') {
							poke.volatiles.typechange = ofpoke.template.types.slice();
						} else {
							poke.volatiles.typechange = (args[3] ? args[3].split("/") : []);
						}
					} else {
						poke.volatiles.typechange = (args[3] ? args[3].split("/") : []);
					}
					break;
				case 'typeadd':
					poke.volatiles.typeadd = args[3];
					break;
				case 'disable':
					poke.volatiles.disable = args[3] || true;
					break;
				case 'stockpile2':
					poke.removeVolatile('stockpile1');
					break;
				case 'stockpile3':
					poke.removeVolatile('stockpile2');
					break;
				case 'perish0':
					poke.removeVolatile('perish1');
					break;
				case 'perish1':
					poke.removeVolatile('perish2');
					break;
				case 'perish2':
					poke.removeVolatile('perish3');
					break;
				case 'smackdown':
					poke.removeVolatile('magnetrise');
					poke.removeVolatile('telekinesis');
					break;
				case 'doomdesire':
					this.players[ident.side].side.doomdesire = { turn: this.turn };
					break;
				case 'futuresight':
					this.players[ident.side].side.futuresight = { turn: this.turn };
					break;
			}
		},

		"-end": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let ident = this.parsePokemonIdent(args[1]);
			let effect = BattleData.getEffect(args[2], this.gen);
			poke.removeVolatile(effect.id);
			switch (effect.id) {
				case 'perishsong':
					poke.removeVolatile('perish3');
					break;
				case 'stockpile':
					poke.removeVolatile('stockpile1');
					poke.removeVolatile('stockpile2');
					poke.removeVolatile('stockpile3');
					break;
				case 'neutralizinggas':
					if (this.conditions["neutralizinggas"]) {
						delete this.conditions["neutralizinggas"][ident.side + ident.slot];

						if (Object.keys(this.conditions["neutralizinggas"]).length === 0) {
							delete this.conditions["neutralizinggas"];
						}
					}
					break;
			}
		},

		"-block": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let effect = BattleData.getEffect(args[2], this.gen);
			if (effect.effectType === 'Ability') {
				poke.markAbility(effect.name);
			} else if (effect.effectType === 'Item') {
				poke.item = BattleData.getItem(effect.id, this.gen);
			}
		},

		"-activate": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let effect = BattleData.getEffect(args[2], this.gen);
			let ofpoke = this.getActive(kwargs.of);
			let ofIdent = this.parsePokemonIdent(kwargs.of);
			if (effect.effectType === 'Ability') {
				poke.markAbility(effect.name);
				poke.addVolatile('activeability');
			} else if (effect.effectType === 'Item') {
				poke.item = BattleData.getItem(effect.id, this.gen);
			}
			switch (effect.id) {
				case 'brickbreak':
					this.players[ofIdent.side].removeSideCondition('Reflect');
					this.players[ofIdent.side].removeSideCondition('LightScreen');
					break;
				case 'spite':
					let move = BattleData.getMove(args[3], this.gen).name;
					let pp = args[4];
					poke.markMove(move, Number(pp) * (-1));
					break;
				case 'gravity':
					poke.removeVolatile('magnetrise');
					poke.removeVolatile('telekinesis');
					break;
				case 'skillswap':
					if (this.gen <= 4) break;
					let pokeability = args[3] ? BattleData.getAbility(args[3], this.gen) : ofpoke.ability;
					let ofpokeability = args[4] ? BattleData.getAbility(args[4], this.gen) : poke.ability;
					if (pokeability) {
						poke.ability = pokeability;
						if (!ofpoke.baseAbility) ofpoke.baseAbility = pokeability;
					}
					if (ofpokeability) {
						ofpoke.ability = ofpokeability;
						if (!poke.baseAbility) poke.baseAbility = ofpokeability;
					}
					break;
			}
		},

		"-sidestart": function (args, kwargs) {
			let side = this.getSide(args[1]);
			let effect = BattleData.getEffect(args[2], this.gen);
			side.addSideCondition(effect.name);
		},

		"-sideend": function (args, kwargs) {
			let side = this.getSide(args[1]);
			let effect = BattleData.getEffect(args[2], this.gen);
			side.removeSideCondition(effect.name);
		},

		"-weather": function (args, kwargs) {
			let effect = BattleData.getEffect(args[1], this.gen);
			let poke = this.getActive(kwargs.of);
			let ability = BattleData.getEffect(kwargs.from, this.gen);
			this.conditions.weather = Text.toId(effect.name);
			this.conditions.turnSetWeather = this.turn;
			this.conditions.upkeepWeather = !!kwargs.upkeep;
			if (kwargs.from) poke.markAbility(ability.id);
		},

		"-fieldstart": function (args, kwargs) {
			let effect = BattleData.getEffect(args[1], this.gen);
			let pw = Text.toId(effect.name);
			this.conditions[pw] = { turn: this.turn };
		},

		"-fieldend": function (args, kwargs) {
			let effect = BattleData.getEffect(args[1], this.gen);
			let pw = Text.toId(effect.name);
			if (this.conditions[pw]) delete this.conditions[pw];
		},

		"-message": function (args, kwargs) {
			if (args[1] && args[1].indexOf("NOTE: This is an Inverse Battle") >= 0) {
				this.conditions["inversebattle"] = true;
				this.debug(this.id + ": Changed to inverse Battle");
			} else if (args[1] && args[1].trim() === (App.bot.getBotNick().substr(1) + ' lost due to inactivity.')) {
				App.log("Bot lost due to inactivity. Battle system error. Room: " +
					this.id + " | Last decision: " + JSON.stringify(this.lastSend));
				App.log("Request was: " + JSON.stringify(this.request));
			}
		},

		"-terastallize": function (args, kwargs) {
			let poke = this.getActive(args[1]);
			poke.tera = args[2] || "";
		},
	};
};
