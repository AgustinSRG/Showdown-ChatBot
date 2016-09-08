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
global.Tools = new ToolsManager(Path.resolve(__dirname, 'tools/'));

/* Check known cloud enviroments */

let logsDir = Path.resolve(__dirname, '../logs/');
let confDir = Path.resolve(__dirname, '../config/');
let dataDir = Path.resolve(__dirname, '../data/');

if (global.ShellOptions && global.ShellOptions.dir !== undefined) {
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
global.App = new ShowdownBotApplication(confDir, dataDir);

App.createLogger(logsDir);

require(Path.resolve(__dirname, 'server/basic-handlers.js'));

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
		console.log(err.message + '\n' + err.stack);
		process.exit(1);
	} else {
		App.tryRunBot();
	}
});
