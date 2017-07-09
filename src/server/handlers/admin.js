/**
 * Server Handler: Administration Options
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');
const check = Tools('check');
const Template = Tools('html-template');

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
			buf += '<html><head><title>Process Exited</title></head><body><p>The application exits sucessfully.</p>' +
			'<a href=""><button>Refresh Page</button></a></body></html>';
			context.response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
			context.response.end(buf);
			console.log("Exit via server, By: " + context.user.id);
			process.exit(0);
			return;
		} else if (context.post.savechanges) {
			let newPort = parseInt(context.post.port);
			let newHttpsPort = parseInt(context.post.sslport);
			let maxlines = parseInt(context.post.maxlines);
			let loginserv = (context.post.loginserv || "").trim();
			let maxMsgLength = parseInt(context.post.maxmsglen);
			let sslcertFile = context.post.sslcert || "";
			let sslkeyFile = context.post.sslkey || "";


			try {
				check(!isNaN(newPort), "Invalid port.");
				check(!isNaN(maxlines) && maxlines > 0, "Invalid lines restriction");
				check(!isNaN(maxMsgLength) && maxMsgLength > 0, "Invialid message length restriction");
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
				App.config.bot.maxlines = maxlines;
				App.config.bot.maxMessageLength = maxMsgLength;
				App.config.debug = !!context.post.debugmode;
				App.config.useproxy = !!context.post.useproxy;
				App.config.blockautodownload = !!context.post.blockautodownload;
				App.config.autoremoveuserdata = !!context.post.rmuserdata;
				App.config.mainhtml = (context.post.mainhtml || '').trim();
				if (context.post.wslib === 'sockjs') {
					App.config.websocketLibrary = 'sockjs';
				} else {
					App.config.websocketLibrary = 'websocket';
				}
				App.saveConfig();
				ok = "Changes made successfuly.";
				App.logServerAction(context.user.id, 'Administration options were editted');
			}
		}

		let htmlVars = {};

		htmlVars.uptime = Math.floor(process.uptime() * 1000);
		htmlVars.memusage = (Math.floor(((process.memoryUsage().rss / 1024) / 1024) * 1000) / 1000) + ' MB';
		htmlVars.port = App.config.server.port;
		htmlVars.sslport = (App.config.server.https ? App.config.server.httpsPort : "");
		htmlVars.sslcert = (App.config.server.sslcert || "");
		htmlVars.sslkey = (App.config.server.sslkey || "");
		htmlVars.bindaddress = (App.config.server.bindaddress || '');
		htmlVars.appurl = (App.config.server.url || "");
		htmlVars.apptitle = (App.config.apptitle || 'Showdown ChatBot');
		htmlVars.sockjs_selected = (App.config.websocketLibrary !== 'websocket' ? 'selected="selected"' : '');
		htmlVars.websocket_selected = (App.config.websocketLibrary === 'websocket' ? 'selected="selected"' : '');
		htmlVars.loginserv = (App.config.bot.loginserv || 'play.pokemonshowdown.com');
		htmlVars.maxlines = (App.config.bot.maxlines || '3');
		htmlVars.maxmsglen = (App.config.bot.maxMessageLength || '300');
		htmlVars.debugmode = (App.config.debug ? 'checked="checked"' : '');
		htmlVars.useproxy = (App.config.useproxy ? 'checked="checked"' : '');
		htmlVars.blockautodownload = (App.config.blockautodownload ? 'checked="checked"' : '');
		htmlVars.rmuserdata = (App.config.autoremoveuserdata ? 'checked="checked"' : '');
		htmlVars.mainhtml = JSON.stringify(App.config.mainhtml || '');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Admin - Showdown ChatBot"});
	});
};
