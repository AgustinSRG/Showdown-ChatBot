/*
 * Trivia System
 */

'use strict';

const Path = require('path');

exports.setup = function (App) {
	const TriviaSystem = {};

	const db = TriviaSystem.db = App.dam.getDataBase('trivia.json');
	const data = TriviaSystem.data = db.data;

	TriviaSystem.getQuestionId = function (text) {
		for (let i in data) {
			if (data[i].clue === text) {
				return i;
			}
		}
		return -1;
	};

	TriviaSystem.getFreeId = function () {
		let i = -1;
		do {
			i++;
		} while (data[i]);
		return i;
	};

	TriviaSystem.addQuestion = function (text, answers) {
		let i = TriviaSystem.getFreeId();
		data[i] = {
			clue: text,
			answers: answers,
		};
	};

	TriviaSystem.rmQuestion = function (id) {
		delete data[id];
	};

	TriviaSystem.isDataEmpty = function () {
		return (Object.keys(data).length === 0);
	};

	TriviaSystem.trivia = require(Path.resolve(__dirname, 'trivia.js')).setup(App);

	return TriviaSystem;
};
