/*
 * Trivia System
 */

'use strict';

const Path = require('path');

const DataBase = Tools.get('json-db.js');

const db = exports.db = new DataBase(Path.resolve(App.confDir, 'trivia.json'));

const data = exports.data = db.data;

exports.getQuestionId = function (text) {
	for (let i in data) {
		if (data[i].clue === text) {
			return i;
		}
	}
	return -1;
};

exports.getFreeId = function () {
	let i = -1;
	do {
		i++;
	} while (data[i]);
	return i;
};

exports.addQuestion = function (text, answers) {
	let i = exports.getFreeId();
	data[i] = {
		clue: text,
		answers: answers,
	};
};

exports.rmQuestion = function (id) {
	delete data[id];
};

exports.isDataEmpty = function () {
	return (Object.keys(data).length === 0);
};

require(Path.resolve(__dirname, 'server-handler.js'));
