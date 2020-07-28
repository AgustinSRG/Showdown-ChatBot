/**
 * Server Handler: Bot Configuration
 * Allows administrator to configure the connection options
 * for Showdown-ChatBot: server, port, serverId and retyConnectionDelay
 */

'use strict';

const Path = require('path');
const check = Tools('check');
const Text = Tools('text');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'templates', 'bot-config.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('bot', 'Permission for changing the bot configuration');

	/* Menu Options */
	App.server.setMenuOption('bot', 'Bot&nbsp;Configuration', '/bot/', 'bot', 1);

	/* Handlers */
	App.server.setHandler('bot', (context, parts) => {
		if (!context.user || !context.user.can('bot')) {
			context.endWith403();
			return;
		}

		if (context.get.getbotstatus) {
			let data = {};
			if (App.bot.status.connected) {
				let ct = new Date(App.bot.conntime);
				data.con = '<font color="green"><strong>CONNECTED</strong></font>';
				data.ctime = '<i>' + Text.escapeHTML(ct.toString()) + '</i>';
			} else if (App.bot.connecting) {
				data.con = '<font color="orange"><strong>CONNECTING...</strong></font>';
				data.ctime = '&nbsp;';
			} else {
				data.con = '<font color="red"><strong>NOT CONNECTED</strong></font>';
				data.ctime = '&nbsp;';
			}
			data.nick = (App.bot.getBotNick().substr(1) || "-");
			data.rooms = [];
			for (let r in App.bot.rooms) {
				if (App.bot.rooms[r].type === 'chat') {
					data.rooms.push(App.bot.rooms[r].id);
				}
			}
			data.battles = [];
			for (let r in App.bot.rooms) {
				if (App.bot.rooms[r].type === 'battle') {
					data.battles.push(App.bot.rooms[r].id);
				}
			}
			return context.endWithText(JSON.stringify(data));
		}

		let ok = null, error = null;
		if (context.post.restart) {
			if (App.restartBot()) {
				ok = "The bot was restarted.";
				App.logServerAction(context.user.id, 'Bot Restart');
			} else {
				if (!App.bot.server) {
					error = "The bot could not start because the Server was not defined.";
				} else {
					error = "Could not restart the bot because it was already restarting.";
				}
			}
		} else if (context.post.stop) {
			if (App.stopBot()) {
				ok = "The bot process was stopped.";
				App.logServerAction(context.user.id, 'Bot Stop');
			} else {
				error = "The bot was already stopped.";
			}
		} else if (context.post.editbot) {
			let secRetry = parseInt(context.post.retry);
			let newPort = parseInt(context.post.port);

			try {
				check(!isNaN(secRetry) && secRetry > 0, "Invalid time to retry the connection.");
				check(!isNaN(newPort), "Invalid Port");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				App.config.bot.server = context.post.server || '';
				App.config.bot.port = context.post.port;
				App.config.bot.secure = !!context.post.secure;
				App.config.bot.serverid = context.post.serverid || 'showdown';
				App.config.bot.retrydelay = secRetry * 1000;
				App.bot.server = App.config.bot.server;
				App.bot.port = App.config.bot.port;
				App.bot.secure = App.config.bot.secure;
				App.bot.loginUrl.serverId = App.config.bot.serverid;
				if (App.bot.errOptions) {
					App.bot.errOptions.retryDelay = App.config.bot.retrydelay;
				}
				App.saveConfig();
				App.logServerAction(context.user.id, 'Edit Bot configuration');
				ok = "Bot configuration changed sucessfully. Restart the bot to make the changes effective.";
			}
		}

		let htmlVars = {};

		if (App.status !== 'stopped') {
			htmlVars.stop_button = '<p><button onclick="showStopConfirm();">Stop Bot</button><span id="confirm-stop">&nbsp;</span></p>';
		} else {
			htmlVars.stop_button = "";
		}

		if (App.bot.status.connected) {
			let ct = new Date(App.bot.conntime);
			htmlVars.connection = '<span id="bot-connection"><font color="green"><strong>CONNECTED</strong></font></span>';
			htmlVars.conntime = '<span id="bot-conntime"><i>' + Text.escapeHTML(ct.toString()) + '</i></span>';
		} else if (App.bot.connecting) {
			htmlVars.connection = '<span id="bot-connection"><font color="orange"><strong>CONNECTING...</strong></font></span>';
			htmlVars.conntime = '<span id="bot-conntime"><i>&nbsp;</i></span>';
		} else {
			htmlVars.connection = '<span id="bot-connection"><font color="red"><strong>NOT CONNECTED</strong></font></span>';
			htmlVars.conntime = '<span id="bot-conntime"><i>&nbsp;</i></span>';
		}

		htmlVars.nick = (App.bot.getBotNick().substr(1) || "-");

		let rooms = [];
		for (let r in App.bot.rooms) {
			if (App.bot.rooms[r].type === 'chat') {
				rooms.push(App.bot.rooms[r].id);
			}
		}
		htmlVars.rooms = rooms.join(', ');
		let battles = [];
		for (let r in App.bot.rooms) {
			if (App.bot.rooms[r].type === 'battle') {
				battles.push(App.bot.rooms[r].id);
			}
		}
		htmlVars.battles = battles.join(', ');

		htmlVars.server = App.bot.server;
		htmlVars.port = App.bot.port;
		htmlVars.secure = (App.bot.secure ? 'checked="checked"' : '');
		htmlVars.serverid = App.bot.loginUrl.serverId;
		htmlVars.retry = Math.floor(App.config.bot.retrydelay / 1000);

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {
			title: "Bot Configuration - Showdown ChatBot",
			scripts: ['/static/jquery-3.0.0.min.js']});
	});
};
