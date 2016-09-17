/**
 * Dependencies Checker for Showdown ChatBot
 * Showdown ChatBot is distributed under the terms of the MIT License
 * (https://github.com/asanrom/Showdown-ChatBot/blob/master/LICENSE)
 *
 * Require this file to check / install the dependencies
 */

'use strict';

try {
	require('websocket');
	require('githubhook');
} catch (e) {
	console.log('Installing dependencies...');
	require('child_process').spawnSync('sh', ['-c', 'npm install --production'], {stdio: 'inherit'});
}

/* Object extensions */

if (!Object.merge) {
	Object.merge = function (object, source) {
		if (!object) object = {};
		if (!source) return object;
		for (let key in source) object[key] = source[key];
		return object;
	};
}

if (!Object.values) {
	Object.values = function (object) {
		let values = [];
		for (let key in object) values.push(object[key]);
		return values;
	};
}

Object.createFromKeys = function (keys, value) {
	let object = {};
	for (let key of keys) object[key] = value;
	return object;
};
