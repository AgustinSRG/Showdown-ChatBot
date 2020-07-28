/**
 * Showdown ChatBot Application
 * Showdown ChatBot is distributed under the terms of the MIT License
 * (https://github.com/asanrom/Showdown-ChatBot/blob/master/LICENSE)
 *
 * This file loads the server, bot, modules, commands, etc
 * to generate the Showdown-ChatBot application
 */

'use strict';

const Default_Login_Server = "play.pokemonshowdown.com";
const Default_Server_Port = 8080;

const Path = require('path');
const FileSystem = require('fs');

const Logger = Tools('logs');
const BotMod = Tools('bot-mod');
const Text = Tools('text');
const RequireEval = Tools('require-eval');

const Server = require(Path.resolve(__dirname, 'server/server.js')).Server;
const DataManager = require(Path.resolve(__dirname, 'data.js'));
const CommandParser = require(Path.resolve(__dirname, 'command-parser.js')).CommandParser;
const ConnectionMonitor = require(Path.resolve(__dirname, 'connection-monitor.js'));
const LanguageManager = require(Path.resolve(__dirname, 'multi-lang.js'));
const UserDataManager = require(Path.resolve(__dirname, 'user-data.js'));

const uncacheTree = Tools('uncachetree');
const checkDir = Tools('checkdir');

class ChatBotApp {
	/**
	 * @param {DataAccessManager} dam - The data access system
	 * @param {Path} confDir - A path to store the bot configuration
	 * @param {Path} dataDir - A path to store the bot data (dowloaded or temporal data)
	 * @param {Object} env
	 */
	constructor(dam, confDir, dataDir, env) {
		/* Initial Status */
		this.status = 'stopped';
		this.env = env;
		this.dam = dam;

		/* Check paths */
		this.appDir = Path.resolve(__dirname, "..");
		this.confDir = confDir;
		checkDir(confDir);
		this.dataDir = dataDir;
		checkDir(dataDir);

		/* Data */
		this.data = new DataManager(dataDir, this);
		this.data.events.on('msg', function (str) {
			this.log(str);
		}.bind(this));

		this.jsInjectFile = Path.resolve(confDir, "js-inject.json");
		this.jsInject = true;

		if (!FileSystem.existsSync(this.jsInjectFile)) {
			try {
				FileSystem.writeFileSync(this.jsInjectFile, JSON.stringify({ inject: true }));
			} catch (ex) {
				console.log("Error creating injection script: " + ex.message);
			}
		}

		try {
			this.jsInject = !!JSON.parse(FileSystem.readFileSync(this.jsInjectFile).toString()).inject;
		} catch (ex) {
			console.log("Error reading injection script: " + ex.message);
		}

		FileSystem.watchFile(this.jsInjectFile, function (curr, prev) {
			try {
				this.jsInject = !!JSON.parse(FileSystem.readFileSync(this.jsInjectFile).toString()).inject;
				this.log("[SECURITY MONITOR] Javascript injection setting is now set to " + this.jsInject);
			} catch (ex) {
				console.log("Error reading injection script: " + ex.message);
			}
		}.bind(this));

		/* Configuration DataBase */
		try {
			this.privatekey = this.dam.getFileContent('config.key');
		} catch (err) {
			this.privatekey = Text.randomToken(20);
			this.dam.setFileContent('config.key', this.privatekey);
		}
		this.db = this.dam.getDataBase('config.crypto', { crypto: true, key: this.privatekey });

		if (Object.keys(this.db.data).length === 0 && FileSystem.existsSync(Path.resolve(confDir, 'config.json'))) {
			try {
				let oldConfig = JSON.parse(FileSystem.readFileSync(Path.resolve(confDir, 'config.json')).toString());
				this.db.set(oldConfig);
				this.db.write();
				console.log("Configuration was encrypted");
			} catch (err) {
				this.reportCrash(err);
			}
		}

		this.config = this.db.data;
		if (!this.config.modules) {
			this.config.modules = {};
		}

		/* Bot default config */
		if (!this.config.bot) {
			this.config.bot = {
				server: "",
				port: Default_Server_Port,
				loginserv: Default_Login_Server,
				serverid: "showdown",
				retrydelay: (10 * 1000),
				maxlines: 3,
			};
		}

		/* Server default config */
		if (!this.config.server) {
			this.config.server = {
				bindaddress: "",
				port: Default_Server_Port,
				https: false,
				httpsPort: 5000,
				sslcert: "",
				sslkey: "",
			};
		}

		/* Module load configuration */
		if (!this.config.loadmodules) {
			this.config.loadmodules = {};
		}

		/* Menu configuration */
		if (!this.config.menuOrder) {
			this.config.menuOrder = {};
		}

		if (env.port !== undefined) {
			this.config.server.port = env.port;
		} else if (process.env['PORT']) {
			this.config.server.port = process.env['PORT'];
		} else if (process.env['OPENSHIFT_NODEJS_PORT']) {
			this.config.server.port = process.env['OPENSHIFT_NODEJS_PORT'];
		}

		if (env.bindaddress !== undefined) {
			this.config.server.bindaddress = env.bindaddress;
		} else if (process.env['BIND_IP']) {
			this.config.server.bindaddress = process.env['BIND_IP'];
		} else if (process.env['OPENSHIFT_NODEJS_IP']) {
			this.config.server.bindaddress = process.env['OPENSHIFT_NODEJS_IP'];
		}

		if (env.sslport !== undefined) {
			this.config.server.httpsPort = env.sslport;
			this.config.server.https = true;
		}

		/* Languages */
		if (!this.config.langfilter) {
			this.config.langfilter = {};
		}
		this.multilang = new LanguageManager(this.config.langfilter, this);
		this.supportedLanguages = require(Path.resolve(__dirname, 'languages.json'));
		if (!this.config.language) {
			this.config.language = {
				"default": "english",
				rooms: {},
			};
		}

		/* Logger configuration */
		if (!this.config.logMaxOld) {
			this.config.logMaxOld = 0;
		}

		/* Command Parser configuration */
		if (!this.config.parser) {
			this.config.parser = {
				tokens: ['.'],
				groups: ['+', '%', '@', '*', '#', '&'],
				admin: '&',
				owner: '#',
				bot: '*',
				mod: '@',
				driver: '%',
				voice: '+',
			};
			this.config.cmdtokens = [];
		}

		/* Create the bot */
		let ShowdownBot = null;
		if (this.config.websocketLibrary === 'websocket') {
			try {
				require('websocket');
			} catch (e) {
				console.log('Installing dependencies... (websocket)');
				require('child_process').spawnSync('sh', ['-c', 'npm install websocket'], { stdio: 'inherit' });
			}
			ShowdownBot = require(Path.resolve(__dirname, 'showdown/showdown-ws.js')).Bot;
		} else {
			try {
				require('sockjs-client');
			} catch (e) {
				console.log('Installing dependencies... (sockjs-client)');
				require('child_process').spawnSync('sh', ['-c', 'npm install sockjs-client'], { stdio: 'inherit' });
			}
			ShowdownBot = require(Path.resolve(__dirname, 'showdown/showdown-sockjs.js')).Bot;
		}

		this.bot = new ShowdownBot(this.config.bot.server, this.config.bot.port, this.config.bot.serverid,
			this.config.bot.loginserv, this.config.bot.maxlines, true, this.config.bot.retrydelay, this.config.bot.secure);

		/* Create the server */
		this.server = new Server(this.confDir, this);

		/* Create the command parser */
		this.parser = new CommandParser(this.confDir, this);

		/* Command parser bot events */
		this.bot.on('userchat', function (room, time, by, msg) {
			this.parser.parse(msg, room, by);
		}.bind(this));
		this.bot.on('pm', function (by, msg) {
			this.parser.parse(msg, null, by);
		}.bind(this));

		/* Data manager bot events */
		this.bot.on('formats', function () {
			if (this.config.blockautodownload) return;
			this.data.downloadAll();
		}.bind(this));

		/* Bot Status events */
		this.bot.on('connecting', function () {
			this.log('Connecting to server: ' + this.bot.server + ":" + this.bot.port);
			console.log('Connecting to server: ' + this.bot.server + ":" + this.bot.port);
		}.bind(this));
		this.bot.on('connect', function () {
			this.log('Bot connected to server: ' + this.bot.server + ":" + this.bot.port);
			console.log('Bot connected to server: ' + this.bot.server + ":" + this.bot.port);
		}.bind(this));
		this.bot.on('connectFailed', function (err) {
			this.log('Could not connect to the server' + (err ? (" | " + err.code + ": " + err.message) : ''));
			console.log('Could not connect to the server' + (err ? (" | " + err.code + ": " + err.message) : ''));
		}.bind(this));
		this.bot.on('disconnect', function (err) {
			this.log('Bot Disconnected' + (err ? (" | " + err.code + ": " + err.message) : ''));
			console.log('Bot Disconnected' + (err ? (" | " + err.code + ": " + err.message) : ''));
		}.bind(this));

		/* Monitor */
		this.connMonitor = new ConnectionMonitor(this);

		/* User data manager */
		this.userdata = new UserDataManager(this);

		/* Other initial values */
		this.console = null;
		this.logger = null;
		this.logsDir = null;
		this.modules = {};

		/* Add-ons */
		this.addonsDir = 'add-ons';
		this.dam.checkSubpath(this.addonsDir);
		this.addons = {};
	}

	/**
	 * Starts the application
	 * @param {function(Error)} callback
	 */
	start(callback) {
		this.server.listen(callback);
	}

	/**
	 * Asynchronous method to write the configuration
	 * to persistent storage
	 */
	saveConfig() {
		this.db.write();
	}

	/* Modules */

	/**
	 * Loads the modules
	 * @param {Path} path - Directory where the modules are located
	 */
	loadModules(path) {
		console.log('Loading bot modules...');
		if (FileSystem.existsSync(path) && FileSystem.statSync(path).isDirectory()) {
			let files = FileSystem.readdirSync(path);
			files.forEach(function (file) {
				let absFile = Path.resolve(path, file + '/botmodule.json');
				if (FileSystem.existsSync(absFile) && FileSystem.statSync(absFile).isFile()) {
					try {
						let conf = require(absFile);
						if (conf.id && this.config.loadmodules[conf.id] !== false) {
							let mod = new BotMod(Path.resolve(path, file), conf, this);
							this.modules[mod.id] = mod;
							this.parser.addCommands(mod.commands);
							this.multilang.addLangFiles(mod.langfiles, Path.resolve(path, file));
							console.log('NEW MODULE: ' + mod.name);
						} else if (!this.modules[conf.id]) {
							this.modules[conf.id] = {
								id: conf.id,
								name: conf.name,
								description: conf.description,
								commands: {},
								system: null,
								enabled: false,
							};
						}
					} catch (err) {
						console.log('Error: Cannot load module "' + file + '" - ' + err.message + '\n' + err.stack);
					}
				}
			}.bind(this));
		} else {
			console.log('Error: No modules found (wrong path)');
		}
	}

	/**
	 * Reloads the commands from all modules
	 * @param {Path} path - Directory where the modules are located
	 */
	hotpatchCommands(path) {
		if (FileSystem.existsSync(path) && FileSystem.statSync(path).isDirectory()) {
			let files = FileSystem.readdirSync(path);
			files.forEach(function (file) {
				let absFile = Path.resolve(path, file + '/botmodule.json');
				if (FileSystem.existsSync(absFile) && FileSystem.statSync(absFile).isFile()) {
					try {
						uncacheTree(absFile);
						let conf = require(absFile);
						if (conf.commands) {
							for (let i = 0; i < conf.commands.length; i++) {
								let cmdFile = Path.resolve(path, file, conf.commands[i]);
								try {
									uncacheTree(cmdFile);
								} catch (e) { }
								let commands = require(cmdFile);
								this.parser.addCommands(commands);
							}
						}
					} catch (err) {
						console.log('Error: Cannot load module "' + file + '" - ' + err.message);
					}
				}
			}.bind(this));
		}
	}

	/* Add-ons */

	/**
	 * Reads the add-ons path and installs the add-ons
	 */
	loadAddons() {
		let files = this.dam.getFiles(this.addonsDir);
		files.forEach(function (file) {
			this.installAddon(file);
		}.bind(this));
	}

	/**
	 * Installs an add-on
	 * @param {String} file - Add-on filename
	 */
	installAddon(file) {
		try {
			this.addons[file] = RequireEval.run(this, this.dam.getFileContent(file));
			if (typeof this.addons[file].setup === "function") {
				let addon = this.addons[file].setup(this);
				if (addon) {
					this.addons[file] = addon;
				}
			}
			return true;
		} catch (err) {
			console.log("Add-on Crashed: " + file);
			this.log("Add-on Crashed: " + file);
			this.reportCrash(err);
			return false;
		}
	}

	/**
	 * Uninstalls an add-on
	 * @param {String} file - Add-on filename
	 */
	removeAddon(file) {
		if (typeof this.addons[file] === 'object' && typeof this.addons[file].destroy === 'function') {
			try {
				this.addons[file].destroy(this);
			} catch (err) {
				this.reportCrash(err);
			}
		}
		delete this.addons[file];
	}

	/* Logger Methods */

	/**
	 * Creates the application logger
	 * @param {Path} path - Directory where logs are stored
	 */
	createLogger(path) {
		this.logsDir = path;
		checkDir(path);
		checkDir(Path.resolve(path, 'global/'));
		checkDir(Path.resolve(path, 'rooms/'));
		checkDir(Path.resolve(path, 'pm/'));
		checkDir(Path.resolve(path, 'battle/'));
		this.logger = new Logger(Path.resolve(path, 'global/'), 'global', this.config.logMaxOld);
	}

	/**
	 * Writes a message to the logger
	 * @param {String} text - The message to be written
	 */
	log(text) {
		if (this.logger) {
			this.logger.log(text);
		} else {
			this.logToConsole(text);
		}
	}

	/**
	 * Sets the application console
	 * @param {Object} con - The new console
	 */
	setConsole(con) {
		if (typeof con !== "object" || typeof con.log !== "function") {
			throw new Error("Invalid Console.");
		}
		this.console = con;
	}

	/**
	 * Writes a message to the console
	 * @param {String} text - The message to be written
	 */
	logToConsole(text) {
		if (this.console) {
			this.console.log(text);
		} else {
			console.log(text);
		}
	}

	/**
	 * @param {String} text
	 */
	debug(text) {
		if (this.config.debug) {
			this.log("DEBUG: " + text);
		}
	}

	/**
	 * Reports a crash to the logger
	 * @param {Error} err - Error that causes the crash
	 */
	reportCrash(err) {
		let text = "";
		text += "CRASH - ";
		text += err.message + "\n";
		text += err.stack;
		console.log(text);
		this.log(text);
	}

	/**
	 * Logs a server action
	 * @param {String} by - User ID
	 * @param {String} msg -  Description
	 */
	logServerAction(by, msg) {
		this.log('[SERVER] [By: ' + by + '] ' + msg);
	}

	/**
	 * Logs a command action
	 * @param {CommandContext} context
	 */
	logCommandAction(context) {
		this.log('[COMMAND] [By: ' + context.by + '] [Room: ' + context.room + '] ' +
			'[Handler: ' + context.handler + '] ' + context.token + context.cmd + ' ' + context.arg);
	}

	/* Bot Methods */

	/**
	 * Runs the bot if it can
	 */
	tryRunBot() {
		if (!this.bot.server) return;
		if (this.status === 'stopped') {
			this.status = 'running';
			this.bot.connect();
		}
	}

	/**
	 * Restarts the bot
	 */
	restartBot() {
		if (!this.bot.server) return false;
		if (!this.bot.connecting) {
			this.status = 'running';
			this.bot.reconnect();
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Stop the bot to avoid automated connection retry
	 */
	stopBot() {
		if (this.status === 'stopped') return false;
		this.status = 'stopped';
		this.bot.disconnect();
		return true;
	}
}

module.exports = ChatBotApp;
