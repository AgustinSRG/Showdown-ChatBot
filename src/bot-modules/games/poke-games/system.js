/**
 * Game System File
 */

'use strict';

const Path = require('path');

exports.setup = function (App) {
	return {
		pokerand: require(Path.resolve(__dirname, 'pokerand.js')).setup(App),
		anagrams: require(Path.resolve(__dirname, 'poke-anagrams.js')).setup(App),
		hangman: require(Path.resolve(__dirname, 'poke-hangman.js')).setup(App),
	};
};
