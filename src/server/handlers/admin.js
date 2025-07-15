/**
 * Server Handler: Administration Options
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');
const check = Tools('check');
const Template = Tools('html-template');
const Text = Tools('text');

const mainTemplate = new Template(Path.resolve(__dirname, 'templates', 'admin.html'));

exports.setup = function (App) {
	/* Menu Options */
	App.server.setMenuOption('admin', 'Admin', '/admin/', 'root', 2);

	/* Handlers */
	App.server.setHandler('admin', (context, parts) => {
		if (!context.user || !context.user.can('root')) {
			context.endWith403();
			return;
		}

		let ok = null, error = null;

		if (context.post.exit) {
			App.logServerAction(context.user.id, 'Exit Process');
			try {
				App.userdata.write(); /* Sync user-data */
			} catch (err) {
				App.reportCrash(err);
			}
			let buf = '';
			buf += '<html><head><title>Process Exited</title><link rel="stylesheet" href="/static/style.css" /></head><body><p>The application exits successfully.</p>' +
				'<a href=""><button>Refresh Page</button></a></body></html>';
			context.response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
			context.response.end(buf);
			console.log("Exit via server, By: " + context.user.id);
			process.exit(0);
			return;
		} else if (context.post.savechanges) {
			let newPort = parseInt(context.post.port);
			let newHttpsPort = parseInt(context.post.sslport);
			let loginserv = (context.post.loginserv || "").trim();
			let maxMsgLength = parseInt(context.post.maxmsglen);
			let sslcertFile = context.post.sslcert || "";
			let sslkeyFile = context.post.sslkey || "";
			let accountType = context.post.actype || "";
			let safetyThrottleExtraDelay = parseInt(context.post.extradelay);
			let msgQueueMaxLength = parseInt(context.post.queuelen);

			try {
				check(!isNaN(newPort), "Invalid port.");
				check(!isNaN(safetyThrottleExtraDelay) && safetyThrottleExtraDelay > 0, "Invalid extra throttle delay");
				check(!isNaN(msgQueueMaxLength) && msgQueueMaxLength > 0, "Invalid max message sending queue length");
				check(!isNaN(maxMsgLength) && maxMsgLength > 0, "Invalid message length restriction");
				check(!sslcertFile || FileSystem.existsSync(Path.resolve(App.appDir, sslcertFile)), "SSl certificate file was not found.");
				check(!sslkeyFile || FileSystem.existsSync(Path.resolve(App.appDir, sslkeyFile)), "SSl key file was not found.");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				App.config.server.port = newPort;
				App.config.server.bindaddress = context.post.bindaddress || "";
				if (newHttpsPort) {
					App.config.server.httpsPort = newHttpsPort;
					App.config.server.https = true;
				} else {
					App.config.server.httpsPort = 5000;
					App.config.server.https = false;
				}
				App.config.server.sslcert = sslcertFile;
				App.config.server.sslkey = sslkeyFile;
				App.config.server.url = context.post.appurl || "";
				App.config.apptitle = context.post.apptitle || "";
				App.config.bot.loginserv = loginserv || "play.pokemonshowdown.com";
				App.config.bot.accountType = accountType;
				App.config.bot.safetyThrottleExtraDelay = safetyThrottleExtraDelay;
				App.config.bot.msgQueueMaxLength = msgQueueMaxLength;
				App.config.bot.maxMessageLength = maxMsgLength;
				App.config.debug = !!context.post.debugmode;
				App.config.useproxy = !!context.post.useproxy;
				App.config.blockautodownload = !!context.post.blockautodownload;
				App.config.disableuserdata = !!context.post.disableuserdata;
				App.config.autoremoveuserdata = !!context.post.rmuserdata;
				App.config.mainhtml = (context.post.mainhtml || '').trim();
				App.saveConfig();
				App.bot.accountType = App.config.bot.accountType;
				App.bot.msgQueueMaxLength = App.config.bot.msgQueueMaxLength;
				App.bot.safetyThrottleExtraDelay = App.config.bot.safetyThrottleExtraDelay;
				ok = "Changes made successfuly.";
				App.logServerAction(context.user.id, 'Administration options were edited');
			}
		}

		let htmlVars = Object.create(null);

		htmlVars.uptime = Math.floor(process.uptime() * 1000);
		htmlVars.memusage = (Math.floor(((process.memoryUsage().rss / 1024) / 1024) * 1000) / 1000) + ' MB';
		htmlVars.port = Text.escapeHTML(App.config.server.port);
		htmlVars.sslport = Text.escapeHTML(App.config.server.https ? App.config.server.httpsPort : "");
		htmlVars.sslcert = Text.escapeHTML(App.config.server.sslcert || "");
		htmlVars.sslkey = Text.escapeHTML(App.config.server.sslkey || "");
		htmlVars.bindaddress = Text.escapeHTML(App.config.server.bindaddress || '');
		htmlVars.appurl = Text.escapeHTML(App.config.server.url || "");
		htmlVars.apptitle = Text.escapeHTML(App.config.apptitle || 'Showdown ChatBot');
		htmlVars.loginserv = Text.escapeHTML(App.config.bot.loginserv || 'play.pokemonshowdown.com');
		htmlVars.extra_delay = Text.escapeHTML(App.config.bot.safetyThrottleExtraDelay || '50');
		htmlVars.queue_len = Text.escapeHTML(App.config.bot.msgQueueMaxLength || '120');
		htmlVars.maxmsglen = Text.escapeHTML(App.config.bot.maxMessageLength || '300');
		htmlVars.debugmode = (App.config.debug ? 'checked="checked"' : '');
		htmlVars.useproxy = (App.config.useproxy ? 'checked="checked"' : '');
		htmlVars.blockautodownload = (App.config.blockautodownload ? 'checked="checked"' : '');
		htmlVars.disableuserdata = (App.config.disableuserdata ? 'checked="checked"' : '');
		htmlVars.rmuserdata = (App.config.autoremoveuserdata ? 'checked="checked"' : '');
		htmlVars.mainhtml = Text.escapeHTML(App.config.mainhtml || '');

		htmlVars.ac_type_select = getAccountTypeSelect();

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), { title: "Admin - Showdown ChatBot" });
	});


	function getAccountTypeSelect() {
		let html = '<select name="actype">';
		html += '<option value="regular"' + ((!App.config.bot.accountType || App.config.bot.accountType === 'regular') ? ' selected="selected"' : '') + '>~2 messages per second (Regular user or staff only in private rooms)</option>';
		html += '<option value="trusted"' + (App.config.bot.accountType === 'trusted' ? ' selected="selected"' : '') + '>~6 messages per second (Global rank or staff rank in public or official rooms)</option>';
		html += '<option value="gbot"' + (App.config.bot.accountType === 'gbot' ? ' selected="selected"' : '') + '>~12 messages per second (Global bot rank or bot rank in public or official rooms)</option>';
		html += '</select>';
		return html;
	}
};
