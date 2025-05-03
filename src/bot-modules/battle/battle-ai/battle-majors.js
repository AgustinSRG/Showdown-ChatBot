/**
 * Battle Majors
 */

'use strict';

const Text = Tools('text');

exports.setup = function (App, BattleData) {
	const Move = BattleData.Move;

	return {
		rated: function (args, kwargs) {
			this.rated = true;
		},

		request: function (args, kwargs) {
			args.shift();
			let data = args.join("|");
			if (!isNaN(data.substr(0, 1)) && data.substr(1, 1) === '|') {
				this.nextIsRequest = true;
				return;
			}
			try {
				this.request = JSON.parseNoPrototype(data);
			} catch (err) {
				return;
			}
			this.rqid = this.request ? this.request.rqid : -1;
			if (this.waitingForRequestToMove) {
				this.waitingForRequestToMove = false;
				this.makeDecision();
			} else {
				this.decisionTimeout = setTimeout(this.onDecisionTimeout.bind(this), 1000);
			}
		},

		start: function (args, kwargs) {
			this.battleReadyToStart = true;
			this.started = true;
			this.checkTimer();
		},

		turn: function (args, kwargs) {
			this.turn = parseInt(args[1]) || 0;
			this.checkTimer();
			this.makeDecision();
		},

		upkeep: function () {
			if (this.timer) return;

			this.checkTimer();
			this.makeDecision();
		},

		tier: function (args, kwargs) {
			if (!args[1]) args[1] = '';
			for (let i in kwargs) args[1] += '[' + i + '] ' + kwargs[i];
			this.tier = args[1];
			if (Text.toId(this.tier) === "inversebattle") {
				this.conditions["inversebattle"] = true;
			}
			this.start();
		},

		gametype: function (args, kwargs) {
			this.gametype = args[1];
			this.conditions["gametype"] = args[1];
			switch (args[1]) {
				case "singles":
					this.players.p1.active = [null];
					this.players.p2.active = [null];
					break;
				case 'doubles':
					this.players.p1.active = [null, null];
					this.players.p2.active = [null, null];
					break;
				case 'triples':
				case 'rotation':
					this.players.p1.active = [null, null, null];
					this.players.p2.active = [null, null, null];
					break;
				case 'freeforall':
				case 'multi':
					for (let id in this.players) {
						this.players[id].active = [null, null];
					}
					break;
				default:
					App.log("Unknown gametype: " + args[1] + " / Battle: " + this.id);
			}
		},

		variation: function (args, kwargs) {
			this.variations.push(args[1]);
		},

		rule: function (args, kwargs) {
			const rule = args[1].split(':')[0];
			this.rules.push(rule);
			if (Text.toId(rule) === "inversemod") {
				this.conditions["inversebattle"] = true;
			}
		},

		inactive: function (args, kwargs) {
			this.timer = true;
			this.debug(this.id + "->Inactive: " + JSON.stringify(args));
			if (args[1]) {
				if (args[1].indexOf("Battle timer is now ON") === 0 ||
					args[1].indexOf("You have") === 0 ||
					args[1].indexOf("Time left:") === 0 ||
					args[1].indexOf(App.bot.getBotNick().substr(1)) >= 0) {
					this.makeDecision();
				}

				if (args[1].indexOf(App.bot.getBotNick().substr(1) + " reconnected") === 0) {
					this.waitingForRequestToMove = true;
				}
			}
		},

		error: function (args, kwargs) {
			this.timer = true;
			this.debug(this.id + "->Callback error: " + JSON.stringify(kwargs));
			if (kwargs["Unavailable choice"]) {
				this.waitingForRequestToMove = true;
			}
		},

		inactiveoff: function (args, kwargs) {
			this.timer = false;

			if (this.turn > 0) {
				this.timerExplicitlyTurnedOff = true;
			}
		},

		j: "join",
		join: function (args, kwargs) {
			this.users[Text.toId(args[1])] = args[1];
		},

		l: "leave",
		leave: function (args, kwargs) {
			if (this.users[Text.toId(args[1])]) delete this.users[Text.toId(args[1])];
		},

		player: function (args, kwargs) {
			let id = args[1];
			let name = args[2];
			let avatar = args[3];
			if (this.players[id]) {
				this.players[id].setName(name || "");
				this.players[id].avatar = avatar || 0;
				if (this.players[id].userid) {
					if (this.players[id].userid === Text.toId(App.bot.getBotNick())) {
						this.self = this.players[id];
					} else {
						this.foe = this.players[id];
					}
				}
			}
		},

		win: function (args, kwargs, isIntro) {
			if (!this.self) return; // Not playing
			if (!isIntro) this.win(args[1]);
			this.ended = true;
			this.leave();
		},

		tie: function (args, kwargs, isIntro) {
			if (!this.self) return; // Not playing
			this.ended = true;
			if (!isIntro) this.win();
			this.leave();
		},

		prematureend: function (args, kwargs) {
			if (!this.self) return; // Not playing
			this.ended = true;
			this.leave();
		},

		clearpoke: function (args, kwargs) {
			this.players.p1.teamPv = [];
			this.players.p2.teamPv = [];
			for (let i = 0; i < this.players.p1.active.length; i++) {
				this.players.p1.active[i] = null;
				this.players.p1.active[i] = null;
			}
		},

		poke: function (args, kwargs) {
			let p = args[1];
			if (!this.players[p]) return;
			this.players[p].teamPv.push(this.parseDetails(args[2]));
		},

		detailschange: function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let details = this.parseDetails(args[2]);
			poke.removeVolatile('formechange');
			poke.removeVolatile('typeadd');
			poke.removeVolatile('typechange');
			for (let i in details) poke[i] = details[i];
			poke.template = BattleData.getPokemon(details.species, this.gen);
		},

		teampreview: function (args, kwargs) {
			if (args[1]) this.teamPreview = parseInt(args[1]) || 1;
			this.battleReadyToStart = true;
			this.makeDecision();
			this.checkTimer();
		},

		drag: "switch",
		"replace": "switch",
		"switch": function (args, kwargs) {
			let spl = args[1].split(": ");
			let p = spl[0].substr(0, 2);
			let slot = this.parseSlot(spl[0].substr(2, 1));
			let name = (spl[1] || "");
			let details = this.parseDetails(args[2]);
			let health = this.parseStatus(args[3]);
			/* Get the pokemon or create a new one */
			let poke = null;
			for (let i = 0; i < this.players[p].pokemon.length; i++) {
				if (!this.players[p].pokemon[i].active && !this.players[p].pokemon[i].fainted && this.players[p].pokemon[i].hasSameDetails(name, details)) {
					poke = this.players[p].pokemon[i];
				}
			}
			if (!poke) {
				poke = new BattleData.Pokemon(BattleData.getPokemon(details.species || Text.toId(name), this.gen), { name: name });
				this.players[p].pokemon.push(poke);
			}
			poke.active = true;
			poke.slot = slot;
			for (let i in details) poke[i] = details[i];
			if (health) poke.hp = health.hp;
			if (health) poke.status = health.status;
			poke.helpers.sw = this.turn;
			/* Get the active */
			let active = this.players[p].active[slot];
			if (!active) {
				/* Forced switch */
				while (this.players[p].active.length <= slot) {
					this.players[p].active.push(null);
				}
				this.players[p].active[slot] = poke;
			} else {
				if (!health) {
					poke.hp = active.hp;
					poke.status = active.status;
				}
				/* Normal switch */
				if (active.passing && active.passing === this.turn) {
					/* Pass the boost and volatiles */
					active.removeVolatile('airballoon');
					active.removeVolatile('attract');
					active.removeVolatile('autotomize');
					active.removeVolatile('disable');
					active.removeVolatile('foresight');
					active.removeVolatile('imprison');
					active.removeVolatile('mimic');
					active.removeVolatile('miracleeye');
					active.removeVolatile('smackdown');
					active.removeVolatile('torment');
					active.removeVolatile('typeadd');
					active.removeVolatile('typechange');
					active.removeVolatile('yawn');
					active.removeVolatile('transform');
					active.removeVolatile('formechange');
					for (let vol in active.volatiles) poke.addVolatile(vol);
					for (let b in active.boosts) poke.boosts[b] = active.boosts[b];
					active.passing = false;
					active.passingSubstitute = false;
				} else if (active.passingSubstitute && active.passingSubstitute === this.turn) {
					poke.addVolatile('substitute');
					active.passing = false;
					active.passingSubstitute = false;
				}
				active.removeAllVolatiles();
				active.removeAllBoosts();
				if (active.transformed) active.unTransform();
				active.supressedAbility = false;
				active.ability = active.baseAbility;
				active.active = false;
				active.slot = -1;
				this.players[p].active[slot] = poke;
			}
		},

		faint: function (args, kwargs, isIntro) {
			let poke = this.getActive(args[1]);
			let det = this.parsePokemonIdent(args[1]);
			poke.fainted = true;
			poke.active = false;
			poke.passing = false;
			poke.passingSubstitute = false;
			poke.hp = 0;
			poke.tera = '';
			if (!isIntro) this.message("faint", det.side, poke.name);
		},

		swap: function (args, kwargs) {
			let poke = this.parsePokemonIdent(args[1]);
			let to = parseInt(args[2]) || 0;
			let player = this.players[poke.side];
			let temp = player.active[poke.slot];
			player.active[poke.slot] = player.active[to];
			player.active[to] = temp;
		},

		move: function (args, kwargs) {
			let poke = this.getActive(args[1]);
			let det = this.parsePokemonIdent(args[1]);
			let poke2 = this.getActive(args[3]);
			let moveTemplate = BattleData.getMove(args[2], this.gen);
			let fromeffect = null;
			let noDeductPP = false;
			this.lastMove = {
				move: args[2],
				source: poke,
				target: poke2,
			};
			if (kwargs.from) fromeffect = BattleData.getEffect(kwargs.from, this.gen);
			if (fromeffect) {
				switch (fromeffect.id) {
					case 'snatch':
					case 'magicbounce':
					case 'magiccoat':
					case 'rebound':
					case 'metronome':
					case 'naturepower':
						return; // Not a real move
					case 'sleeptalk':
						noDeductPP = true; // Real move, but not really used
						break;
				}
			}
			let move = null;
			for (let i = 0; i < poke.moves.length; i++) {
				if (poke.moves[i].id === moveTemplate.id) {
					move = poke.moves[i];
					break;
				}
			}
			if (!move) {
				move = new Move(moveTemplate);
				if (poke.transformed) move.pp = 5;
				poke.moves.push(move);
			}
			if (move.id === 'wish' || move.id === 'healingwish' || move.id === 'lunardance') {
				if (this.players[det.side]) {
					this.players[det.side].side.wish = {
						move: move.id,
						turn: this.turn,
						poke: poke,
					};
				}
			}
			if (move.id === 'batonpass') {
				poke.passing = this.turn;
			} else if (move.id === 'shedtail') {
				poke.passingSubstitute = this.turn;
			}
			if (!noDeductPP && kwargs.from !== 'lockedmove') {
				if (args[1] !== args[3] && poke2 && poke2.ability && poke2.ability.id === "pressure") {
					move.pp -= 2;
				} else {
					move.pp--;
				}
			} else {
				poke.prepared = null;
			}
			poke.helpers.lastMove = move.id;
			poke.helpers.lastMoveTurn = this.turn;
			poke.helpers.lastMoveTarget = poke2 || (this.foe && this.foe.active[0]);
			if (poke2) {
				poke2.helpers.lastReceivedEffect = 'move';
				poke2.helpers.lastReceivedMove = move.id;
				poke2.helpers.lastReceivedMoveTurn = this.turn;
				poke2.helpers.lastReceivedMoveSide = det.side;
				poke2.helpers.lastReceivedMoveOrigin = poke;
			}
			if (kwargs.spread) {
				const otherTargets = (kwargs.spread + "").split(",");
				for (let otherTarget of otherTargets) {
					const otherPoke = this.getActive(otherTarget);
					otherPoke.helpers.lastReceivedEffect = 'move';
					otherPoke.helpers.lastReceivedMove = move.id;
					otherPoke.helpers.lastReceivedMoveTurn = this.turn;
					otherPoke.helpers.lastReceivedMoveSide = det.side;
					otherPoke.helpers.lastReceivedMoveOrigin = poke;
				}
			}
		},

		cant: function (args, kwargs, isIntro) {
			let poke = this.getActive(args[1]);
			let effect = BattleData.getEffect(args[2], this.gen);
			let moveTemplate = BattleData.getMove(args[3] || "", this.gen);
			let det = this.parsePokemonIdent(args[1]);
			switch (effect.id) {
				case 'taunt':
				case 'gravity':
				case 'healblock':
				case 'imprison':
				case 'skydrop':
				case 'recharge':
				case 'focuspunch':
				case 'nopp':
					break;
				case 'slp':
					if (!poke.helpers.sleepCounter) poke.helpers.sleepCounter = 0;
					poke.helpers.sleepCounter++;
					if (!isIntro) this.message(effect.id, det.side, poke.name); // hax
					return;
				case 'par':
				case 'frz':
				case 'flinch':
				case 'attract':
					if (!isIntro) this.message(effect.id, det.side, poke.name); // hax
					return; // No move
			}
			let move = null;
			for (let i = 0; i < poke.moves.length; i++) {
				if (poke.moves[i].id === moveTemplate.id) {
					move = poke.moves[i];
					break;
				}
			}
			if (!move) {
				move = new Move(moveTemplate);
				if (poke.transformed) move.pp = 5;
				poke.moves.push(move);
			}
		},

		gen: function (args, kwargs) {
			this.gen = parseInt(args[1]);
		},

		title: function (args, kwargs) {
			this.title = (args[1] || "").trim();
		},

		callback: function (args, kwargs) {
			args.shift();
			let pokemon = isNaN(Number(args[1])) ? this.getActive(args[1]) : this.self.active[args[1]];
			let requestData = this.request.active[pokemon.slot];
			switch (args[0]) {
				case 'trapped':
					requestData.trapped = true;
					break;
				case 'cant':
					for (let i = 0; i < requestData.moves.length; i++) {
						if (requestData.moves[i].id === args[3]) {
							requestData.moves[i].disabled = true;
						}
					}
					break;
			}
			this.makeDecision(true);
		},

		cantleave: function () {
			this.leaveForbidden = true;
		},

		allowleave: function () {
			this.leaveForbidden = false;
		},

		c: function (args) {
			if (this.leaveForbidden && (args[1] === "&" || args[1] === "~") && (args[2] + "").startsWith("/uhtml controls,") && (args[2] + "").includes('name="send"')) {
				// Controls to confirm
				// NOTE: This may change in the future. Currently there is not a specific message to indicate this.
				this.send("/confirmready");
			}
		},
	};
};
