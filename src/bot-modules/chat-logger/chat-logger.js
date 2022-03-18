/**
 * Bot Module: Chat Logger
 */

'use strict';

const Path = require('path');

const Text = Tools('text');
const Logger = Tools('logs');
const checkdir = Tools('checkdir');

exports.setup = function (App) {
	if (!App.config.modules.chatlogger) {
		App.config.modules.chatlogger = {
			rooms: {},
			logpm: false,
			maxold: 7,
		};
	}

	checkdir(Path.resolve(App.logsDir, 'rooms'));

	class ChatLoggerModule {
		constructor() {
			this.loggers = Object.create(null);
			this.pmLogger = null;
			this.groupchatsLogger = null;
		}

		refreshLoggers() {
			for (let room in App.config.modules.chatlogger.rooms) {
				if (!this.loggers[room]) {
					let path = Path.resolve(App.logsDir, 'rooms', room);
					checkdir(path);
					this.loggers[room] = new Logger(path, Text.toId(room), App.config.modules.chatlogger.maxold);
				}
				this.loggers[room].sweep();
			}
			if (App.config.modules.chatlogger.logpm) {
				if (!this.pmLogger) {
					let path = Path.resolve(App.logsDir, 'pm');
					checkdir(path);
					this.pmLogger = new Logger(path, 'pm', App.config.modules.chatlogger.maxold);
				}
				this.pmLogger.sweep();
			}
			if (App.config.modules.chatlogger.logGroupChats) {
				if (!this.groupchatsLogger) {
					let path = Path.resolve(App.logsDir, 'groupchat');
					checkdir(path);
					this.groupchatsLogger = new Logger(path, 'groupchat', App.config.modules.chatlogger.maxold);
				}
				this.groupchatsLogger.sweep();
			}
		}

		receiveLog(room, line, splittedLine, initialMsg) {
			if (line === "") return;
			if (splittedLine[0] === 'pm' && App.config.modules.chatlogger.logpm) {
				if (!this.pmLogger) {
					let path = Path.resolve(App.logsDir, 'pm');
					checkdir(path);
					this.pmLogger = new Logger(path, 'pm', App.config.modules.chatlogger.maxold);
				}
				this.pmLogger.log(line);
			} else if (App.config.modules.chatlogger.rooms[room]) {
				if (splittedLine[0] === 'tournament' && (splittedLine[1] === 'update' || splittedLine[1] === 'updateEnd')) return;
				if (!this.loggers[room]) {
					let path = Path.resolve(App.logsDir, 'rooms', room);
					checkdir(path);
					this.loggers[room] = new Logger(path, Text.toId(room), App.config.modules.chatlogger.maxold);
				}
				this.loggers[room].log((initialMsg ? '[INTRO] ' : '') + line);
			} else if (App.config.modules.chatlogger.logGroupChats && room.substr(0, "groupchat-".length) === "groupchat-") {
				if (!this.groupchatsLogger) {
					let path = Path.resolve(App.logsDir, 'groupchat');
					checkdir(path);
					this.groupchatsLogger = new Logger(path, 'groupchat', App.config.modules.chatlogger.maxold);
				}
				if (splittedLine[0] === 'tournament' && (splittedLine[1] === 'update' || splittedLine[1] === 'updateEnd')) return;
				this.groupchatsLogger.log("[" + room + "] " + (initialMsg ? '[INTRO] ' : '') + line);
			}
		}
	}

	const ChatLogger = new ChatLoggerModule();

	App.bot.on('line', ChatLogger.receiveLog.bind(ChatLogger));

	App.bot.on('connect', () => {
		ChatLogger.refreshLoggers();
	});

	return ChatLogger;
};
