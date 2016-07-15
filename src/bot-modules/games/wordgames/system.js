/*
 * Anagrams / Hangman
 */

'use strict';

const Path = require('path');

const DataBase = Tools.get('json-db.js');

const db = exports.db = new DataBase(Path.resolve(App.confDir, 'word-games.json'));

const data = exports.data = db.data;

exports.getRandomWord = function () {
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

exports.isDataEmpty = function () {
	return (Object.keys(data).length === 0);
};

require(Path.resolve(__dirname, 'server-handler.js'));
