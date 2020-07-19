/**
 * Server Handler: Development Tools
 */

'use strict';

const Path = require('path');
const ServerGet = Tools('ps-cross-server');
const Text = Tools('text');
const getEvalResult = Tools('eval');
const SubMenu = Tools('submenu');
const Template = Tools('html-template');
const Crypto = require('crypto');

const getServerTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-getserver.html'));
const botSendTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-botsend.html'));
const botLoginTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-botlogin.html'));
const seenTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-seen.html'));
const clearUsersTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-clearusers.html'));
const hotpatchTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-hotpatch.html'));
const dowloadDataTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-ddata.html'));
const cacheTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-cache.html'));
const monitorTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-monitor.html'));
const backupsTemplate = new Template(Path.resolve(__dirname, 'templates', 'tool-backups.html'));
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
			{ id: 'getserver', title: 'Get-Server', url: '/tools/', handler: toolGetServer },
			{ id: 'botsend', title: 'Bot-Send', url: '/tools/botsend/', handler: toolBotSend },
			{ id: 'botlogin', title: 'Bot-Login', url: '/tools/botlogin/', handler: toolBotLogin },
			{ id: 'seen', title: 'Seen', url: '/tools/seen/', handler: toolSeen },
			{ id: 'clearusers', title: 'Clear&nbsp;User-Data', url: '/tools/clearusers/', handler: toolClearUsers },
			{ id: 'hotpatch', title: 'Hotpatch', url: '/tools/hotpatch/', handler: toolHotpatch },
			{ id: 'ddata', title: 'Reload&nbsp;Data', url: '/tools/ddata/', handler: toolDownloadData },
			{ id: 'cache', title: 'Clear&nbsp;Cache', url: '/tools/cache/', handler: toolClearCache },
			{ id: 'cnnmonitor', title: 'Connection&nbsp;Monitor', url: '/tools/cnnmonitor/', handler: toolConnectionMonitor },
			{ id: 'backups', title: 'Backups', url: '/tools/backups/', handler: toolBackups },
			{ id: 'eval', title: 'Eval&nbsp;(JavaScript)', url: '/tools/eval/', handler: toolEval },
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
		context.endWithWebPage(html, { title: "Develoment Tools - Showdown ChatBot", scripts: ['/static/jquery-3.0.0.min.js'] });
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
		context.endWithWebPage(html, { title: "Develoment Tools - Showdown ChatBot", scripts: ['/static/jquery-3.0.0.min.js'] });
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
		context.endWithWebPage(html, { title: "Develoment Tools - Showdown ChatBot", scripts: ['/static/jquery-3.0.0.min.js'] });
	}

	function toolSeen(context, html, parts) {
		let user = Text.toId(context.get.user);
		if (user) {
			if (user.length > 19) {
				context.endWithText(Text.escapeHTML("Error: Invalid Username"));
			} else if (user === Text.toId(App.bot.getBotNick())) {
				context.endWithText(Text.escapeHTML("Bot nickname: " + App.bot.getBotNick().substr(1) + " | No seen information"));
			} else {
				let userData = App.userdata.getLastSeen(user);
				if (userData) {
					let name = userData.name;
					let seen = userData.lastSeen;
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
					if (seen.type in { 'J': 1, 'L': 1, 'C': 1 }) {
						reply += tryGetRoomTitle(seen.room);
					}
					reply = Text.escapeHTML(reply);
					let alts = App.userdata.getAlts(user);
					if (alts.length > 0) {
						reply += '<br /><br />';
						reply += 'Alts: ' + Text.escapeHTML(alts.join(', '));
					}
					context.endWithText(reply);
				} else {
					context.endWithText(Text.escapeHTML("User \"" + user + "\" has never been seen, at least since the last restart"));
				}
			}
		} else {
			html += seenTemplate.get();
			context.endWithWebPage(html, { title: "Develoment Tools - Showdown ChatBot", scripts: ['/static/jquery-3.0.0.min.js'] });
		}
	}

	function toolEval(context, html, parts) {
		if (!App.config.debug) {
			html += '<p><span class="error-msg">This tool only works in Debug Mode.</span></p>';
			context.endWithWebPage(html, { title: "Develoment Tools - Showdown ChatBot" });
			return;
		}
		if (App.env.staticmode) {
			html += '<p><span class="error-msg">Error: Static mode does not allow eval.</span></p>';
			context.endWithWebPage(html, { title: "Develoment Tools - Showdown ChatBot" });
			return;
		}
		if (context.post.scriptdata) {
			App.logServerAction(context.user.id, "Tool Eval used: " + context.post.scriptdata);
			context.endWithText(getEvalResult(context.post.scriptdata, App));
			return;
		}
		html += evalTemplate.get();
		context.endWithWebPage(html, { title: "Develoment Tools - Showdown ChatBot", scripts: ['/static/jquery-3.0.0.min.js'] });
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

		context.endWithWebPage(html, { title: "Develoment Tools - Showdown ChatBot" });
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

		context.endWithWebPage(html, { title: "Develoment Tools - Showdown ChatBot" });
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

		context.endWithWebPage(html, { title: "Develoment Tools - Showdown ChatBot" });
	}

	function toolClearUsers(context, html, parts) {
		let ok = null, error = null;
		if (context.post.clearusers) {
			App.userdata.clean();
			App.logServerAction(context.user.id, 'Clear User-Data');
			ok = "User-Data cleared sucessfully.";
		} else if (context.post.clearalts) {
			App.userdata.cleanAlts();
			App.logServerAction(context.user.id, 'Clear Alts Tree');
			ok = "Alts tree cleared sucessfully.";
		}

		let htmlVars = {};
		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += clearUsersTemplate.make(htmlVars);

		context.endWithWebPage(html, { title: "Develoment Tools - Showdown ChatBot" });
	}

	function toolConnectionMonitor(context, html, parts) {
		let ok = null, error = null;
		if (context.post.edit) {
			let checktime = parseInt(context.post.interv);
			if (!isNaN(checktime) && checktime > 10) {
				App.config.connmonitor.checktime = checktime;
				App.config.connmonitor.room = Text.toRoomid(context.post.room);
				App.config.connmonitor.msg = Text.trim(context.post.cmd);
				App.config.connmonitor.enabled = !!context.post.enabled;
				if (App.config.connmonitor.enabled) {
					App.connMonitor.start();
				} else {
					App.connMonitor.stop();
				}
				App.saveConfig();
				App.logServerAction(context.user.id, 'Edit connection monitor configuration');
				ok = "Connection monitor configuration saved.";
			} else {
				error = "Invalid time interval.";
			}
		}

		let htmlVars = {};

		htmlVars.interv = App.config.connmonitor.checktime;
		htmlVars.room = App.config.connmonitor.room;
		htmlVars.cmd = App.config.connmonitor.msg;
		htmlVars.enabled = (App.config.connmonitor.enabled ? ' checked="checked"' : '');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += monitorTemplate.make(htmlVars);

		context.endWithWebPage(html, { title: "Develoment Tools - Showdown ChatBot" });
	}

	function toolBackups(context, html, parts) {
		let ok = null, error = null;

		if (App.dam.type !== "RAW") {
			html += '<p><span class="error-msg">This tool is only available for raw-files mode.</span></p>';
			context.endWithWebPage(html, { title: "Develoment Tools - Showdown ChatBot" });
			return;
		}

		if (context.post.savebackup) {
			if (!context.post.cryptopassword) {
				context.endWithText("Error: You must specify a password.");
			} else if (context.post.cryptopassword !== context.post.cryptopassword2) {
				context.endWithText("Error: The passwords do not match.");
			} else {
				let f = new Date();
				context.response.writeHead(200, {
					'Content-Type': 'application/force-download',
					'Content-Disposition': 'inline; filename="showdown_chatbot_' + f.getFullYear() + '_' +
						(f.getMonth() + 1) + '_' + f.getDate() + '.backup"'
				});
				let backupData = App.dam.getBackup();
				let backup = {
					signature: "$BACKUP$NATIVE$ENCRYPTED$/Showdown-Chatbot/" + App.env.package.version,
					time: Date.now(),
					files: backupData.files,
					directories: backupData.directories,
				};
				context.response.end(encrypt(JSON.stringify(backup), "aes-256-ctr", context.post.cryptopassword));
			}
			return;
		} else if (context.post.restorebackup) {
			if (!context.post.cryptopassword) {
				error = "You must specify a password.";
			} else {
				if (!context.files.backupfile) {
					error = "You must upload a backup file.";
				} else if (!App.jsInject) {
					error = "[Javascript injection is disabled]";
				} else {
					let backup = context.files.backupfile.data;
					try {
						backup = decrypt(backup, "aes-256-ctr", context.post.cryptopassword);
					} catch (err) {
						App.reportCrash(err);
						error = "Invalid backup file: Corrupted data.";
					}
					if (!error) {
						try {
							backup = JSON.parse(backup);
							if (typeof backup !== "object" || typeof backup.signature !== "string") {
								throw new Error("Invalid backup.");
							}
						} catch (err) {
							error = "Invalid backup file: Invalid password or corrupted file.";
						}
						if (!error) {
							let signature = "$BACKUP$NATIVE$ENCRYPTED$";
							if (backup.signature.substr(0, signature.length) === signature) {
								App.dam.restoreBackup(backup.directories, backup.files);
								App.logServerAction(context.user.id, 'Restore Backup | ' + backup.signature +
									" | " + (new Date(backup.time)).toString());
								App.logServerAction(context.user.id, 'Exit due to backup restore.');
								let buf = '';
								buf += '<html><head><title>Process Exited</title></head><body><p>Backup Completed.' +
									' The application exits sucessfully.</p><a href=""><button>Refresh Page</button></a></body></html>';
								context.response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
								context.response.end(buf);
								console.log("Backup Completed | Exit via server, By: " + context.user.id);
								process.exit(0);
							} else {
								error = "Invalid backup file: Invalid signature.";
							}
						}
					}
				}
			}
		}

		let htmlVars = {};
		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += backupsTemplate.make(htmlVars);

		context.endWithWebPage(html, { title: "Develoment Tools - Showdown ChatBot" });
	}

	/* Auxiliar Functions */
	function tryGetRoomTitle(room) {
		if (App.bot.rooms[room]) {
			return App.bot.rooms[room].title || room;
		} else {
			return room;
		}
	}


	/**
	 * Encrypts a text
	 * @param {String} text
	 * @param {String} algorithm
	 * @param {String} password
	 * @returns {String} Encrypted text
	 */
	function encrypt(text, algorithm, password) {
		const iv = Buffer.from(Crypto.randomBytes(16));
		const hash = Crypto.createHash('sha256');
		hash.update(password);
		let cipher = Crypto.createCipheriv(algorithm, hash.digest(), iv);
		let crypted = cipher.update(text, 'utf8', 'hex');
		crypted += cipher.final('hex');
		return iv.toString("hex") + ":" + crypted;
	}

	/**
	 * Decrypts a text
	 * @param {String} text - Encrypted text
	 * @param {String} algorithm
	 * @param {String} password
	 * @returns {String} Decrypted text
	 */
	function decrypt(text, algorithm, password) {
		console.log("Text: " + text);
		if (text.indexOf(":") === -1) {
			let decipher = Crypto.createDecipher(algorithm, password);
			let data = decipher.update(text, 'hex', 'utf8');
			data += decipher.final('utf8');
			return data;
		} else {
			const parts = text.split(":");
			const iv = Buffer.from(parts[0], 'hex');
			const hash = Crypto.createHash('sha256');
			hash.update(password);
			let decipher = Crypto.createDecipheriv(algorithm, hash.digest(), iv);
			let data = decipher.update(parts[1], 'hex', 'utf8');
			data += decipher.final('utf8');
			return data;
		}
	}
};
