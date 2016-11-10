/**
 * Add-on helper
 */

'use strict';

class AddonManager {
	constructor(app, config) {
		this.app = app;
		this.config = config;
	}

	install() {
		if (!this.config) return;

		/* Commands */
		if (typeof this.config["commands"] === "object") {
			if (this.config["commandsOverwrite"] !== false) {
				this.app.parser.addCommands(this.config["commands"]);
			} else {
				this.app.parser.addCommands(this.config["commands"], true);
			}
		}

		/* Command permissions */
		if (typeof this.config["commandPermissions"] === "object") {
			if (this.config["commandPermissionsOverwrite"] !== false) {
				for (let perm in this.config["commandPermissions"]) {
					this.app.parser.addPermission(perm, this.config["commandPermissions"][perm]);
				}
			} else {
				for (let perm in this.config["commandPermissions"]) {
					if (!this.app.parser.modPermissions[perm]) {
						this.app.parser.addPermission(perm, this.config["commandPermissions"][perm]);
					} else {
						delete this.config["commandPermissions"][perm];
					}
				}
			}
		}

		/* Command triggers */
		if (typeof this.config["commandTriggers"] === "object") {
			if (this.config["commandTriggersOverwrite"] !== false) {
				for (let mode in this.config["commandTriggers"]) {
					for (let trig in this.config["commandTriggers"][mode]) {
						this.app.parser.addTrigger(trig, mode, this.config["commandTriggers"][mode][trig]);
					}
				}
			} else {
				for (let mode in this.config["commandTriggers"]) {
					for (let trig in this.config["commandTriggers"][mode]) {
						if (!this.app.parser.triggers[mode] || !this.app.parser.triggers[mode][trig]) {
							this.app.parser.addTrigger(trig, mode, this.config["commandTriggers"][mode][trig]);
						} else {
							delete this.config["commandTriggers"][mode][trig];
						}
					}
				}
			}
		}

		/* Events */
		if (typeof this.config["events"] === "object") {
			for (let e in this.config["events"]) {
				this.app.bot.on(e, this.config["events"][e]);
			}
		}

		/* Server Handlers */
		if (typeof this.config["serverHandlers"] === "object") {
			if (this.config["serverHandlersOverwrite"] !== false) {
				for (let handler in this.config["serverHandlers"]) {
					this.app.server.setHandler(handler, this.config["serverHandlers"][handler]);
				}
			} else {
				for (let handler in this.config["serverHandlers"]) {
					if (!this.app.server.handlers[handler]) {
						this.app.server.setHandler(handler, this.config["serverHandlers"][handler]);
					} else {
						delete this.config["serverHandlers"][handler];
					}
				}
			}
		}

		/* Server Permissions */
		if (typeof this.config["serverPermissions"] === "object") {
			if (this.config["serverPermissionsOverwrite"] !== false) {
				for (let perm in this.config["serverPermissions"]) {
					this.app.server.setPermission(perm, this.config["serverPermissions"][perm]);
				}
			} else {
				for (let perm in this.config["serverPermissions"]) {
					if (!this.app.server.permissions[perm]) {
						this.app.server.setPermission(perm, this.config["serverPermissions"][perm]);
					} else {
						delete this.config["serverPermissions"][perm];
					}
				}
			}
		}

		/* Server Menu Options */
		if (typeof this.config["serverMenuOptions"] === "object") {
			if (this.config["serverMenuOptionsOverwrite"] !== false) {
				for (let opt in this.config["serverMenuOptions"]) {
					let optData = this.config["serverMenuOptions"][opt];
					if (typeof optData === "object") {
						this.app.server.setMenuOption(opt, optData.name, optData.url, optData.permission, optData.level);
					}
				}
			} else {
				for (let opt in this.config["serverMenuOptions"]) {
					let optData = this.config["serverMenuOptions"][opt];
					if (typeof optData === "object") {
						if (!this.app.server.menu[opt]) {
							this.app.server.setMenuOption(opt, optData.name, optData.url, optData.permission, optData.level);
						} else {
							delete this.config["serverMenuOptions"][opt];
						}
					}
				}
			}
		}

		/* Custom */
		if (typeof this.config["customInstall"] === "function") {
			this.config["customInstall"](this.app);
		}
	}

	uninstall() {
		if (!this.config) return;

		/* Commands */
		if (typeof this.config["commands"] === "object") {
			this.app.parser.removeCommands(this.config["commands"]);
		}

		/* Command permissions */
		if (typeof this.config["commandPermissions"] === "object") {
			for (let perm in this.config["commandPermissions"]) {
				this.app.parser.removePermission(perm);
			}
		}

		/* Command triggers */
		if (typeof this.config["commandTriggers"] === "object") {
			for (let mode in this.config["commandTriggers"]) {
				for (let trig in this.config["commandTriggers"][mode]) {
					this.app.parser.removeTrigger(trig, mode);
				}
			}
		}

		/* Events */
		if (typeof this.config["events"] === "object") {
			for (let e in this.config["events"]) {
				this.app.bot.removeListener(e, this.config["events"][e]);
			}
		}

		/* Server Handlers */
		if (typeof this.config["serverHandlers"] === "object") {
			for (let handler in this.config["serverHandlers"]) {
				this.app.server.removeHandler(handler);
			}
		}

		/* Server Permissions */
		if (typeof this.config["serverPermissions"] === "object") {
			for (let perm in this.config["serverPermissions"]) {
				this.app.server.removePermission(perm);
			}
		}

		/* Server Menu Options */
		if (typeof this.config["serverMenuOptions"] === "object") {
			for (let opt in this.config["serverMenuOptions"]) {
				if (typeof this.config["serverMenuOptions"][opt] === "object") {
					this.app.server.removeMenuOption(opt);
				}
			}
		}

		/* Custom */
		if (typeof this.config["customUninstall"] === "function") {
			this.config["customUninstall"](this.app);
		}
	}

	destroy() {
		this.uninstall();
	}
}

exports.AddonManager = AddonManager;

exports.forApp = function (App) {
	return {
		install: function (config) {
			let manager = new AddonManager(App, config);
			manager.install();
			return manager;
		},
	};
};
