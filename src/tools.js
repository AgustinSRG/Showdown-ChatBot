/**
 * Showdown ChatBot Tools manager
 * Showdown ChatBot is distributed under the terms of the MIT License
 * (https://github.com/asanrom/Showdown-ChatBot/blob/master/LICENSE)
 *
 * Intended for making a global to provide
 * tools stored in a unique directory without
 * specifying the relative path
 */

'use strict';

const Path = require('path');

/**
 * Represents a manager for Showdown ChatBot tools
 */
class ToolsManager {
	/**
	 * @param {Path} directory - An existing path where all tools are located
	 */
	constructor(directory) {
		this.path = directory;
	}

	/**
	 * Requires a tool
	 * @param {String} file - Javascript file corresponding to the tool you want
	 * @returns {Module}
	 */
	get(file) {
		return require(Path.resolve(this.path, file));
	}
}

module.exports = ToolsManager;
