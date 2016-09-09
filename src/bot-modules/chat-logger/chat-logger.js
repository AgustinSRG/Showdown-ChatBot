/**
 * Bot Module: Chat Logger
 */

'use strict';

const Path = require('path');

const Text = Tools.get('text.js');
const Logger = Tools.get('logs.js');
const checkdir = Tools.get('checkdir.js');

if (!App.config.modules.chatlogger) {
	App.config.modules.chatlogger = {
		rooms: {},
		logpm: false,
		maxold: 7,
	};
}

checkdir(Path.resolve(App.logsDir, 'rooms'));

let loggers = exports.loggers = {};
let pmLogger = exports.pmLogger = null;

exports.refreshLoggers = function () {
	for (let room in App.config.modules.chatlogger.rooms) {
		if (!loggers[room]) {
			let path = Path.resolve(App.logsDir, 'rooms', room);
			checkdir(path);
			loggers[room] = new Logger(path, Text.toId(room), App.config.modules.chatlogger.maxold);
		}
		loggers[room].sweep();
	}
	if (App.config.modules.chatlogger.logpm) {
		if (!pmLogger) {
			let path = Path.resolve(App.logsDir, 'pm');
			checkdir(path);
			pmLogger = exports.pmLogger = new Logger(path, 'pm', App.config.modules.chatlogger.maxold);
		}
		pmLogger.sweep();
	}
};

App.bot.on('line', (room, line, splittedLine, initialMsg) => {
	if (splittedLine[0] === 'pm' && App.config.modules.chatlogger.logpm) {
		if (!pmLogger) {
			let path = Path.resolve(App.logsDir, 'pm');
			checkdir(path);
			pmLogger = exports.pmLogger = new Logger(path, 'pm', App.config.modules.chatlogger.maxold);
		}
		pmLogger.log(line);
	} else if (App.config.modules.chatlogger.rooms[room]) {
		if (splittedLine[0] === 'tournament' && (splittedLine[1] === 'update' || splittedLine[1] === 'updateEnd')) return;
		if (!loggers[room]) {
			let path = Path.resolve(App.logsDir, 'rooms', room);
			checkdir(path);
			loggers[room] = new Logger(path, Text.toId(room), App.config.modules.chatlogger.maxold);
		}
		loggers[room].log((initialMsg ? '[INTRO] ' : '') + line);
	}
});

App.bot.on('connect', () => {
	exports.refreshLoggers();
});

require(Path.resolve(__dirname, 'handlers/logs-view.js'));
require(Path.resolve(__dirname, 'handlers/logs-config.js'));
