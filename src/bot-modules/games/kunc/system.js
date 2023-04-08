/**
 * Game System File
 */

'use strict';

const Path = require('path');

const KuncSets = require(Path.resolve(__dirname, 'kunc-sets.js')).sets;

exports.setup = function (App) {
	const KuncGameSystem = Object.create(null);

	const db = KuncGameSystem.db = App.dam.getDataBase('kunc-sets.json');
	const data = KuncGameSystem.data = db.data;

	if (!data.sets) {
		data.sets = KuncSets;
	}

	KuncGameSystem.kunc = require(Path.resolve(__dirname, 'kunc.js')).setup(App);

	return KuncGameSystem;
};
