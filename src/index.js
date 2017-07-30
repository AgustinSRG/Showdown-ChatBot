/**
 * Showdown ChatBot main file
 * A Pokemon Showdown Bot written in ES6 for Node JS
 *
 * Showdown ChatBot is distributed under the terms of the MIT License
 * (https://github.com/asanrom/Showdown-ChatBot/blob/master/LICENSE)
 */

'use strict';

const Path = require('path');

/* Tools manager */

const ToolsManager = require(Path.resolve(__dirname, 'tools.js'));
ToolsManager.setPath(Path.resolve(__dirname, 'tools/'));
ToolsManager.makeGlobal();

const checkDir = Tools('checkdir');

/* Application setup */

function setup(env) {
	/* Check known cloud enviroments */

	try {checkDir(Path.resolve(__dirname, "instances"));} catch (e) {}

	let logsDir = Path.resolve(__dirname, '../logs/');
	let confDir = Path.resolve(__dirname, '../config/');
	let dataDir = Path.resolve(__dirname, '../data/');

	if (env && env.dir !== undefined) {
		try {
			checkDir(env.dir);
		} catch (err) {
			console.log(err.message);
			console.log(err.stack);
			console.log("INVALID PATH: " + env.dir);
			process.exit(1);
		}
		logsDir = Path.resolve(env.dir, 'logs/');
		confDir = Path.resolve(env.dir, 'config/');
		dataDir = Path.resolve(env.dir, 'data/');
	} else if (process.env['OPENSHIFT_DATA_DIR']) {
		/* Openshift Node catridge */
		logsDir = Path.resolve(process.env['OPENSHIFT_DATA_DIR'], 'logs/');
		confDir = Path.resolve(process.env['OPENSHIFT_DATA_DIR'], 'config/');
		dataDir = Path.resolve(process.env['OPENSHIFT_DATA_DIR'], 'data/');
	}

	/* Data Access Mode */

	const DataAccessManager = require(Path.resolve(__dirname, 'data-access', 'data-access-manager.js'));
	let datamode = "RAW";
	let dataconfig = {
		confDir: confDir,
	};

	if (env && env.config && env.config.Data_Mode !== undefined) {
		datamode = "" + env.config.Data_Mode;
		for (let k in env.config) {
			if (!dataconfig[k]) {
				dataconfig[k] = env.config[k];
			}
		}
	}

	dataconfig.path = confDir;

	const dam = DataAccessManager.getDataAccessManager(datamode, dataconfig);

	dam.init(err => {
		if (err) {
			console.log("Error: " + err.code + " / " + err.message);
			console.log(err.stack);
			console.log("Error: Cannot init data access system. Please change the configuration.");
		}

		/* Create Application */

		const ShowdownBotApplication = require(Path.resolve(__dirname, 'app.js'));
		const App = new ShowdownBotApplication(dam, confDir, dataDir, env || {});

		App.createLogger(logsDir);

		const SourceLoader = Tools('loader');
		const loader = new SourceLoader(Path.resolve(__dirname, 'server/handlers/'), App);
		loader.loadAll(/.*\.js$/);

		App.loadModules(Path.resolve(__dirname, 'bot-modules/'));

		App.loadAddons();

		/* Set Crash-Guard */

		const CrashGuardTemplate = Tools('crashguard');

		global.CrashGuard = new CrashGuardTemplate(err => {
			App.reportCrash(err);
		});

		/* Start Application */

		console.log('Starting server...');

		App.start(err => {
			if (err) {
				console.log("FATAL: Cannot start the server. Error code: " + err.code);
				if (err.code === "EADDRINUSE") {
					console.log("PORT is in use. You can choose another port with the following syntax: node showdown chatbot -p PORT");
				}
				process.exit(1);
			} else {
				App.tryRunBot();
			}
		});
	});
}

exports.setup = setup;
