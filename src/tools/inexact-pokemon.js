/**
 * Approximating Pokemon words system
 */

'use strict';

const Text = Tools('text');

const Natures = exports.Natures = {
	"adamant": "Adamant",
	"bashful": "Bashful",
	"bold": "Bold",
	"brave": "Brave",
	"calm": "Calm",
	"careful": "Careful",
	"docile": "Docile",
	"gentle": "Gentle",
	"hardy": "Hardy",
	"hasty": "Hasty",
	"impish": "Impish",
	"jolly": "Jolly",
	"lax": "Lax",
	"lonely": "Lonely",
	"mild": "Mild",
	"modest": "Modest",
	"naive": "Naive",
	"naughty": "Naughty",
	"quiet": "Quiet",
	"quirky": "Quirky",
	"rash": "Rash",
	"relaxed": "Relaxed",
	"sassy": "Sassy",
	"serious": "Serious",
	"timid": "Timid",
};

exports.resolve = function (App, word, flags) {
	let searchList = {
		pokemon: 1,
		moves: 1,
		items: 1,
		abilities: 1,
		natures: 1,
		formats: 1,
	};
	if (typeof flags === "object") {
		for (let flag in flags) {
			if (flag === "others") {
				for (let key in searchList) {
					if (flags[key] === undefined) {
						searchList[key] = flags[flag];
					}
				}
				continue;
			}
			searchList[flag] = flags[flag];
		}
	}

	/* Search Process */

	let maxLd = 3;
	let ld;
	let currWord = "";
	let cld = maxLd + 1;

	if (word.length <= 1) {
		return null;
	} else if (word.length <= 4) {
		maxLd = 1;
	} else if (word.length <= 6) {
		maxLd = 2;
	}

	if (searchList.pokemon) {
		let pokedex = App.data.getPokedex();
		for (let poke in pokedex) {
			ld = Text.levenshtein(word, poke, maxLd);
			if (ld < cld) {
				cld = ld;
				currWord = pokedex[poke].name;
			}
		}
	}

	if (searchList.moves) {
		let movedex = App.data.getMoves();
		for (let key in movedex) {
			ld = Text.levenshtein(word, key, maxLd);
			if (ld < cld) {
				cld = ld;
				currWord = movedex[key].name;
			}
		}
	}

	if (searchList.items) {
		let items = App.data.getItems();
		for (let key in items) {
			ld = Text.levenshtein(word, key, maxLd);
			if (ld < cld) {
				cld = ld;
				currWord = items[key].name;
			}
		}
	}

	if (searchList.abilities) {
		let abilities = App.data.getAbilities();
		for (let key in abilities) {
			ld = Text.levenshtein(word, key, maxLd);
			if (ld < cld) {
				cld = ld;
				currWord = abilities[key].name;
			}
		}
	}

	if (searchList.natures) {
		for (let key in Natures) {
			ld = Text.levenshtein(word, key, maxLd);
			if (ld < cld) {
				cld = ld;
				currWord = Natures[key];
			}
		}
	}

	if (searchList.formats) {
		for (let key in App.bot.formats) {
			ld = Text.levenshtein(word, key, maxLd);
			if (ld < cld) {
				cld = ld;
				currWord = App.bot.formats[key].name;
			}
		}
	}

	if (cld <= maxLd) {
		return currWord;
	} else {
		return null;
	}
};

exports.safeResolve = function (App, word, flags) {
	try {
		return exports.resolve(App, word, flags);
	} catch (err) {
		App.reportCrash(err);
		return null;
	}
};
