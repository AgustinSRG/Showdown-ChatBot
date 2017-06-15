/**
 * Bot Module Class
 */

'use strict';

const Path = require('path');

/**
 * Represents a Bot Module
 */
class BotMod {
	/**
	 * @param {Path} path - Location of the module in the file system
	 * @param {Object} config - Module Configuration
	 * @param {ChatBotApp} app - Showdown ChatBot App
	 */
	constructor(path, config, app) {
		this.enabled = true;
		this.id = config.id;
		this.name = config.name;
		this.description = config.description || "";
		this.version = config.version;
		this.langfiles = config.langfiles || [];
		if (config.main) {
			this.system = require(Path.resolve(path, config.main));
			if (typeof this.system.setup === "function") {
				this.system = this.system.setup(app);
			}
		} else {
			this.system = null;
		}
		if (config.handlers && config.handlers.length) {
			for (let i = 0; i < config.handlers.length; i++) {
				let handler = require(Path.resolve(path, config.handlers[i]));
				if (typeof handler.setup === "function") {
					handler.setup(app);
				}
			}
		}
		this.commands = {};
		if (config.commands && config.commands.length) {
			for (let i = 0; i < config.commands.length; i++) {
				let mc = require(Path.resolve(path, config.commands[i]));
				Object.merge(this.commands, mc);
			}
		}
		if (typeof config.permissions === "object") {
			for (let perm in config.permissions) {
				app.parser.addPermission(perm, config.permissions[perm]);
			}
		}
	}

	disable() {
		this.enabled = false;
		if (this.system && typeof this.system.disableModule === 'function') {
			this.system.disableModule();
		}
	}

	enable() {
		this.enabled = true;
		if (this.system && typeof this.system.enableModule === 'function') {
			this.system.enableModule();
		}
	}
}

module.exports = BotMod;
