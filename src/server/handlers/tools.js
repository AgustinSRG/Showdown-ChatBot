/**
 * Server Handler: Development Tools
 */

'use strict';

const Path = require('path');
const ServerGet = Tools.get('ps-cross-server.js');
const Text = Tools.get('text.js');
const getEvalResult = Tools.get('eval.js');
const SubMenu = Tools.get('submenu.js');
const Template = Tools.get('html-template.js');

const getServerTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-getserver.html'));
const botSendTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-botsend.html'));
const botLoginTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-botlogin.html'));
const seenTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-seen.html'));
const clearUsersTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-clearusers.html'));
const hotpatchTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-hotpatch.html'));
const dowloadDataTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-ddata.html'));
const cacheTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-cache.html'));
const evalTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-eval.html'));

exports.setup = function (App) {
	/* Menu Options */
	App.server.setMenuOption('tools', 'Tools', '/tools/', 'root', 2);

	/* Handlers */
	App.server.setHandler('tools', (context, parts) => {
		if (!context.user || !context.user.can('root')) {
			context.endWith403();
			return;
		}

		let submenu = new SubMenu("Develoment&nbsp;Tools", parts, context, [
			{id: 'getserver', title: 'Get-Server', url: '/tools/', handler: toolGetServer},
			{id: 'botsend', title: 'Bot-Send', url: '/tools/botsend/', handler: toolBotSend},
			{id: 'botlogin', title: 'Bot-Login', url: '/tools/botlogin/', handler: toolBotLogin},
			{id: 'seen', title: 'Seen', url: '/tools/seen/', handler: toolSeen},
			{id: 'clearusers', title: 'Clear&nbsp;User-Data', url: '/tools/clearusers/', handler: toolClearUsers},
			{id: 'hotpatch', title: 'Hotpatch', url: '/tools/hotpatch/', handler: toolHotpatch},
			{id: 'ddata', title: 'Reload&nbsp;Data', url: '/tools/ddata/', handler: toolDownloadData},
			{id: 'cache', title: 'Clear&nbsp;Cache', url: '/tools/cache/', handler: toolClearCache},
			{id: 'eval', title: 'Eval&nbsp;(JavaScript)', url: '/tools/eval/', handler: toolEval},
		], 'getserver');

		return submenu.run();
	});


	function toolGetServer(context, html, parts) {
		if (context.get.server) {
			App.logServerAction(context.user.id, "Tool Server-Get used: " + context.get.server);
			ServerGet.getShowdownServer(context.get.server, (err, data) => {
				let result = '';
				if (err) {
					result += '<p style="padding:5px;"><span class="error-msg">Could not get the server configuration.</span></p>';
				} else {
					result += '<p style="padding:5px;"><strong>Server</strong>:&nbsp;' + data.host + '</p>';
					result += '<p style="padding:5px;"><strong>Port</strong>:&nbsp;' + data.port + '</p>';
					result += '<p style="padding:5px;"><strong>Server-ID</strong>:&nbsp;' + data.id + '</p>';
				}
				context.endWithText(result);
			});
			return;
		}

		html += getServerTemplate.get();
		context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot", scripts: ['/static/jquery-3.0.0.min.js']});
	}

	function toolBotSend(context, html, parts) {
		if (context.post.snd) {
			let result = '';
			if (context.post.msg) {
				if (App.bot.isConnected()) {
					App.bot.sendTo(context.post.room || "", context.post.msg.split('\n'));
					App.logServerAction(context.user.id, "Tool Bot-Send used. Room: " + (context.post.room || '-') +
						" | Message: " + context.post.msg);
					result += '<p style="padding:5px;"><span class="ok-msg">Message sucessfully sent.</span></p>';
				} else {
					result += '<p style="padding:5px;"><span class="error-msg">Error: The bot is not connected.</span></p>';
				}
			} else {
				result += '<p style="padding:5px;"><span class="error-msg">Cannot send a blank message.</span></p>';
			}
			return context.endWithText(result);
		}
		html += botSendTemplate.get();
		context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot", scripts: ['/static/jquery-3.0.0.min.js']});
	}

	function toolBotLogin(context, html, parts) {
		if (context.post.snd) {
			let result = '';
			if (context.post.botuser) {
				if (App.bot.isConnected()) {
					App.bot.rename(context.post.botuser, context.post.botpass);
					App.logServerAction(context.user.id, "Tool Bot-Login used. Bot Username: " + context.post.botuser);
					result += '<p style="padding:5px;"><span class="ok-msg">Login request sucessfully sent.</span></p>';
				} else {
					result += '<p style="padding:5px;"><span class="error-msg">Error: The bot is not connected.</span></p>';
				}
			} else {
				result += '<p style="padding:5px;"><span class="error-msg">Cannot login using a blanck username.</span></p>';
			}
			return context.endWithText(result);
		}
		html += botLoginTemplate.get();
		context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot", scripts: ['/static/jquery-3.0.0.min.js']});
	}

	function toolSeen(context, html, parts) {
		let user = Text.toId(context.get.user);
		if (user) {
			if (user.length > 19) {
				context.endWithText("Error: Invalid Username");
			} else if (user === Text.toId(App.bot.getBotNick())) {
				context.endWithText("Bot nickname: " + App.bot.getBotNick() + " | No seen information");
			} else if (App.bot.users[user]) {
				let name = App.bot.users[user].name;
				let seen = App.bot.users[user].lastSeen;
				let time = Math.round((Date.now() - seen.time) / 1000);
				let times = [];
				let aux;
				/* Get Time difference */
				aux = time % 60; // Seconds
				if (aux > 0 || time === 0) times.unshift(aux + ' ' + (aux === 1 ? "second" : "seconds"));
				time = Math.floor(time / 60);
				aux = time % 60; // Minutes
				if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? "minute" : "minutes"));
				time = Math.floor(time / 60);
				aux = time % 24; // Hours
				if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? "hour" : "hours"));
				time = Math.floor(time / 24); // Days
				if (time > 0) times.unshift(time + ' ' + (time === 1 ? "day" : "days"));
				/* Reply */
				let reply = "User" + ' ' + name.trim() + ' ' +
				"was last seen" + ' ' + times.join(', ') + ' ' + "ago ";
				switch (seen.type) {
				case 'J':
					reply += 'joining' + ' ';
					break;
				case 'L':
					reply += 'leaving' + ' ';
					break;
				case 'C':
					reply += 'chatting in' + ' ';
					break;
				case 'R':
					reply += 'changing nick to' + ' ' + seen.detail;
					break;
				}
				if (seen.type in {'J': 1, 'L': 1, 'C': 1}) {
					reply += tryGetRoomTitle(seen.room);
				}
				if (App.bot.users[user].alts.length > 0) {
					reply += '\n';
					reply += 'Alts: ' + App.bot.users[user].alts.join(', ');
				}
				context.endWithText(reply);
			} else {
				context.endWithText("User \"" + user + "\" has never been seen, at least since the last restart");
			}
		} else {
			html += seenTemplate.get();
			context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot", scripts: ['/static/jquery-3.0.0.min.js']});
		}
	}

	function toolEval(context, html, parts) {
		if (!App.config.debug) {
			html += '<p><span class="error-msg">This tool only works in Debug Mode.</span></p>';
			context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot"});
			return;
		}
		if (App.env.staticmode) {
			html += '<p><span class="error-msg">Error: Static mode does not allow eval.</span></p>';
			context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot"});
			return;
		}
		if (context.post.scriptdata) {
			App.logServerAction(context.user.id, "Tool Eval used: " + context.post.scriptdata);
			context.endWithText(getEvalResult(context.post.scriptdata, App));
			return;
		}
		html += evalTemplate.get();
		context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot", scripts: ['/static/jquery-3.0.0.min.js']});
	}

	function toolHotpatch(context, html, parts) {
		let ok = null, error = null;
		if (context.post.hotpatch) {
			try {
				App.hotpatchCommands(Path.resolve(__dirname, '../../bot-modules/'));
				App.logServerAction(context.user.id, 'Hotpatch Commands.');
				ok = "Commands hotpatched";
			} catch (err) {
				error = "Error: " + err.code + " - " + err.message;
			}
		}

		let htmlVars = {};
		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += hotpatchTemplate.make(htmlVars);

		context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot"});
	}

	function toolDownloadData(context, html, parts) {
		let ok = null, error = null;
		if (context.post.reloaddata) {
			App.data.downloadAll();
			App.logServerAction(context.user.id, 'Reload Data.');
			ok = "Downloading data. It will be realoaded in a few seconds. For more information watch security log";
		}

		let htmlVars = {};
		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += dowloadDataTemplate.make(htmlVars);

		context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot"});
	}

	function toolClearCache(context, html, parts) {
		let ok = null, error = null;
		if (context.post.clearcache) {
			let cache = App.data.cache;
			for (let url in cache.data) {
				cache.uncache(url);
			}
			cache.write();
			App.logServerAction(context.user.id, 'Clear Web Cache');
			ok = "Web Cache cleared sucessfully.";
		}

		let htmlVars = {};
		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += cacheTemplate.make(htmlVars);

		context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot"});
	}

	function toolClearUsers(context, html, parts) {
		let ok = null, error = null;
		if (context.post.clearusers) {
			App.bot.clearUserData();
			App.logServerAction(context.user.id, 'Clear User-Data');
			ok = "User-Data cleared sucessfully.";
		}

		let htmlVars = {};
		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += clearUsersTemplate.make(htmlVars);

		context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot"});
	}

	/* Auxiliar Functions */
	function tryGetRoomTitle(room) {
		if (App.bot.rooms[room]) {
			return App.bot.rooms[room].title || room;
		} else {
			return room;
		}
	}
};
