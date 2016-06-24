/**
 * Bot Module: Misc
 */

'use strict';

const FileSystem = require('fs');
const Path = require('path');

let commands = {};

FileSystem.readdirSync(Path.resolve(__dirname, 'commands/')).forEach(file => {
	if (/.*\.js/.test(file)) {
		Object.merge(commands, require(Path.resolve(__dirname, 'commands/', file)));
	}
});

module.exports = commands;
