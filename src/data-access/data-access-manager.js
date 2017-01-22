/**
 * Data Access Manager for Showdown ChatBot
 * Showdown ChatBot is distributed under the terms of the MIT License
 * (https://github.com/asanrom/Showdown-ChatBot/blob/master/LICENSE)
 *
 * This file handles with permanent data access
 * regardless of the low level data access system
 */

'use strict';

const Path = require('path');

exports.getDataAccessManager = function (access_type, options) {
	let ObjectConstructor = null;
	switch (access_type) {
	case "RAW":
		ObjectConstructor = require(Path.resolve(__dirname, "raw-data.js"));
		break;
	case "MYSQL":
		ObjectConstructor = require(Path.resolve(__dirname, "mysql.js"));
		break;
	default:
		throw new Error("Invalid access type: " + access_type);
	}
	return new ObjectConstructor(options || {});
};
