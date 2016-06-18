/**
 * Tools manager
 *
 * Intended for making a global to provide
 * tools stored in a unique directory without
 * specifying the relative path
 */

'use strict';

const Path = require('path');

class ToolsManager {
	/**
	 * @param directory An existing path where all tools are located
	 */
	constructor(directory) {
		this.path = directory;
	}

	/**
	 * Requires a tool
	 *
	 * @param file Javascript file corresponding to the tool you want
	 */
	get(file) {
		return require(Path.resolve(this.path, file));
	}
}

module.exports = ToolsManager;
