/**
 * Showdown ChatBot main file
 * A Pokemon Showdown Bot written in ES6 for Node JS
 *
 * Copyright (c) 2016 Agustin San Roman (Ecuacion)
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
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

if (process.env['OPENSHIFT_DATA_DIR']) {
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
