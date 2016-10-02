/*
 * Random Pokemon Words
 */

'use strict';

exports.setup = function (App) {
	const PokeRandomManager = {};

	let Pokedex, Movedex, Itemdex, Abilitydex, Natures;
	let FormatData = {};

	Pokedex = Movedex = Itemdex = Abilitydex = {};

	Natures = PokeRandomManager.Natures = ['Adamant', 'Bashful', 'Bold', 'Brave', 'Calm', 'Careful', 'Docile',
							 'Gentle', 'Hardy', 'Hasty', 'Impish', 'Jolly', 'Lax', 'Lonely', 'Mild',
							 'Modest', 'Naive', 'Naughty', 'Quiet', 'Quirky', 'Rash', 'Relaxed',
							 'Sassy', 'Serious', 'Timid'];

	function getData() {
		try {
			Pokedex = PokeRandomManager.Pokedex = App.data.getPokedex();
			Movedex = PokeRandomManager.Movedex = App.data.getMoves();
			Itemdex = PokeRandomManager.Itemdex = App.data.getItems();
			Abilitydex = PokeRandomManager.Abilitydex = App.data.getAbilities();
			FormatData = PokeRandomManager.FormatData = App.data.getFormatsData();
		} catch (e) {
			return e;
		}
	}

	PokeRandomManager.getData = getData;

	function rand(arr) {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	let randomPoke = PokeRandomManager.randomPoke = function () {
		let pokeArr = Object.keys(Pokedex);
		if (!pokeArr.length) return null;
		let pokeId = rand(pokeArr);
		let clue = '';
		let chosen = Pokedex[pokeId];
		let clueType = rand(['type', 'color', 'gen', 'tier']);
		if (clueType === 'tier' && (!FormatData[pokeId] || !FormatData[pokeId].tier)) clueType = 'type'; //Undefined tier
		switch (clueType) {
		case 'type':
			clue = rand(chosen.types) + ' type';
			break;
		case 'color':
			clue = chosen.color + ' color';
			break;
		case 'gen':
			if (chosen.formeLetter === "M") {
				clue = 'Mega-Evo';
				break;
			}
			if (chosen.baseSpecies === "Pikachu") {
				clue = 'Gen 6';
				break;
			}
			if (chosen.num < 0) {
				clue = 'CAP';
			} else if (chosen.num <= 151) {
				clue = 'Gen 1';
			} else if (chosen.num <= 251) {
				clue = 'Gen 2';
			} else if (chosen.num <= 386) {
				clue = 'Gen 3';
			} else if (chosen.num <= 493) {
				clue = 'Gen 4';
			} else if (chosen.num <= 649) {
				clue = 'Gen 5';
			} else {
				clue = 'Gen 6';
			}
			break;
		case 'tier':
			clue = 'Tier ' + FormatData[pokeId].tier;
			break;
		}
		return {
			word: chosen.species,
			clue: 'Pokemon, ' + clue,
		};
	};

	let randomMove = PokeRandomManager.randomMove = function () {
		let moveArr = Object.keys(Movedex);
		if (!moveArr.length) return null;
		let moveId = rand(moveArr);
		let chosen = Movedex[moveId];
		let clue = '';
		let clueType = rand(['type', 'category']);
		switch (clueType) {
		case 'type':
			clue = chosen.type + ' type';
			break;
		case 'category':
			clue = chosen.category + ' category';
			break;
		}
		return {
			word: chosen.name,
			clue: 'Move, ' + clue,
		};
	};

	let randomItem = PokeRandomManager.randomItem = function () {
		let itemArr = Object.keys(Itemdex);
		if (!itemArr.length) return null;
		let itemId = rand(itemArr);
		let chosen = Itemdex[itemId];
		let clue = '';
		let clueType = rand(['gen', 'type']);
		switch (clueType) {
		case 'gen':
			clue = 'Gen ' + chosen.gen;
			break;
		case 'type':
			if (chosen.isBerry) {
				clue = 'Berry';
			} else if (chosen.megaStone) {
				clue = 'Mega Stone';
			} else if (chosen.fling) {
				clue = chosen.fling.basePower + ' Fling BP';
			} else {
				clue = 'Gen ' + chosen.gen;
			}
			break;
		}
		return {
			word: chosen.name,
			clue: 'Item, ' + clue,
		};
	};

	let randomAbility = PokeRandomManager.randomAbility = function () {
		let abilityArr = Object.keys(Abilitydex);
		if (!abilityArr.length) return null;
		let abilityId = rand(abilityArr);
		let chosen = Abilitydex[abilityId];
		return {
			word: chosen.name,
			clue: 'Ability',
		};
	};

	let randomNature = PokeRandomManager.randomNature = function () {
		if (!Natures.length) return null;
		return {
			word: rand(Natures),
			clue: 'Nature',
		};
	};

	PokeRandomManager.random = function () {
		getData();
		let res = null;
		let r = Math.random() * 100;
		if (r <= 40) {
			res = randomPoke();
		} else if (r <= 60) {
			res = randomMove();
		} else if (r <= 80) {
			res = randomItem();
		} else if (r <= 90) {
			res = randomAbility();
		} else {
			res = randomNature();
		}
		return res;
	};

	PokeRandomManager.randomNoRepeat = function (arr) {
		if (!arr) return PokeRandomManager.random();
		let temp;
		do {
			temp = PokeRandomManager.random();
		} while (arr.indexOf(temp.word) >= 0);
		return temp;
	};

	return PokeRandomManager;
};
