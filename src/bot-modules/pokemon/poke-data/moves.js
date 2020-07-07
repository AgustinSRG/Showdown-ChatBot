/**
 * Pokemon Moves Manager
 */

'use strict';

function getPokeName(poke, App) {
	let pokedex = App.data.getPokedex();
	if (pokedex[poke]) {
		return pokedex[poke].name;
	} else {
		return poke;
	}
}

exports.getPokeName = getPokeName;

function getRandomBattleMoves(pokemon, whichRandom, App) {
	let pokedex = App.data.getPokedex();
	let formats = App.data.getFormatsData();
	let movedex = App.data.getMoves();
	if (!pokedex[pokemon]) return null;
	if (!formats[pokemon] || !formats[pokemon][whichRandom]) return [];
	let moves = formats[pokemon][whichRandom];
	let ret = [];
	for (let i = 0; i < moves.length; i++) {
		if (!movedex[moves[i]]) continue;
		ret.push(movedex[moves[i]].name);
	}
	return ret;
}

exports.getRandomBattleMoves = getRandomBattleMoves;

function filterMoves(pokemon, func, App) {
	let pokedex = App.data.getPokedex();
	let learnsets = App.data.getLearnsets();
	let movedex = App.data.getMoves();
	if (pokedex[pokemon]) {
		let ret = [];
		let pokemonToCheck = [pokemon];
		let i = true;
		while (i) {
			let poke = pokedex[pokemonToCheck[pokemonToCheck.length - 1]];
			if (poke.baseSpecies) {
				pokemonToCheck.push(poke.baseSpecies.toLowerCase());
			}
			if (poke.prevo) {
				pokemonToCheck.push(poke.prevo.toLowerCase());
			} else {
				i = false;
			}
		}
		for (let j in pokemonToCheck) {
			if (learnsets[pokemonToCheck[j]]) {
				for (let k in learnsets[pokemonToCheck[j]].learnset) {
					if (movedex[k]) {
						if (ret.indexOf(movedex[k].name) >= 0) continue;
						if (func(movedex[k])) {
							ret.push(movedex[k].name);
						}
					}
				}
			}
		}
		return ret.sort();
	} else {
		return null;
	}
}

function getPriorityMoves(pokemon, App) {
	return filterMoves(pokemon, move => {
		return (move.priority > 0 && move.basePower > 0);
	}, App);
}

exports.getPriorityMoves = getPriorityMoves;

function getBoostingMoves(pokemon, App) {
	return filterMoves(pokemon, move => {
		return (move.boosts && move.target === 'self' && move.id !== 'doubleteam' && move.id !== 'minimize') || move.id === 'bellydrum' || (move.secondary && move.secondary.chance === 100 && move.secondary.self && move.secondary.self.boosts);
	}, App);
}

exports.getBoostingMoves = getBoostingMoves;

function getRecoveryMoves(pokemon, App) {
	return filterMoves(pokemon, move => {
		if (move.heal || move.drain) return true;
		if (move.id in {'synthesis': 1, 'moonlight': 1, 'morningsun': 1, 'wish': 1, 'swallow': 1, 'rest': 1, 'painsplit': 1}) return true;
		return false;
	}, App);
}

exports.getRecoveryMoves = getRecoveryMoves;

function getHazardsMoves(pokemon, App) {
	return filterMoves(pokemon, move => {
		return (move.id in {'stealthrock': 1, 'spikes': 1, 'toxicspikes': 1, 'stickyweb': 1});
	}, App);
}

exports.getHazardsMoves = getHazardsMoves;
