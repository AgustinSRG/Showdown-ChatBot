/*
 * Anagrams / Hangman
 */

'use strict';

const Path = require('path');

exports.setup = function (App) {
	const WordGamesSystem = {};

	const db = WordGamesSystem.db = App.dam.getDataBase('word-games.json');
	const data = WordGamesSystem.data = db.data;

	WordGamesSystem.getRandomWord = function () {
		let elements = 0;
		for (let i in data) {
			elements += data[i].length;
		}
		let chosen = Math.floor(Math.random() * elements);
		let last = '';
		for (let i in data) {
			if (chosen < data[i].length) {
				return {word: data[i][chosen], clue: i};
			}
			chosen -= data[i].length;
			last = i;
		}
		//should never happen
		return {word: data[last][0], clue: last};
	};

	WordGamesSystem.isDataEmpty = function () {
		return (Object.keys(data).length === 0);
	};

	WordGamesSystem.anagrams = require(Path.resolve(__dirname, 'anagrams.js')).setup(App);
	WordGamesSystem.hangman = require(Path.resolve(__dirname, 'hangman.js')).setup(App);

	return WordGamesSystem;
};
