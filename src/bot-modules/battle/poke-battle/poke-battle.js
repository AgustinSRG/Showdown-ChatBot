/**
 * Poke battle
 */

'use strict';

const Path = require('path');
const Chat = Tools('chat');
const Text = Tools('text');

const Calc = require(Path.resolve(__dirname, "..", "battle-ai", "calc.js"));

const Lang_File = Path.resolve(__dirname, 'poke-battle.translations');

// Turn duration in milliseconds
const TURN_DURATION = 700;

// Max turn log size
const MAX_TURN_LOG = 16;

const DEFAULT_MOVE = {
	num: 165,
	accuracy: true,
	basePower: 50,
	category: "Physical",
	id: "struggle",
	name: "Struggle",
	pp: 1,
	noPPBoosts: true,
	priority: 0,
	flags: { contact: 1, protect: 1 },
	noSketch: true,
	effectType: "Move",
};

const FEMALE_SPRITES = [
	"abomasnow",
	"aipom",
	"alakazam",
	"ambipom",
	"arghonaut",
	"basculegion",
	"beautifly",
	"bibarel",
	"bidoof",
	"blaziken",
	"butterfree",
	"cacturne",
	"camerupt",
	"colossoil",
	"combee",
	"combusken",
	"croagunk",
	"cyclohm",
	"dodrio",
	"doduo",
	"donphan",
	"dustox",
	"eevee-starter",
	"fidgit",
	"finneon",
	"flarelm",
	"frillish",
	"gabite",
	"garchomp",
	"gible",
	"girafarig",
	"gligar",
	"gloom",
	"golbat",
	"goldeen",
	"gulpin",
	"gyarados",
	"heracross",
	"hippopotas",
	"hippowdon",
	"houndoom",
	"hypno",
	"indeedee",
	"jellicent",
	"kadabra",
	"kerfluffle",
	"kitsunoh",
	"kricketot",
	"kricketune",
	"krillowatt",
	"krilowatt",
	"ledian",
	"ledyba",
	"ludicolo",
	"lumineon",
	"luxio",
	"luxray",
	"magikarp",
	"mamoswine",
	"medicham",
	"meditite",
	"meganium",
	"meowstic",
	"milotic",
	"murkrow",
	"numel",
	"nuzleaf",
	"octillery",
	"oinkologne",
	"pachirisu",
	"pikachu",
	"pikachu-starter",
	"piloswine",
	"politoed",
	"protowatt",
	"pyroak",
	"pyroar",
	"quagsire",
	"raichu",
	"raticate",
	"rattata",
	"relicanth",
	"revenankh",
	"rhydon",
	"rhyhorn",
	"rhyperior",
	"roselia",
	"roserade",
	"scizor",
	"scratchet",
	"scyther",
	"seaking",
	"shiftry",
	"shinx",
	"sneasel",
	"sneasel-hisui",
	"snover",
	"staraptor",
	"staravia",
	"starly",
	"steelix",
	"sudowoodo",
	"swalot",
	"syclant",
	"tangrowth",
	"tomohawk",
	"toxicroak",
	"unfezant",
	"unown",
	"ursaring",
	"venusaur",
	"venusaur-mega",
	"vileplume",
	"voodoom",
	"weavile",
	"wobbuffet",
	"wooper",
	"xatu",
	"zubat"
];

function toSpriteId(str, gender) {
	const id = ('' + str).replace(/[^a-zA-Z0-9-]+/g, '').toLowerCase();
	const parts = id.split("-");
	if (["wo-chien", "chien-pao", "ting-lu", "chi-yu"].includes(id)) {
		return parts.join("");
	} else {
		return parts[0] + (parts.length > 1 ? ("-" + parts.slice(1).join("")) : "") + ((gender === "F" && FEMALE_SPRITES.indexOf(id) >= 0) ? '-f' : '');
	}
}

class PokeBattle {
	constructor(App, room, pokeA, pokeB, battleId, endCallback) {
		this.app = App;
		this.room = room;
		this.pokeA = pokeA;
		this.pokeB = pokeB;
		this.conditionsA = new Calc.Conditions({});
		this.conditionsB = new Calc.Conditions({});
		this.globalConditions = {};
		this.battleId = battleId;
		this.endCallback = endCallback;
		this.timer = null;
		this.ended = false;
		this.winner = null;

		this.turnNumber = 0;

		this.turns = [];
	}

	start() {
		if (this.timer) return;
		this.nextTurn();
	}

	nextTurn() {
		this.turnNumber++;

		const turn = {
			n: this.turnNumber,
			events: [],
		};

		let attackingTurns = [
			{
				self: this.pokeA,
				selfConditions: this.conditionsA,
				foe: this.pokeB,
				foeConditions: this.conditionsB,
			},
			{
				self: this.pokeB,
				selfConditions: this.conditionsB,
				foe: this.pokeA,
				foeConditions: this.conditionsA,
			}
		];

		for (let attackingTurn of attackingTurns) {
			const self = attackingTurn.self;
			const foe = attackingTurn.foe;

			const selfConditions = attackingTurn.selfConditions;
			const foeConditions = attackingTurn.foeConditions;

			const moves = [];

			for (let availableMove of self.moves) {
				const damage = Calc.calculate(self, foe, availableMove, selfConditions, foeConditions, this.globalConditions);

				const minDamage = damage.getMin();
				const maxDamage = damage.getMax();

				if (maxDamage <= 0) {
					continue;
				}

				const finalDamage = minDamage + Math.floor(Math.random() * (maxDamage - minDamage));

				moves.push({
					move: availableMove,
					damage: finalDamage,
				});
			}

			if (moves.length === 0) {
				// Add default move

				const oldSupressedAbility = foe.supressedAbility;

				if (foe.ability && foe.ability.id === "wonderguard") {
					foe.supressedAbility = true;
				}

				const damage = Calc.calculate(self, foe, DEFAULT_MOVE, selfConditions, foeConditions, this.globalConditions);

				foe.supressedAbility = oldSupressedAbility;

				const minDamage = damage.getMin();
				const maxDamage = damage.getMax();

				const finalDamage = minDamage + Math.floor(Math.random() * (maxDamage - minDamage));

				moves.push({
					move: DEFAULT_MOVE,
					damage: finalDamage,
				});
			}

			// Chose a move

			const chosenMove = moves[Math.floor(Math.random() * moves.length)];

			attackingTurn.chosenMove = chosenMove;
		}

		attackingTurns = attackingTurns.sort(function (a, b) {
			const priorityA = a.chosenMove.priority || 0;
			const priorityB = b.chosenMove.priority || 0;

			if (priorityA > priorityB) {
				return -1;
			} else if (priorityA < priorityB) {
				return 1;
			}

			const speedA = a.self.getStats().spe || 0;
			const speedB = b.self.getStats().spe || 0;

			if (speedA > speedB) {
				return -1;
			} else if (speedB > speedA) {
				return 1;
			} else {
				return Math.random() > 0.5 ? 1 : -1;
			}
		});

		let isSecond = false;

		for (let attackingTurn of attackingTurns) {
			// Calculate each move

			const self = attackingTurn.self;
			const foe = attackingTurn.foe;

			const selfConditions = attackingTurn.selfConditions;
			const foeConditions = attackingTurn.foeConditions;

			const chosenMove = attackingTurn.chosenMove;

			// Calc damage

			let damage = chosenMove.damage;

			if (chosenMove.move.id !== "struggle") {
				const dmg = Calc.calculate(self, foe, chosenMove.move, selfConditions, foeConditions, this.globalConditions);

				const minDamage = Math.max(1, dmg.getMin());
				const maxDamage = Math.max(1, dmg.getMax());

				damage = minDamage + Math.floor(Math.random() * (maxDamage - minDamage));
			}

			// Use move

			turn.events.push({ type: "move", poke: self.name, move: chosenMove.move.name });

			// Check for miss

			const hitChance = this.getHitChance(attackingTurn, chosenMove.move, isSecond);
			isSecond = true;

			if (Math.random() > hitChance) {
				turn.events.push({ type: "miss", poke: foe.name, from: self.name });
				continue;
			}

			// Deal damage

			damage = Math.min(damage, foe.hp);

			foe.hp -= damage;

			turn.events.push({ type: "damage", poke: foe.name, damage: damage });

			if (foe.hp <= 0) {
				this.winner = self;

				turn.events.push({ type: "faint", poke: foe.name });
				turn.events.push({ type: "win", poke: self.name });

				break;
			}
		}

		this.turns.push(turn);

		if (this.turns.length > MAX_TURN_LOG) {
			this.turns.shift();
		}

		this.updateDisplay();

		if (this.winner) {
			this.announceWinner(this.winner);
			this.end();
		} else {
			this.setupTimerNextTurn();
		}
	}

	setupTimerNextTurn() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}

		if (this.ended) {
			return;
		}

		this.timer = setTimeout(() => {
			this.timer = null;
			this.nextTurn();
		}, TURN_DURATION);
	}

	getHitChance(scenario, move, isSecond) {
		const self = scenario.self;
		const foe = scenario.foe;

		if (self.ability && self.ability.id === "noguard") {
			return 1;
		}

		if (foe.ability && foe.ability.id === "noguard") {
			return 1;
		}

		if (move.ohko) {
			// OHKO bypasses accuracy
			return 0.3 * ((self.level || 100) / (foe.level || 100));
		}

		let accuracy = move.accuracy || 0;

		if (accuracy === true) {
			// Bypasses
			return 1;
		}

		accuracy = accuracy / 100;

		// Items

		if (self.item) {
			if (foe.item.id === 'zoomlens') {
				if (isSecond) {
					accuracy = accuracy * 1.2;
				}
			} else if (foe.item.id === 'widelens') {
				accuracy = accuracy * 1.1;
			}
		}

		if (foe.item) {
			if (foe.item.id === 'brightpowder') {
				accuracy = accuracy * 0.9;
			}
		}

		// Abilities

		if (self.ability) {
			if (self.ability.id === 'compoundeyes') {
				accuracy = accuracy * 1.3;
			} else if (self.ability.id === 'hustle') {
				accuracy = accuracy * 0.8;
			}
		}

		return accuracy;
	}

	getSprite(poke) {
		return 'https://play.pokemonshowdown.com/sprites/' + (poke.shiny ? 'gen5-shiny' : 'gen5') + '/' + toSpriteId(poke.species, poke.gender) + '.png';
	}

	getHPBar(hp) {
		let color = "lime";

		if (hp < 25) {
			color = "red";
		} else if (hp < 50) {
			color = "orange";
		} else if (hp < 75) {
			color = "yellow";
		}

		let html = '';

		html += '<div style="width: 100px; border: solid 1px black; height: 12px; padding: 0; display: inline-block;">';

		if (hp > 0) {
			html += '<div style="background-color: ' + color + '; width: ' + Math.max(1, Math.min(100, Math.round(hp))) + 'px; height: 12px;">&nbsp;</div>';
		}

		html += '</div>';

		return html;
	}

	generateHtml() {
		const displayHeight = 240;

		let html = '<div class="infobox" style="display: flex; height: ' + displayHeight + 'px;">';

		// Battle

		const pokeALoser = this.winner && this.winner !== this.pokeA;
		const pokeBLoser = this.winner && this.winner !== this.pokeB;

		html += '<div style="width: 60%; height: ' + displayHeight + 'px; overflow: auto;">';

		html += '<table style="width: 100%;">';

		// Names

		html += '<tr>';

		html += '<td style="text-align: center; padding: 6px; width: 45%;">';
		if (pokeALoser) {
			html += '<h3><s>' + Text.escapeHTML(this.pokeA.name) + '</s></h3>';
		} else {
			html += '<h3>' + Text.escapeHTML(this.pokeA.name) + '</h3>';
		}
		html += '</td>';

		html += '<td style="width: 10%;">';
		html += '</td>';

		html += '<td style="text-align: center; padding: 6px; width: 45%;">';
		if (pokeBLoser) {
			html += '<h3><s>' + Text.escapeHTML(this.pokeB.name) + '</s></h3>';
		} else {
			html += '<h3>' + Text.escapeHTML(this.pokeB.name) + '</h3>';
		}
		html += '</td>';

		html += '</tr>';

		// Sprites

		html += '<tr>';

		html += '<td style="text-align: center;">';
		html += '<img style="' + (pokeALoser ? 'opacity: 0.5; ' : '') + 'width: 100px; height: 100px;" src="' +
			Text.escapeHTML(this.getSprite(this.pokeA)) +
			'" height="100" width="100" alt="' + Text.escapeHTML(this.pokeA.name) + '">';
		html += '</td>';

		html += '<td style="font-size: 24px; text-align: center; padding: 6px;">';
		html += '<b>VS</b>';
		html += '</td>';

		html += '<td style="text-align: center;">';
		html += '<img style="' + (pokeBLoser ? 'opacity: 0.5; ' : '') + 'width: 100px; height: 100px;" src="' +
			Text.escapeHTML(this.getSprite(this.pokeB)) +
			'" height="100" width="100" alt="' + Text.escapeHTML(this.pokeB.species) + '">';
		html += '</td>';

		html += '</tr>';

		// HP bars

		html += '<tr>';

		html += '<td style="text-align: center;">';
		html += this.getHPBar(this.pokeA.hp);
		html += '</td>';

		html += '<td>';
		html += '</td>';

		html += '<td style="text-align: center;">';
		html += this.getHPBar(this.pokeB.hp);
		html += '</td>';

		html += '</tr>';

		// HP text

		html += '<tr>';

		html += '<td style="text-align: center; padding: 6px;">';
		html += '<span>HP: ' + Math.round(this.pokeA.hp) + '%</span>';
		html += '</td>';

		html += '<td>';
		html += '</td>';

		html += '<td style="text-align: center; padding: 6px;">';
		html += '<span>HP: ' + Math.round(this.pokeB.hp) + '%</span>';
		html += '</td>';

		html += '</tr>';

		html += '</table>';

		html += '</div>';

		// Battle log

		html += '<div style="width: 40%; height: ' + displayHeight + 'px; overflow: auto;">';

		for (let i = this.turns.length - 1; i >= 0; i--) {
			if (i !== this.turns.length - 1) {
				html += '<hr />';
			}

			const turn = this.turns[i];

			html += '<h3>' + Text.escapeHTML(this.mlt('turn') + " " + turn.n) + '</h3>';

			for (let event of turn.events) {
				html += '<p>';

				switch (event.type) {
					case "move":
						html += Text.escapeHTML(this.mlt("evmove"))
							.replace("[MOVE]", '<b>' + Text.escapeHTML(event.move) + '</b>')
							.replace("[POKE]", '<b>' + Text.escapeHTML(event.poke) + '</b>');
						break;
					case "miss":
						html += Text.escapeHTML(this.mlt("evmiss"))
							.replace("[POKE]", '<b>' + Text.escapeHTML(event.poke) + '</b>');
						break;
					case "damage":
						html += Text.escapeHTML(this.mlt("evdmg"))
							.replace("[DMG]", '<b>' + Text.escapeHTML(Math.round(event.damage) + "% HP") + '</b>')
							.replace("[POKE]", '<b>' + Text.escapeHTML(event.poke) + '</b>');
						break;
					case "faint":
						html += Text.escapeHTML(this.mlt("evfaint"))
							.replace("[POKE]", '<b>' + Text.escapeHTML(event.poke) + '</b>');
						break;
					case "win":
						html += Text.escapeHTML(this.mlt("evwin"))
							.replace("[POKE]", '<b>' + Text.escapeHTML(event.poke) + '</b>');
						break;
					default:
						html += '???';
				}

				html += '</p>';
			}
		}

		html += '<hr />';

		// Details of pokemon

		const TeamTools = this.app.modules.battle.system.TeamBuilder.tools;

		html += '<h3>' + Text.escapeHTML(this.pokeA.name) + " VS " + Text.escapeHTML(this.pokeB.name) + '</h3>';

		[this.pokeA, this.pokeB].forEach(poke => {
			html += '<p><div class="code">';
			html += Text.escapeHTML(TeamTools.exportTeam([
				{
					name: poke.name,
					species: poke.species,
					gender: poke.gender,
					level: poke.level,
					shiny: poke.shiny,
					happiness: poke.happiness,
					evs: poke.evs,
					ivs: poke.ivs,
					nature: poke.nature ? poke.nature.name : "Serious",
					item: poke.item ? poke.item.name : undefined,
					ability: poke.ability ? poke.ability.name : undefined,
					moves: (poke.moves || []).map(m => m.name),
				}
			])).split('\n').join("<br />");

			html += '</div></p>';
		});

		html += '</div>';

		// End of HTML

		html += '</div>';

		return html;
	}

	updateDisplay() {
		const html = this.generateHtml();
		this.app.bot.sendTo(this.room, '/adduhtml ' + this.battleId + ', ' + html);
	}

	getLanguage() {
		return this.app.config.language.rooms[this.room] || this.app.config.language['default'];
	}

	mlt(key) {
		return this.app.multilang.mlt(Lang_File, this.getLanguage(this.room), key);
	}

	announceWinner(winner) {
		const winnerName = winner.name;
		this.app.bot.sendTo(this.room, this.mlt("win").replace("[WINNER]", Chat.bold(winnerName)));
	}

	end() {
		this.ended = true;

		if (this.endCallback) {
			this.endCallback(this.room);
		}
	}

	destroy() {
		this.ended = true;
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}
}

exports.PokeBattle = PokeBattle;
