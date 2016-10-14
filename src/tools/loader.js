/**
 * Loads source files from a path
 * and runs the setup() method
 * Useful for loading server handlers
 */

'use strict';

const FileSystem = require('fs');
const Path = require('path');

class SourceLoader {
	constructor(path, app) {
		this.path = path;
		this.app = app;
	}

	load(file) {
		let mod = require(Path.resolve(this.path, file));
		if (typeof mod.setup === "function") {
			mod.setup(this.app);
		}
	}

	loadAll(regex) {
		FileSystem.readdirSync(this.path).forEach(function (file) {
			if (!regex || regex.test(file)) {
				this.load(file);
			}
		}.bind(this));
	}
}

module.exports = SourceLoader;
