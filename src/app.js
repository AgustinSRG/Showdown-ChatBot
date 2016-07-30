/**
 * Showdown ChatBot Application
 */

'use strict';

const Default_Login_Server = "play.pokemonshowdown.com";
const Default_Server_Port = 8080;

const Path = require('path');
const FileSystem = require('fs');

const JSONDataBase = Tools.get('json-db.js');
const Logger = Tools.get('logs.js');
const BotMod = Tools.get('bot-mod.js');

const ShowdownBot = require(Path.resolve(__dirname, 'lib/showdown.js')).Bot;
const ShowdownBotAlt = require(Path.resolve(__dirname, 'lib/showdown-alt.js')).Bot;

const Server = require(Path.resolve(__dirname, 'server/server.js')).Server;
const DataManager = require(Path.resolve(__dirname, 'data.js'));
const CommandParser = require(Path.resolve(__dirname, 'command-parser.js')).CommandParser;

const uncacheTree = Tools.get('uncachetree.js');
const checkDir = Tools.get('checkdir.js');

class ChatBotApp {
	/**
	 * @param confDir A path to store the bot configuration
	 * @param dataDir A path to store the bot data (dowloaded or temporal data)
	 */
	constructor(confDir, dataDir) {
		/* Initial Status */
		this.status = 'stopped';

		/* Check paths */
		this.confDir = confDir;
		checkDir(confDir);
		this.dataDir = dataDir;
		checkDir(dataDir);

		/* Data */
		this.data = new DataManager(dataDir);

		/* Configuration DataBase */
		this.db = new JSONDataBase(Path.resolve(confDir, 'config.json'));
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
			};
		}

		/* Server default config */
		if (!this.config.server) {
			this.config.server = {
				bindaddress: "",
				port: Default_Server_Port,
				https: false,
				httpsPort: 5000,
			};
		}

		if (process.env['PORT']) {
			this.config.server.port = process.env['PORT'];
		} else if (process.env['OPENSHIFT_NODEJS_PORT']) {
			this.config.server.port = process.env['OPENSHIFT_NODEJS_PORT'];
		}
		if (process.env['BIND_IP']) {
			this.config.server.bindaddress = process.env['BIND_IP'];
		} else if (process.env['OPENSHIFT_NODEJS_IP']) {
			this.config.server.bindaddress = process.env['OPENSHIFT_NODEJS_IP'];
		}

		/* Languages */
		this.languages = require(Path.resolve(__dirname, 'languages.json'));
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
				groups: ['+', '%', '@', '*', '#', '&', '~'],
				admin: '~',
				owner: '#',
				bot: '*',
				mod: '@',
				driver: '%',
				voice: '+',
			};
			this.config.cmdtokens = [];
		}

		/* Showdown protocol configuration */
		if (!this.config.showdownProtocol) {
			this.config.showdownProtocol = 'std';
		}
		let Bot = ShowdownBot;
		if (this.config.showdownProtocol === 'alt') {
			Bot = ShowdownBotAlt;
		}

		/* Create the bot */
		this.bot = new Bot(this.config.bot.server,
			this.config.bot.port,
			{loginServer: this.config.bot.loginserv,
			serverid: this.config.bot.serverid},
			{retryDelay: this.config.bot.retrydelay}
		);

		/* Create the server */
		this.server = new Server(this.confDir, this.config.server);

		/* Create the command parser */
		this.parser = new CommandParser(this.confDir, this.bot);

		/* Command parser bot events */
		this.bot.on('userchat', function (room, time, by, msg) {
			this.parser.parse(msg, room, by);
		}.bind(this));
		this.bot.on('pm', function (by, msg) {
			this.parser.parse(msg, null, by);
		}.bind(this));

		/* Data manager bot events */
		this.bot.on('formats', function () {
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

		/* Other initial values */
		this.logger = null;
		this.logsDir = null;
		this.modules = {};

		/* Add-ons */
		this.addonsDir = Path.resolve(this.confDir, 'add-ons/');
		checkDir(this.addonsDir);
		this.addons = {};
	}

	/**
	 * Starts the application
	 *
	 * @param callback Function (error)
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
	 *
	 * @param path Directory where the modules are located
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
						let mod = new BotMod(Path.resolve(path, file), conf);
						this.modules[mod.id] = mod;
						this.parser.addCommands(mod.commands);
						console.log('NEW MODULE: ' + mod.name + ' (v' + mod.version + ')');
					} catch (err) {
						console.log('Error: Cannot load module "' + file + '" - ' + err.message);
					}
				}
			}.bind(this));
		} else {
			console.log('Error: No modules found (wrong path)');
		}
	}

	/**
	 * Reloads the commands from all modules
	 *
	 * @param path Directory where the modules are located
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
								} catch (e) {}
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

	/*
	 * Reads the add-ons path and installs the add-ons
	 */
	loadAddons() {
		let files = FileSystem.readdirSync(this.addonsDir);
		files.forEach(function (file) {
			let absFile = Path.resolve(this.addonsDir, file);
			if (FileSystem.existsSync(absFile) && FileSystem.statSync(absFile).isFile()) {
				this.installAddon(file);
			}
		}.bind(this));
	}

	/*
	 * Installs an add-on
	 *
	 * @param file Add-on filename
	 */
	installAddon(file) {
		let path = Path.resolve(this.addonsDir, file);
		try {
			this.addons[file] = require(path);
			return true;
		} catch (err) {
			this.reportCrash(err);
			return false;
		}
	}

	/*
	 * Uninstalls an add-on
	 *
	 * @param file Add-on filename
	 */
	removeAddon(file) {
		if (typeof this.addons[file] === 'object' && typeof this.addons[file].destroy === 'function') {
			try {
				this.addons[file].destroy();
			} catch (err) {
				this.reportCrash(err);
			}
		}
		let path = Path.resolve(this.addonsDir, file);
		try {
			uncacheTree(path);
		} catch (e) {}
		delete this.addons[file];
	}

	/* Logger Methods */

	/**
	 * Creates the application logger
	 *
	 * @param path Directory where logs are stored
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
	 *
	 * @param text The message to be written
	 */
	log(text) {
		if (this.logger) {
			this.logger.log(text);
		} else {
			console.log(text);
		}
	}

	debug(text) {
		if (this.config.debug) {
			this.log("DEBUG: " + text);
		}
	}

	/**
	 * Reports a crash to the logger
	 *
	 * @param err Error that causes the crash
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
	 *
	 * @param by User that causes the action
	 * @param msg Description
	 */
	logServerAction(by, msg) {
		this.log('[SERVER] [By: ' + by + '] ' + msg);
	}

	/**
	 * Logs a command action
	 *
	 * @param context an instance of CommandContext
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
