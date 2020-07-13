/**
 * Battle data parsing system
 */


'use strict';

const MAX_RECURSIVE = 5;
const MIN_TIME_LOCK = 3 * 1000; // 3 secods to avoid send spam

const Path = require('path');
const Util = require('util');
const Text = Tools('text');

exports.setup = function (App) {
	const BattleData = require(Path.resolve(__dirname, "battle-data.js")).setup(App);
	const Modules = require(Path.resolve(__dirname, "modules.js")).setup(App, BattleData);
	const DecisionMaker = require(Path.resolve(__dirname, "decision.js"));
	const Calc = require(Path.resolve(__dirname, "calc.js"));

	const Player = BattleData.Player;
	const Config = App.config.modules.battle;

	const majors = exports.majors = require(Path.resolve(__dirname, "battle-majors.js")).setup(App, BattleData);
	const minors = exports.minors = require(Path.resolve(__dirname, "battle-minors.js")).setup(App, BattleData);

	class Battle {
		constructor(id) {
			this.id = id;
			this.title = "";
			this.players = {
				p1: new Player("p1"),
				p2: new Player("p2"),
			};
			this.users = {};

			this.self = null;
			this.foe = null;

			this.gametype = "singles";
			this.gen = 8;
			this.tier = "ou";
			this.rules = [];
			this.variations = [];

			this.started = false;
			this.timer = false;
			this.sentTimerReq = 0;
			this.turn = 0;
			this.request = null;
			this.rqid = 0;
			this.teamPreview = 1;

			this.waitingForRequestToMove = false;

			this.conditions = {};

			this.buffer = [];
			this.lastSend = {
				rqid: -1,
				time: 0,
				decision: null,
			};
			this.lock = false;
			this.leaveInterval = null;
			this.nextIsRequest = false;
		}

		send(data) {
			if (!data) return;
			this.log("SENT: " + JSON.stringify(data));
			App.bot.sendTo(this.id, data);
		}

		log(txt) {
			if (!App.config.debug) return;
			this.buffer.push(txt);
		}

		debug(txt) {
			this.log('DEBUG: ' + txt);
		}

		evalBattle(txt) {
			if (App.jsInject) {
				return eval(txt);
			} else {
				return "[Javascript injection is disabled]";
			}
		}

		sendDecision(decision, retry) {
			if (this.ended) return;
			if (!decision || !decision.length) return;
			this.debug("Send Decision: " + JSON.stringify(decision));
			let str = "/choose ";
			for (let i = 0; i < decision.length; i++) {
				switch (decision[i].type) {
				case "team":
					let team = [];
					for (let j = 0; j < decision[i].team.length; j++) {
						team.push(decision[i].team[j] + 1);
					}
					let first = team[0] || 1;
					for (let j = first - 1; j > 0; j--) {
						if (team.indexOf(j) === -1) {
							team.push(j);
						}
					}
					if (this.request && this.request.side && this.request.side.pokemon) {
						for (let j = 1; j <= this.request.side.pokemon.length; j++) {
							if (team.indexOf(j) === -1) {
								team.push(j);
							}
						}
					}
					str += "team " + team.join("");
					break;
				case "move":
					str += "move " + (decision[i].moveId + 1);
					if (decision[i].mega) str += " mega";
					if (decision[i].zmove) str += " zmove";
					if (decision[i].ultra) str += " ultra";
					if (decision[i].dynamax && decision[i].dynamax !== "still") str += " dynamax";
					if (decision[i].target !== null) {
						if (decision[i].target >= 0) str += " " + (decision[i].target + 1);
						else str += " " + (decision[i].target);
					}
					break;
				case "switch":
					str += "switch " + (decision[i].pokeId + 1);
					break;
				case "pass":
					str += "pass";
					break;
				case "shift":
					str += "shift";
					break;
				}
				if (i < decision.length - 1) str += ", ";
			}
			this.lastSend = {
				rqid: this.rqid,
				time: Date.now(),
				decision: decision,
			};
			let cmds = [];
			if (retry) {
				cmds.push("/undo");
			}
			cmds.push(str + "|" + this.rqid);
			this.send(cmds);
		}

		checkTimer() {
			if (!this.self || !this.request) return; // Not playing
			if (!this.timer) {
				if (this.sentTimerReq && Date.now() - this.sentTimerReq < MIN_TIME_LOCK) return; // Do not spam timer commands
				this.sentTimerReq = Date.now();
				this.send("/timer on");
			}
		}

		leave() {
			if (!this.leaveInterval) {
				this.leaveInterval = setInterval(function () {
					this.send("/leave");
				}.bind(this), 5000);
			}
			this.send('/leave');
		}

		start() {
			if (!this.self || !this.request) return; // Not playing
			let wmsg = Config.initBattleMsg;
			if (wmsg && wmsg.length) this.send(wmsg[Math.floor(Math.random() * wmsg.length)]);
		}

		win(winner) {
			if (!this.self) return; // Not playing
			let win = (Text.toId(winner) === Text.toId(App.bot.getBotNick()));
			let txt = '';
			let server = App.config.server.url;
			if (server && App.config.debug) {
				let html = '<html><head><title>' + this.id + '</title></head><body>' +
				this.buffer.map(line => ('<p>' + Text.escapeHTML(line) + '</p>')).join('') + '</body></html>';
				let key = App.data.temp.createTempFile(html);
				App.log("Generated battle log: " + this.id + " - " + key);
				if (server.charAt(server.length - 1) === '/') {
					txt = ' (' + App.config.server.url + 'temp/' + key + ')';
				} else {
					txt = ' (' + App.config.server.url + '/temp/' + key + ')';
				}
			}
			if (win) {
				let winmsg = Config.winmsg;
				if (winmsg && winmsg.length) {
					this.send(winmsg[Math.floor(Math.random() * winmsg.length)] + txt);
				} else if (txt) {
					this.send(txt);
				}
			} else {
				let losemsg = Config.losemsg;
				if (losemsg && losemsg.length) {
					this.send(losemsg[Math.floor(Math.random() * losemsg.length)] + txt);
				} else if (txt) {
					this.send(txt);
				}
			}
		}

		message(type, player, poke) {
			if (!this.self) return; // Not playing
			if (!Config.battleMessages || !Config.battleMessages[type]) return;
			if (!player) {
				if (Config.battleMessages[type]["self"]) {
					this.send(Config.battleMessages[type]["self"][Math.floor(Math.random() * Config.battleMessages[type]["self"].length)]);
					return;
				}
				this.send(Config.battleMessages[type][Math.floor(Math.random() * Config.battleMessages[type].length)]);
				return;
			}
			let side = (player === this.self.id) ? "self" : "foe";
			if (Config.battleMessages[type][side]) {
				let msg = Config.battleMessages[type][side][Math.floor(Math.random() * Config.battleMessages[type][side].length)];
				if (poke) msg = msg.replace(/#poke/g, poke);
				this.send(msg);
			}
		}

		getDecisions() {
			return DecisionMaker.getDecisions(this, BattleData);
		}

		makeDecision(forced) {
			if (!this.self) return; // Not playing
			this.debug(this.id + "->MakeDecision");
			if (Config.maxTurns && this.turn > Config.maxTurns) {
				this.debug(this.id + "->Forfeit (Turns limit reached)");
				this.send("/forfeit");
				return;
			}
			if (!forced && this.lastSend.rqid >= 0 && this.lastSend.rqid === this.rqid) {
				if (Date.now() - this.lastSend.time < MIN_TIME_LOCK) return;
				if (this.lastSend.decision) {
					this.sendDecision(this.lastSend.decision, true);
					return;
				}
			}
			if (this.lock) return;
			this.lock = true;
			this.debug("Making decisions - " + this.id);
			let decisions, mod;
			try {
				decisions = DecisionMaker.getDecisions(this, BattleData);
			} catch (e) {
				this.debug(e.stack);
				this.debug("Decision maker crashed: " + e.message);
				App.reportCrash(e);
				this.lock = false;
				return;
			}
			if (!decisions || !decisions.length) {
				this.debug("Nothing to do: " + this.id);
				this.lock = false;
				return;
			}
			try {
				mod = Modules.choose(this);
				if (mod) {
					let decision = mod.decide(this, decisions);
					if (decision instanceof Array) {
						this.lock = false;
						this.sendDecision(decision);
						return;
					}
				}
			} catch (ex) {
				this.debug(ex.stack);
				this.debug("Module failed: " + mod.id + " | " + ex.message);
				App.reportCrash(ex);
			}
			this.lock = false;
			this.sendDecision(decisions[Math.floor(Math.random() * decisions.length)]);
		}

		add(line, isIntro) {
			this.run(line, isIntro);
			this.log(line);
		}

		run(str, isIntro) {
			if (!str) return;
			if (this.nextIsRequest) {
				str = '|request|' + str;
				this.nextIsRequest = false;
			}
			if (str.charAt(0) !== '|' || str.substr(0, 2) === '||') {
				return;
			} else {
				let args = ['done'], kwargs = {};
				if (str !== '|') {
					args = str.substr(1).split('|');
				}
				while (args[args.length - 1] && args[args.length - 1].substr(0, 1) === '[') {
					let bracketPos = args[args.length - 1].indexOf(']');
					if (bracketPos <= 0) break;
					let argstr = args.pop();
					// default to '.' so it evaluates to boolean true
					kwargs[argstr.substr(1, bracketPos - 1)] = ((argstr.substr(bracketPos + 1)).trim() || '.');
				}
				if (args[0].substr(0, 1) === '-') {
					this.runMinor(args, kwargs, isIntro);
				} else {
					this.runMajor(args, kwargs, isIntro);
				}
			}
		}

		runMinor(args, kwargs, isIntro) {
			if (args) {
				if (args[2] === 'Sturdy' && args[0] === '-activate') args[2] = 'ability: Sturdy';
			}
			if (minors[args[0]]) {
				let minor = minors[args[0]];
				let r = 0;
				while (typeof minor === "string" && r <= MAX_RECURSIVE) {
					minor = minors[minor];
					r++;
				}
				if (typeof minor !== "function") {
					this.debug("Unknown minor type: " + args[0] + " - " + Util.inspect(minor) + "");
				} else {
					try {
						minor.call(this, args, kwargs, isIntro);
					} catch (e) {
						this.debug(e.message);
						this.debug(e.stack);
						this.debug("Minor failed | Battle id: " + this.id + " | Minor: " + args[0]);
						App.log("MINOR FAILED: " + e.message + "\nargs: " + args.join("|") + "\nkwargs: " +
						JSON.stringify(kwargs) + "\nroom: " + this.id + "\n" + e.stack);
					}
				}
			}
		}

		runMajor(args, kwargs, isIntro) {
			if (majors[args[0]]) {
				let major = majors[args[0]];
				let r = 0;
				while (typeof major === "string" && r <= MAX_RECURSIVE) {
					major = majors[major];
					r++;
				}
				if (typeof major !== "function") {
					this.debug("Unknown major type: " + args[0] + " - " + Util.inspect(major) + "");
				} else {
					try {
						major.call(this, args, kwargs, isIntro);
					} catch (e) {
						this.debug(e.message);
						this.debug(e.stack);
						this.debug("Major failed | Battle id: " + this.id + " | Major: " + args[0]);
						App.log("MAJOR FAILED: " + e.message + "\nargs: " + args.join("|") + "\nkwargs: " +
						JSON.stringify(kwargs) + "\nroom: " + this.id + "\n" + e.stack);
					}
				}
			}
		}

		parseDetails(str) {
			if (!str) return null;
			let details = str.split(",");
			for (let d = 0; d < details.length; d++) {
				details[d] = details[d].trim();
			}
			let poke = {
				species: "",
				level: 100,
				shiny: false,
				gender: false,
			};
			if (details[details.length - 1] === "shiny") {
				poke.shiny = true;
				details.pop();
			}
			if (details[details.length - 1] === "M" || details[details.length - 1] === "F") {
				poke.gender = details[details.length - 1];
				details.pop();
			}
			if (details[1]) {
				poke.level = parseInt(details[1].substr(1)) || 100;
			}
			if (details[0]) {
				poke.species = details[0];
			}
			return poke;
		}

		parseSlot(id) {
			const slots = {a: 0, b: 1, c: 2, d: 3, e: 4, f: 5};
			return slots[id] || 0;
		}

		parseStatus(str) {
			if (!str) return null;
			let status = {
				hp: 100,
				status: false,
			};
			let sp = str.split(" ");
			if (sp[1]) status.status = Text.toId(sp[1]);
			sp = sp[0].split("/");
			if (sp.length === 2) {
				let d = parseInt(sp[1]);
				if (d) {
					status.hp = parseInt(sp[0]) * 100 / d;
				}
			} else {
				status.hp = parseInt(sp[0]) || 0;
			}
			return status;
		}

		parseHealth(str) {
			let hp = 100;
			let sp = str.split(" ");
			sp = sp[0].split("/");
			if (sp.length === 2) {
				let d = parseInt(sp[1]);
				if (d) {
					hp = parseInt(sp[0]) * 100 / d;
				}
			} else {
				hp = parseInt(sp[0]) || 0;
			}
			return hp;
		}

		getSide(str) {
			if (!str) return null;
			str = str.split(":")[0];
			return this.players[str];
		}

		getActive(str) {
			if (!str) return null;
			let side = str.substr(0, 2);
			str = str.substr(2);
			let pokeId = str.substr(0, 1);
			let slot = this.parseSlot(pokeId);
			str = str.substr(1);
			let name = (str.substr(1) || "").trim();
			if (this.players[side] && this.players[side].active[slot]) {
				this.players[side].active[slot].name = name;
				return this.players[side].active[slot];
			}
			return null;
		}

		parsePokemonIdent(str) {
			if (!str) return null;
			let side = str.substr(0, 2);
			str = str.substr(2);
			let pokeId = str.substr(0, 1);
			let slot = this.parseSlot(pokeId);
			str = str.substr(1);
			let name = (str.substr(1) || "").trim();
			return {
				side: side,
				slot: slot,
				name: name,
			};
		}

		getCalcRequestPokemon(sideId, forceMega) {
			let p = this.request.side.pokemon[sideId];
			let details = this.parseDetails(p.details);
			let condition = this.parseStatus(p.condition);
			let pokeA = new Calc.Pokemon(BattleData.getPokemon(details.species, this.gen),
				{level: details.level, shiny: details.shiny, gender: details.gender});
			pokeA.item = BattleData.getItem(p.item, this.gen);
			pokeA.ability = BattleData.getAbility(p.baseAbility, this.gen);
			pokeA.status = condition.status;
			pokeA.hp = condition.hp;
			pokeA.stats = p.stats;
			if (forceMega && (p.canMegaEvo || (this.request.active && this.request.active[sideId] && this.request.active[sideId].canMegaEvo))) {
				if (pokeA.item.megaStone) {
					pokeA.template = BattleData.getPokemon(pokeA.item.megaStone, this.gen);
					pokeA.species = pokeA.template.species;
					pokeA.ability = BattleData.getAbility(pokeA.template.abilities[0]);
				}
			}
			return pokeA;
		}

		destroy() {
			if (this.leaveInterval) {
				clearInterval(this.leaveInterval);
				this.leaveInterval = null;
			}
		}
	}

	return Battle;
};
