/**
 * Showdown ChatBot Control Panel Server
 * Showdown ChatBot is distributed under the terms of the MIT License
 * (https://github.com/asanrom/Showdown-ChatBot/blob/master/LICENSE)
 *
 * This file handles with the control pannel,
 * the main method to configure the bot and accesing
 * the information (lists, leaderboards, etc)
 */

'use strict';

const Max_Request_Flood = 100;
const Flood_Interval = 30 * 1000;
const Lock_Max_Duration = 24 * 60 * 60 * 1000;
const Token_Max_Duration = 24 * 60 * 60 * 1000;
const Encrypt_Algo = "aes-256-ctr";
const Max_Body_Request_Size = 5 * 1024 * 1024;
const Max_Login_Flood = 5;
const Login_Flood_Interval = 15 * 1000;
const Login_Lock_Max_Duration = 1 * 60 * 60 * 1000;

const Path = require('path');
const Url = require('url');
const Http = require('http');
const Https = require('https');
const WebSocketServer = require('websocket').server;
const FileSystem = require('fs');
const QueryString = require('querystring');
const Crypto = require('crypto');
const Stream = require('stream');
const Busboy = require('busboy');

const Static = Tools('server-static');
const AbuseMonitor = Tools('abuse-monitor');
const Text = Tools('text');

const PageMaker = require(Path.resolve(__dirname, 'html-maker.js'));

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

/**
 * Represents the Showdown ChatBot control panel server
 */
class Server {
	/**
	 * @param {Path} path - Existing directory where all server configuration is stored
	 * @param {ChatBotApp} app - Application that uses this control panel
	 */
	constructor(path, app) {
		let config = app.config.server;
		this.app = app;
		/* Http server */
		this.http = new Http.Server(this.requestHandler.bind(this));
		this.httpOptions = {
			port: config.port,
			bindaddress: config.bindaddress,
		};
		this.http.on('error', function (error) {
			this.app.log("[SERVER] HTTP ERROR - " + error.code + ":" + error.message);
		}.bind(this));

		/* WS */
		this.websoketHandlers = [];
		this.ws = new WebSocketServer({
			httpServer: this.http, autoAcceptConnections: false, maxReceivedFrameSize: 10 * 1024,
			maxReceivedMessageSize: 10 * 1024
		});
		this.ws.on('request', function (request) {
			const req = request.httpRequest;
			const ip = this.getIP(req);
			if (ip) {
				if (this.monitor.isLocked(ip)) {
					req.connection.destroy();
					return;
				}
				this.monitor.count(ip);
			}
			try {
				const ws = request.accept();
				for (let handler of this.websoketHandlers) {
					try {
						if (handler(ws, req)) {
							return; // Handled
						}
					} catch (err) {
						this.app.reportCrash(err);
					}
				}
				ws.close();
			} catch (ex) {
				req.connection.destroy();
			}
		}.bind(this));

		/* Https */
		this.https = null;
		this.httpsOptions = {};
		if (config.https) {
			let sslkey = Path.resolve(app.appDir, config.sslkey);
			let sslcert = Path.resolve(app.appDir, config.sslcert);
			if (sslkey && sslcert) {
				if (app.env.sslkey !== undefined) {
					sslkey = app.env.sslkey;
				}
				if (app.env.sslcert !== undefined) {
					sslcert = app.env.sslcert;
				}
				this.httpsOptions = {
					port: config.httpsPort,
					bindaddress: config.bindaddress,
				};
				try {
					this.https = new Https.Server({
						key: FileSystem.readFileSync(sslkey),
						cert: FileSystem.readFileSync(sslcert)
					}, this.requestHandler.bind(this));
				} catch (err) {
					console.log('Could not create a ssl server. Missing key and certificate.');
				}
				if (this.https) {
					this.https.on('error', function (error) {
						this.app.log("[SERVER] HTTPS ERROR - " + error.code + ":" + error.message);
					}.bind(this));

					this.wss = new WebSocketServer({
						httpServer: this.https, autoAcceptConnections: false, maxReceivedFrameSize: 10 * 1024,
						maxReceivedMessageSize: 10 * 1024
					});
					this.wss.on('request', function (request) {
						const req = request.httpRequest;
						const ip = this.getIP(req);
						if (ip) {
							if (this.monitor.isLocked(ip)) {
								req.connection.destroy();
								return;
							}
							this.monitor.count(ip);
						}
						try {
							const ws = request.accept();
							for (let handler of this.websoketHandlers) {
								try {
									if (handler(ws, req)) {
										return; // Handled
									}
								} catch (err) {
									this.app.reportCrash(err);
								}
							}
							ws.close();
						} catch (ex) {
							req.connection.destroy();
						}
					}.bind(this));
				}
			} else {
				console.log('Could not create a ssl server. Missing key and certificate.');
			}
		}

		/* Server abuse monitor */
		this.monitor = new AbuseMonitor(Max_Request_Flood, Flood_Interval, Lock_Max_Duration);
		this.monitor.on('lock', function (user, msg) {
			this.app.log('[SERVER - ABUSE] [LOCK: ' + user + '] ' + msg);
		}.bind(this));
		this.monitor.on('unlock', function (user) {
			this.app.log('[SERVER - ABUSE] [UNLOCK: ' + user + ']');
		}.bind(this));
		this.permissions = {
			root: { desc: "Full access permission" },
		};

		/* Password abuse monitor */
		this.loginMonitor = new AbuseMonitor(Max_Login_Flood, Login_Flood_Interval, Login_Lock_Max_Duration);
		this.loginMonitor.on('lock', function (user, msg) {
			this.app.log('[SERVER - LOGIN ABUSE] [LOCK: ' + user + '] ' + msg);
		}.bind(this));
		this.loginMonitor.on('unlock', function (user) {
			this.app.log('[SERVER - LOGIN ABUSE] [UNLOCK: ' + user + ']');
		}.bind(this));

		/* User database */
		try {
			this.privatekey = app.dam.getFileContent('users.key');
		} catch (err) {
			this.privatekey = Text.randomToken(20);
			app.dam.setFileContent('users.key', this.privatekey);
		}
		this.userdb = app.dam.getDataBase('users.crypto', { crypto: true, key: this.privatekey });
		this.users = this.userdb.data;
		if (Object.keys(this.users).length === 0) {
			console.log('Users Database empty. Creating initial admin account');
			this.users['admin'] = {
				id: 'admin',
				password: 'admin',
				name: 'Admin',
				group: 'Administrator',
				permissions: { root: true },
			};
		}
		if (app.env && app.env.config && app.env.config.Static_Admin_Account) {
			let account = Text.toId(app.env.config.Static_Admin_Account);
			if (!this.users[account]) {
				this.users[account] = {
					id: account,
					password: app.env.config.Static_Admin_Account_Password,
					name: app.env.config.Static_Admin_Account,
					group: 'Administrator',
					permissions: { root: true },
				};
			}
		}

		let usersChange = false;
		for (let user in this.users) {
			if (typeof this.users[user].password === "string") {
				this.users[user].password = this.encryptPassword(this.users[user].password);
				usersChange = true;
			}
		}
		if (usersChange) {
			this.userdb.write();
		}

		/* Other initial values */
		this.tokens = {};
		this.menu = {};
		this.handlers = {};
	}

	/**
	 * Sets a permission
	 * @param {String} id - Permission ID
	 * @param {String} desc - Permission description
	 */
	setPermission(id, desc) {
		this.permissions[id] = { desc: desc };
	}

	/**
	 * @param {String} id
	 */
	removePermission(id) {
		delete this.permissions[id];
	}

	/**
	 * Adds a option to the server menu
	 * @param {String} id - Option ID
	 * @param {String} name - Option name (It will be shown as literal)
	 * @param {String} url - Href for the menu option
	 * @param {String} permission - Permission required to view the option
	 * @param {Number} level - Option level (higher for important options, lower for modules)
	 */
	setMenuOption(id, name, url, permission, level) {
		if (level === undefined) level = -10;
		this.menu[id] = { name: name, url: url, permission: permission, level: level };
	}

	/**
	 * @param {String} id
	 */
	removeMenuOption(id) {
		delete this.menu[id];
	}

	/**
	 * Sets a server handler
	 * @param {String} id - url sub-path where the handler works
	 * @param {function(RequestContext, Array<String>)} func
	 */
	setHandler(id, func) {
		this.handlers[id] = func;
	}

	/**
	 * @param {String} id
	 */
	removeHandler(id) {
		delete this.handlers[id];
	}

	/**
	 * Gets the available menu options in the context
	 * @param {RequestContext} context
	 * @param {String} selected - ID of selected option
	 * @returns {Array<Object>}
	 */
	getMenu(context, selected) {
		let menu = {};
		for (let i in this.menu) {
			if (!context || !this.menu[i].permission || (context.user && context.user.can(this.menu[i].permission))) {
				let level = this.menu[i].level || 0;
				if (this.app.config.menuOrder[i] !== undefined) {
					level = this.app.config.menuOrder[i];
				}
				if (!menu[level]) menu[level] = [];
				menu[level].push({ name: this.menu[i].name, url: this.menu[i].url, selected: (selected === i) });
			}
		}
		let ret = [];
		for (let level in menu) {
			menu[level] = menu[level].sort((a, b) => {
				return a.name.localeCompare(b.name);
			});
			ret.push({ level: parseInt(level), menu: menu[level] });
		}
		ret = ret.sort((a, b) => {
			if (a.level >= b.level) {
				return -1;
			} else {
				return 1;
			}
		});
		if (ret.length) {
			return ret;
		} else {
			return null;
		}
	}

	/**
	 * Removes the outdated tokens
	 */
	sweepTokens() {
		for (let i in this.tokens) {
			if (Date.now() - this.tokens[i].date > this.tokens[i].duration) {
				delete this.tokens[i];
			}
		}
	}

	/**
	 * Returns a token for a new session
	 * @param {String} userid - User ID
	 * @returns {String} token
	 */
	makeToken(userid) {
		const ENC = {
			'+': '-',
			'/': '_',
			'=': '.'
		};
		let token;
		do {
			token = Crypto.randomBytes(32).toString("base64").replace(/[+/=]/g, m => ENC[m]);
		} while (this.tokens[token]);
		this.tokens[token] = {
			date: Date.now(),
			duration: Token_Max_Duration,
			user: userid,
		};
		return token;
	}

	/**
	 * Generates the login data for the context
	 * @param {RequestContext} context
	 */
	applyLogin(context) {
		//console.log(JSON.stringify(context.request.headers));
		let token = ((context.request.method + "").toUpperCase() === "GET") ? context.cookies['usertoken'] : (context.request.headers["x-csrf-token"] || context.post["x-csrf-token"]);
		let user = context.post.user;
		let pass = context.post.password;
		this.sweepTokens();
		if (token && this.tokens[token]) {
			if (context.post.logout) {
				this.app.log('[LOGOUT] Userid: ' + this.tokens[token].user + ' | IP: ' + context.ip);
				delete this.tokens[token];
				context.setCookie('usertoken=;');
			} else {
				user = this.tokens[token].user;
				if (this.users[user]) {
					user = new User(this.users[user]);
					context.setUser(user);
				}
			}
		} else if (user && context.post.login) {
			let ip = context.ip;
			if (this.loginMonitor.isLocked(ip)) {
				context.endWithError(403, "Forbidden", "You cannot try to login. You are locked for 60 minutes.");
				return false;
			}
			user = Text.toId(user);
			if (this.users[user] && this.checkPassword(this.users[user].password, pass)) {
				this.app.log('[LOGIN] Userid: ' + user + ' | IP: ' + context.ip);
				token = this.makeToken(user);
				context.setCookie('usertoken=' + token + ';');
				user = new User(this.users[user]);
				context.setUser(user);
			} else {
				this.loginMonitor.count(ip);
				this.app.log('[INVALID PASSWORD] Userid: ' + user + ' | IP: ' + context.ip);
				context.setInvalidLogin(user);
			}
		}
		return true;
	}

	/**
	 * @param {Object|String} pass
	 * @param {String} str
	 * @returns {Boolean}
	 */
	checkPassword(pass, str) {
		if (typeof pass === "object") {
			return (decrypt(pass.hash, pass.encrypted || Encrypt_Algo, str) === this.privatekey);
		} else if (typeof pass === "string") {
			return (str === pass);
		} else {
			return false;
		}
	}

	/**
	 * @param {String} str - Password
	 * @returns {Object} Encrypted password
	 */
	encryptPassword(str) {
		return {
			encrypted: Encrypt_Algo,
			hash: encrypt(this.privatekey, Encrypt_Algo, str),
		};
	}

	/**
	 * Gets the request IP Address
	 * @param {ClientRequest} request
	 * @returns {String} IP
	 */
	getIP(request) {
		let ip = request.connection.remoteAddress;
		if (this.app.config.useproxy && request.headers['x-forwarded-for']) {
			ip = request.headers['x-forwarded-for'].split(',')[0];
		}
		return ip;
	}

	/**
	 * Resolves an absolute URL to the control panel
	 * @param {String} path
	 */
	getControlPanelLink(path) {
		if (!this.app.config.server.url) {
			return "#";
		}
		try {
			let url = new Url.URL(path, this.app.config.server.url);
			return url.toString();
		} catch (ex) {
			this.app.reportCrash(ex);
			return "#";
		}
	}

	getPokeSimLink(path) {
		if (!this.app.config.server.url) {
			return "#";
		}
		try {
			let url = new Url.URL("/", this.app.config.server.url);
			return "http://" + url.hostname + "-" + (url.port || (url.protocol === "https:" ? 443 : 80)) + ".psim.us" + (path || "/");
		} catch (ex) {
			this.app.reportCrash(ex);
			return "#";
		}
	}

	/**
	 * Handler for server requests
	 * @param {ClientRequest} request
	 * @param {ServerResponse} response
	 */
	requestHandler(request, response) {
		let ip = this.getIP(request);
		if (ip) {
			if (this.monitor.isLocked(ip)) {
				request.connection.destroy();
				return;
			}
			this.monitor.count(ip);
		}
		let context = new RequestContext(this, request, response, ip);
		context.resolveVars(function () {
			if (!this.applyLogin(context)) return;
			try {
				this.serve(context);
			} catch (error) {
				this.app.reportCrash(error);
				context.endWithError(500, 'Internal Server Error', 'Error: ' + error.code + " (" + error.message + ")");
			}
		}.bind(this));
	}

	/**
	 * Selects the server handler and ends the request
	 * @param {RequestContext} context
	 */
	serve(context) {
		if (context.url.path in { '/favicon.ico': 1, 'favicon.ico': 1 }) {
			/* Favicon.ico */
			context.endWithStaticFile(Path.resolve(__dirname, '../../favicon.ico'));
		} else if (context.url.path.startsWith("/showdown/info?") || context.url.path.startsWith("/info?")) {
			context.headers["Access-Control-Allow-Origin"] = context.request.headers['Origin'] || context.request.headers['origin'] || "*";
			context.headers["Access-Control-Allow-Credentials"] = "true";
			context.endWithJSON({
				cookie_needed: false,
				entropy: 1858301765,
				origins: ["*:*"],
				websocket: true,
			});
		} else if (!context.url.path || context.url.path === '/') {
			/* Main page */
			context.setMenu(this.getMenu(context));
			if (this.app.config.mainhtml) {
				context.endWithWebPage(this.app.config.mainhtml, { title: "Showdown ChatBot - Control Panel" });
			} else {
				FileSystem.readFile(Path.resolve(__dirname, 'main.html'), (error, data) => {
					if (error) {
						context.endWithError(500, 'Internal Server Error', 'Error: ' + error.code + " (" + error.message + ")");
					} else {
						context.endWithWebPage(data.toString(), { title: "Showdown ChatBot - Control Panel" });
					}
				});
			}
		} else {
			/* Handlers */
			let urlParts = context.url.path.split('/');
			if (!urlParts[0] && urlParts.length > 1) {
				urlParts.shift();
			}
			let opt = urlParts.shift();
			context.setMenu(this.getMenu(context, opt));
			if (typeof this.handlers[opt] === 'function') {
				try {
					this.handlers[opt](context, urlParts);
				} catch (error) {
					this.app.reportCrash(error);
					context.endWithError(500, 'Internal Server Error', 'Error: ' + error.code + " (" + error.message + ")");
				}
			} else {
				context.endWith404();
			}
		}
	}

	/**
	 * Runs The server
	 * @param {function(Error)} callback
	 */
	listen(callback) {
		if (typeof callback === 'function') {
			this.http.on('listening', () => {
				console.log("Server lstening at http://" +
					(this.httpOptions.bindaddress ? this.httpOptions.bindaddress : "localhost") + ":" + this.httpOptions.port);
				callback();
			});
			this.http.on('error', err => {
				callback(err);
			});
		}
		this.http.listen(this.httpOptions.port, this.httpOptions.bindaddress);
		if (this.https) {
			this.https.on('listening', () => {
				console.log("Server lstening at https://" +
					(this.httpsOptions.bindaddress ? this.httpsOptions.bindaddress : "localhost") + ":" + this.httpsOptions.port);
			});
			this.https.listen(this.httpsOptions.port, this.httpsOptions.bindaddress);
		}
	}
}

/**
 * Returns the cookies object of a request
 * @param {ClientRequest} request
 * @returns {Object} parsed cookies
 */
function parseCookies(request) {
	let list = {}, rc = request.headers.cookie;
	if (rc) {
		rc.split(';').forEach(function (cookie) {
			let parts = cookie.split('=');
			list[parts.shift().trim()] = decodeURI(parts.join('='));
		});
	}
	return list;
}

/**
 * Represents a register user of Showdown ChatBot control panel
 */
class User {
	/**
	 * @param {Object} config - Configuration object (id, name, group, permissions)
	 */
	constructor(config) {
		this.id = config.id;
		this.name = config.name;
		this.group = config.group;
		this.permissions = config.permissions;
	}

	/**
	 * Returns true if the user has the permission, false if not
	 * @param {String} permission
	 * @returns {Boolean}
	 */
	can(permission) {
		if (this.permissions['root'] || this.permissions[permission]) {
			return true;
		} else {
			return false;
		}
	}
}

/**
 * Represents the circumstances where a server request is handled
 */
class RequestContext {
	/**
	 * @param {Server} server
	 * @param {ClientRequest} request
	 * @param {ServerResponse} response
	 * @param {String} ip - The IP address of the client request
	 */
	constructor(server, request, response, ip) {
		this.server = server;
		this.request = request;
		this.response = response;
		this.user = null;
		this.url = Url.parse(request.url);
		this.menu = [];
		this.ip = (ip || request.connection.remoteAddress);
		this.headers = { 'X-XSS-Protection': 0 };
		this.invalidLogin = false;
		this.get = {};
		this.post = {};
		this.cookies = {};
	}

	/**
	 * Resolves COOKIES, POST and GET vars
	 * @param {function} callback - called when all vars are resolved
	 */
	resolveVars(callback) {
		this.cookies = parseCookies(this.request);
		/* Transform COOKIES to string */
		for (let key in this.cookies) {
			if (typeof this.cookies[key] !== 'string') {
				this.cookies[key] = JSON.stringify(this.cookies[key]);
			}
		}
		this.get = QueryString.parse(this.url.query);
		/* Transform GET to string */
		for (let key in this.get) {
			if (typeof this.get[key] !== 'string') {
				this.get[key] = JSON.stringify(this.get[key]);
			}
		}
		if (this.request.method === 'POST') {
			let body = '';
			this.request.on('data', function (data) {
				if ((body.length + data.length) > Max_Body_Request_Size) {
					this.request.connection.destroy();
					return;
				}
				body += data;
			}.bind(this));
			this.request.on('end', function () {
				let busboy = null;
				try {
					busboy = new Busboy({ headers: this.request.headers });
				} catch (err) { }
				if (busboy) {
					let files = this.files = {};
					let post = this.post = {};
					busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
						files[fieldname] = {
							name: filename,
							encoding: encoding,
							mimetype: mimetype,
							data: "",
						};
						file.on('data', function (data) {
							files[fieldname].data += data;
						});
					});
					busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
						post[fieldname] = "" + val;
					});
					busboy.on('finish', function () {
						if (typeof callback === "function") return callback();
					});
					let stream = new Stream.PassThrough();
					stream.write(body);
					stream.pipe(busboy);
					stream.end();
				} else {
					this.post = QueryString.parse(body);
					this.files = {};
					/* Transform POST to string */
					for (let key in this.post) {
						if (typeof this.post[key] !== 'string') {
							this.post[key] = JSON.stringify(this.post[key]);
						}
					}
					if (typeof callback === "function") return callback();
				}
			}.bind(this));
			return;
		}
		if (typeof callback === "function") return callback();
	}

	/**
	 * Sets the logged user
	 * @param {String} user - User ID
	 */
	setUser(user) {
		this.user = user;
	}

	/**
	 * Set the cookie in the headers
	 * @param {String} txt - Cookie query string
	 */
	setCookie(txt) {
		this.headers['Set-Cookie'] = txt + ' Path=/';
	}

	/**
	 * Sets the menu
	 * @param {Array<Object>} menu - Array of menu options (name, url, selected)
	 */
	setMenu(menu) {
		this.menu = menu;
	}

	/**
	 * Informs that the login credentials were wrong
	 * @param {String} user - User ID
	 */
	setInvalidLogin(user) {
		this.invalidLogin = user;
	}

	/**
	 * Sends a html page to the client
	 * @param {String} html - HTML string to send
	 * @param {Number|String} code - Response code (200 by default)
	 */
	endWithHtml(html, code) {
		this.headers['Content-Type'] = 'text/html; charset=utf-8';
		this.response.writeHead(code || 200, this.headers);
		this.response.end(html);
	}

	/**
	 * Sends a plain text to the client
	 * @param {String} text - String to be sent
	 * @param {Number|String} code - Response code (200 by default)
	 */
	endWithText(text, code) {
		this.headers['Content-Type'] = 'text/plain; charset=utf-8';
		this.response.writeHead(code || 200, this.headers);
		this.response.end(text);
	}

	endWithJSON(json, code) {
		this.headers['Content-Type'] = 'application/json; charset=utf-8';
		this.response.writeHead(code || 200, this.headers);
		this.response.end(JSON.stringify(json));
	}

	/**
	 * Sends a pre-formated html page to the client
	 * @param {String} body
	 * @param {Object} options - Options object (title, scripts)
	 * @param {Number|String} code - Response code (200 by default)
	 */
	endWithWebPage(body, options, code) {
		let loginData = {};
		if (this.user) {
			loginData.name = this.user.name;
			loginData.group = this.user.group;
		} else {
			loginData.invalid = this.invalidLogin;
		}
		if (!options.banner) {
			options.banner = this.server.app.config.apptitle;
		}
		if (!options.package) {
			options.package = this.server.app.env.package;
		}
		let html = PageMaker.generate(body, loginData, this.menu, options);
		this.headers['Content-Type'] = 'text/html; charset=utf-8';
		this.response.writeHead(code || 200, this.headers);
		this.response.end(html);
	}

	/**
	 * Sends an error page to the client (404 - Not found)
	 */
	endWith404() {
		let html = '';
		html += '<h1>Error 404</h1>';
		html += '<p>The page you requested was not found!</p>';
		this.endWithWebPage(html, { title: "Page not found" }, 404);
	}

	/**
	 * Sends an error page to the client (403 - Forbidden)
	 */
	endWith403() {
		let html = '';
		html += '<h1>Error 403</h1>';
		html += '<p>You have not permission to access this feature!</p>';
		this.endWithWebPage(html, { title: "Forbidden" }, 403);
	}

	/**
	 * Sends an static file to the client
	 * @param {Path} file - Complete path of the requested file
	 */
	endWithStaticFile(file) {
		Static.serveFile(file, this.request, this.response);
	}

	/**
	 * Sends an error page to the client
	 * @param {Number|String} errcode - Error Code
	 * @param {String} title - Page Title
	 * @param {String} msg - Error description
	 */
	endWithError(errcode, title, msg) {
		let html = "";
		html += '<!DOCTYPE html>\n';
		html += '<title>' + title + '</title>';
		html += '<h1>Error ' + errcode + '</h1>';
		html += '<p>' + msg + '</p>';
		this.headers['Content-Type'] = 'text/html; charset=utf-8';
		this.response.writeHead(errcode, this.headers);
		this.response.end(html);
	}
}

exports.Server = Server;
exports.RequestContext = RequestContext;
