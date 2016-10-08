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

/* Application setup */

function setup(env) {
	/* Check known cloud enviroments */

	let logsDir = Path.resolve(__dirname, '../logs/');
	let confDir = Path.resolve(__dirname, '../config/');
	let dataDir = Path.resolve(__dirname, '../data/');

	if (env && env.dir !== undefined) {
		logsDir = Path.resolve(global.ShellOptions.dir, 'logs/');
		confDir = Path.resolve(global.ShellOptions.dir, 'config/');
		dataDir = Path.resolve(global.ShellOptions.dir, 'data/');
	} else if (process.env['OPENSHIFT_DATA_DIR']) {
		/* Openshift Node catridge */
		logsDir = Path.resolve(process.env['OPENSHIFT_DATA_DIR'], 'logs/');
		confDir = Path.resolve(process.env['OPENSHIFT_DATA_DIR'], 'config/');
		dataDir = Path.resolve(process.env['OPENSHIFT_DATA_DIR'], 'data/');
	}

	/* Create Application */

	const ShowdownBotApplication = require(Path.resolve(__dirname, 'app.js'));
	const App = global.App = new ShowdownBotApplication(confDir, dataDir, env || {});

	App.createLogger(logsDir);

	const SourceLoader = Tools.get('loader.js');
	const loader = new SourceLoader(Path.resolve(__dirname, 'server/handlers/'), App);
	loader.loadAll(/.*\.js$/);

	App.loadModules(Path.resolve(__dirname, 'bot-modules/'));

	App.loadAddons();

	/* Set Crash-Guard */

	const CrashGuardTemplate = Tools.get('crashguard.js');

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
}

exports.setup = setup;
