/*
 * Summon - Pokemon Guessing Game
 *
 * Players try to guess a hidden Pokemon and earn points
 * based on how closely their guess matches.
 *
 * Scoring Rules:
 * - Exact Match: 4 points (no other scoring applies)
 * - Type Match: 2 points (both types) or 1 point (one type)
 * - Base Stat Total (BST) Match: 2 points (exact BST)
 * - Evolution Line Match: 3 points (same evolution family)
 */

'use strict';

const Wait_Time = 2000;
const Default_Round_Time = 60 * 1000;
const Max_Guesses_Default = 10;

const Path = require('path');

const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'summon.translations');

function calculateBST(pokemon) {
	if (!pokemon || !pokemon.baseStats) return 0;
	const stats = pokemon.baseStats;
	return (stats.hp || 0) + (stats.atk || 0) + (stats.def || 0) +
		(stats.spa || 0) + (stats.spd || 0) + (stats.spe || 0);
}

function getEvolutionLine(pokeId, Pokedex) {
	const evolutionLine = new Set();
	const pokemon = Pokedex[pokeId];
	if (!pokemon) return evolutionLine;

	let baseId = pokeId;
	let current = pokemon;
	while (current && current.prevo) {
		const prevoId = Text.toId(current.prevo);
		if (Pokedex[prevoId]) {
			baseId = prevoId;
			current = Pokedex[prevoId];
		} else {
			break;
		}
	}

	const queue = [baseId];
	while (queue.length > 0) {
		const currentId = queue.shift();
		if (evolutionLine.has(currentId)) continue;
		evolutionLine.add(currentId);

		const currentPoke = Pokedex[currentId];
		if (currentPoke && currentPoke.evos) {
			for (const evo of currentPoke.evos) {
				const evoId = Text.toId(evo);
				if (!evolutionLine.has(evoId)) {
					queue.push(evoId);
				}
			}
		}
	}

	return evolutionLine;
}

function countMatchingTypes(types1, types2) {
	if (!types1 || !types2) return 0;
	let matches = 0;
	for (const type of types1) {
		if (types2.includes(type)) {
			matches++;
		}
	}
	return matches;
}

exports.setup = function (App) {
	function getLanguage(room) {
		return App.config.language.rooms[room] || App.config.language['default'];
	}

	class Summon {
		constructor(room, rounds, maxGuesses, roundTime) {
			this.room = room;
			this.lang = getLanguage(this.room);
			this.rounds = rounds || 1;
			this.maxGuesses = maxGuesses || Max_Guesses_Default;
			this.roundTime = roundTime || Default_Round_Time;

			this.status = 'new';
			this.hiddenPokemon = null;
			this.hiddenPokemonId = '';
			this.hiddenBST = 0;
			this.hiddenEvolutionLine = new Set();

			this.currentRound = 0;
			this.guessCount = 0;
			this.guesses = Object.create(null);
			this.points = Object.create(null);
			this.names = Object.create(null);
			this.timer = null;
			this.Pokedex = null;
		}

		mlt(key, vars) {
			return App.multilang.mlt(Lang_File, this.lang, key, vars);
		}

		parseWinners(winners) {
			let res = {
				type: 'win',
				text: Chat.bold(winners[0]),
			};
			if (winners.length < 2) return res;
			res.type = 'tie';
			for (let i = 1; i < winners.length - 1; i++) {
				res.text += ", " + Chat.bold(winners[i]);
			}
			res.text += " " + this.mlt('and') + " " + Chat.bold(winners[winners.length - 1]);
			return res;
		}

		send(txt) {
			App.bot.sendTo(this.room, txt);
		}

		start() {
			const PokeRand = App.modules.games.system.templates['poke-games'].pokerand;
			try {
				PokeRand.getData();
				this.Pokedex = PokeRand.Pokedex;
			} catch (err) {
				App.reportCrash(err);
				this.send(this.mlt('error'));
				App.modules.games.system.terminateGame(this.room);
				return;
			}

			let txt = Chat.bold(this.mlt('start')) + " ";
			txt += this.mlt('therefor') + " " + this.rounds + " " + this.mlt('rounds') + ". ";
			txt += this.mlt('youhave') + " " + Math.floor(this.roundTime / 1000) + " " + this.mlt('seconds') + " " + this.mlt('toguess') + ". ";
			txt += this.mlt('maximum') + " " + this.maxGuesses + " " + this.mlt('guessesperround') + ". ";
			this.send(txt);

			this.status = 'start';
			this.wait();
		}

		wait() {
			this.status = 'wait';
			this.currentRound++;
			this.timer = setTimeout(this.startRound.bind(this), Wait_Time);
		}

		startRound() {
			this.timer = null;
			if (this.currentRound > this.rounds) {
				return this.end();
			}

			const pokeArr = Object.keys(this.Pokedex).filter(id => {
				const poke = this.Pokedex[id];
				return poke && poke.num > 0 && !poke.forme && !poke.baseSpecies;
			});

			if (!pokeArr.length) {
				this.send(this.mlt('error'));
				App.modules.games.system.terminateGame(this.room);
				return;
			}

			const randomIndex = Math.floor(Math.random() * pokeArr.length);
			this.hiddenPokemonId = pokeArr[randomIndex];
			this.hiddenPokemon = this.Pokedex[this.hiddenPokemonId];
			this.hiddenBST = calculateBST(this.hiddenPokemon);
			this.hiddenEvolutionLine = getEvolutionLine(this.hiddenPokemonId, this.Pokedex);

			this.guessCount = 0;
			this.guesses = Object.create(null);

			this.status = 'guessing';

			let txt = Chat.bold(this.mlt('roundword') + " " + this.currentRound + "/" + this.rounds + " " + this.mlt('begins')) + " ";
			txt += this.mlt('guessprompt') + " ";
			txt += this.mlt('useword') + " " + Chat.code((App.config.parser.tokens[0] || "") + "summon guess [pokemon]") + " " + this.mlt('tosubmit');
			this.send(txt);

			this.timer = setTimeout(this.timeout.bind(this), this.roundTime);
		}

		timeout() {
			this.timer = null;
			this.revealAndScore();
		}

		guess(user, pokemonName) {
			if (this.status !== 'guessing') return;

			const ident = Text.parseUserIdent(user);
			const guessId = Text.toId(pokemonName);

			if (!this.Pokedex[guessId]) {
				this.send(Chat.bold(ident.name) + ", \"" + pokemonName + "\" " + this.mlt('invalidpokemon'));
				return;
			}

			if (this.guesses[ident.id]) {
				this.send(Chat.bold(ident.name) + ", " + this.mlt('alreadyguessed'));
				return;
			}

			this.guesses[ident.id] = {
				name: ident.name,
				guessId: guessId,
				pokemon: this.Pokedex[guessId],
			};
			this.guessCount++;

			this.send(Chat.bold(ident.name) + " " + this.mlt('guessed') + " " + Chat.italics(this.Pokedex[guessId].name) + "!");

			if (this.guessCount >= this.maxGuesses) {
				clearTimeout(this.timer);
				this.timer = null;
				this.revealAndScore();
			}
		}

		calculateScore(guessId, guessPokemon) {
			if (guessId === this.hiddenPokemonId) {
				return { total: 4, exact: true, type: 0, bst: 0, evo: 0 };
			}

			let score = 0;
			let typePoints = 0;
			let bstPoints = 0;
			let evoPoints = 0;

			const matchingTypes = countMatchingTypes(
				guessPokemon.types || [],
				this.hiddenPokemon.types || []
			);
			if (matchingTypes === 2) {
				typePoints = 2;
			} else if (matchingTypes === 1) {
				typePoints = 1;
			}
			score += typePoints;

			const guessBST = calculateBST(guessPokemon);
			if (guessBST === this.hiddenBST) {
				bstPoints = 2;
				score += bstPoints;
			}

			if (this.hiddenEvolutionLine.has(guessId)) {
				evoPoints = 3;
				score += evoPoints;
			}

			return { total: score, exact: false, type: typePoints, bst: bstPoints, evo: evoPoints };
		}

		revealAndScore() {
			this.status = 'reveal';

			let txt = Chat.bold(this.mlt('reveal')) + " ";
			txt += Chat.italics(this.hiddenPokemon.name) + " ";
			txt += "(" + this.mlt('types') + ": " + (this.hiddenPokemon.types || []).join('/') + ", ";
			txt += "BST: " + this.hiddenBST + ")";
			this.send(txt);

			this.send("!dt " + this.hiddenPokemon.name);

			let roundResults = [];
			for (const playerId in this.guesses) {
				const guess = this.guesses[playerId];
				const scoreInfo = this.calculateScore(guess.guessId, guess.pokemon);

				if (!this.points[playerId]) this.points[playerId] = 0;
				this.points[playerId] += scoreInfo.total;
				this.names[playerId] = guess.name;

				if (scoreInfo.total > 0) {
					let breakdown = [];
					if (scoreInfo.exact) {
						breakdown.push(this.mlt('exact'));
					} else {
						if (scoreInfo.type > 0) breakdown.push(this.mlt('typematch', { pts: scoreInfo.type }));
						if (scoreInfo.bst > 0) breakdown.push(this.mlt('bstmatch'));
						if (scoreInfo.evo > 0) breakdown.push(this.mlt('evomatch'));
					}
					roundResults.push({
						name: guess.name,
						points: scoreInfo.total,
						breakdown: breakdown.join(', '),
					});
				}
			}

			if (roundResults.length > 0) {
				roundResults.sort((a, b) => b.points - a.points);
				let resultTxt = this.mlt('roundresults') + " ";
				resultTxt += roundResults.map(r =>
					Chat.bold(r.name) + ": +" + r.points + " (" + r.breakdown + ")"
				).join(", ");
				this.send(resultTxt);
			} else {
				this.send(this.mlt('nopoints'));
			}

			if (this.currentRound < this.rounds) {
				this.wait();
			} else {
				this.timer = setTimeout(this.end.bind(this), Wait_Time);
			}
		}

		end() {
			this.status = 'end';
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}

			let winners = [], points = 0;
			for (let i in this.points) {
				if (this.points[i] === points) {
					winners.push(this.names[i]);
				} else if (this.points[i] > points) {
					points = this.points[i];
					winners = [];
					winners.push(this.names[i]);
				}
			}

			if (!points) {
				this.send(Chat.bold(this.mlt('gameend')) + " " + this.mlt('nowinners'));
				App.modules.games.system.terminateGame(this.room);
				return;
			}

			let t = this.parseWinners(winners);
			let txt = Chat.bold(this.mlt('gameend')) + " ";
			switch (t.type) {
				case 'win':
					txt += this.mlt('winner', { name: t.text, points: points });
					break;
				case 'tie':
					txt += this.mlt('tie', { names: t.text, points: points });
					break;
			}

			this.send(txt);
			App.modules.games.system.terminateGame(this.room);
		}

		destroy() {
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
		}
	}

	return Summon;
};
