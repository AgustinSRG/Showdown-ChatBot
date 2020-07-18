/**
 * Server Handler: ChatLogger Configuration
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'logs-config.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('chatlogger', 'Permission for changing the chat-logger configuration');

	/* Menu Options */
	App.server.setMenuOption('chatlogger', 'Chat-Logger', '/chatlogger/', 'chatlogger', 0);

	/* Handlers */
	App.server.setHandler('chatlogger', (context, parts) => {
		if (!context.user || !context.user.can('chatlogger')) {
			context.endWith403();
			return;
		}

		let ok = null, error = null;
		if (context.post.save) {
			let maxold = parseInt(context.post.age);
			if (!isNaN(maxold) && maxold >= 0) {
				let rooms = {};
				let aux = (context.post.rooms || "").split(',');
				for (let i = 0; i < aux.length; i++) {
					let room = Text.toRoomid(aux[i]);
					if (!room) continue;
					rooms[room] = true;
				}
				App.config.modules.chatlogger.rooms = rooms;
				App.config.modules.chatlogger.logpm = !!context.post.logpm;
				App.config.modules.chatlogger.logGroupChats = !!context.post.logGroupChats;
				App.config.modules.chatlogger.maxold = maxold;
				for (let room in App.modules.chatlogger.system.loggers) {
					App.modules.chatlogger.system.loggers[room].maxOld = maxold;
				}
				if (App.modules.chatlogger.system.pmLogger) {
					App.modules.chatlogger.system.pmLogger.maxOld = maxold;
				}
				App.modules.chatlogger.system.refreshLoggers();
				App.db.write();
				App.logServerAction(context.user.id, 'Edit Chat-Logger Configuration (ChatLogger Module)');
				ok = "Chatloogger configuration saved.";
			} else {
				error = "Max age of logs must be a number equal or higher than 0.";
			}
		}

		let htmlVars = {};

		htmlVars.rooms = Object.keys(App.config.modules.chatlogger.rooms).join(', ');
		htmlVars.logpm = (App.config.modules.chatlogger.logpm ? ' checked="checked"' : '');
		htmlVars.loggroupchats = (App.config.modules.chatlogger.logGroupChats ? ' checked="checked"' : '');
		htmlVars.age = App.config.modules.chatlogger.maxold;

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Chat-Logger Configuration - Showdown ChatBot"});
	});
};
