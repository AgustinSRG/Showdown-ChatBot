/**
 * Showdown ChatBot Control Panel Server
 */

'use strict';

const Max_Request_Flood = 100;
const Flood_Interval = 30 * 1000;
const Token_Max_Duration = 24 * 60 * 60 * 1000;

const Path = require('path');
const Url = require('url');
const Http = require('http');
const Https = require('https');
const FileSystem = require('fs');
const QueryString = require('querystring');

const Static = Tools.get('server-static.js');
const DataBase = Tools.get('crypto-json.js');
const AbuseMonitor = Tools.get('abuse-monitor.js');
const Text = Tools.get('text.js');

const PageMaker = require(Path.resolve(__dirname, 'html-maker.js'));

class Server {
	/**
	 * @param path Existing directory where all server configuration is stored
	 * @param config Configuration object (port, bindaddress, https, httpsPort)
	 */
	constructor(path, config) {
		/* Http server */
		this.http = new Http.Server(this.requestHandler.bind(this));
		this.httpOptions = {
			port: config.port,
			bindaddress: config.bindaddress,
		};
		this.http.on('error', error => {
			App.reportCrash(error);
		});

		/* Https */
		this.https = null;
		this.httpsOptions = {};
		if (config.https) {
			this.httpsOptions = {
				port: config.httpsPort,
				bindaddress: config.bindaddress,
			};
			try {
				this.https = new Https.Server({key: FileSystem.readFileSync(Path.resolve(path, 'ssl-key.pem')),
					cert: FileSystem.readFileSync(Path.resolve(path, 'ssl-cert.pem'))}, this.requestHandler.bind(this));
			} catch (err) {
				console.log('Could not create a ssl server. Missing key and certificate.');
			}
			if (this.https) {
				this.https.on('error', error => {
					App.reportCrash(error);
				});
			}
		}

		/* Server abuse monitor */
		this.monitor = new AbuseMonitor(Max_Request_Flood, Flood_Interval);
		this.monitor.on('lock', (user, msg) => {
			App.log('[SERVER - ABUSE] [LOCK: ' + user + '] ' + msg);
		});
		this.monitor.on('unlock', user => {
			App.log('[SERVER - ABUSE] [UNLOCK: ' + user + ']');
		});
		this.permissions = {
			root: {desc: "Full access permission"},
		};

		/* User database */
		if (!FileSystem.existsSync(Path.resolve(path, 'users.key'))) {
			FileSystem.writeFileSync(Path.resolve(path, 'users.key'), Text.randomToken(20));
		}
		this.userdb = new DataBase(Path.resolve(path, 'users.crypto'), FileSystem.readFileSync(Path.resolve(path, 'users.key')).toString());
		this.users = this.userdb.data;
		if (Object.keys(this.users).length === 0) {
			console.log('Users Database empty. Creating initial admin account');
			this.users['admin'] = {
				id: 'admin',
				password: 'admin',
				name: 'Admin',
				group: 'Administrator',
				permissions: {root: true},
			};
		}

		/* Other initial values */
		this.tokens = {};
		this.menu = {};
		this.handlers = {};
	}

	/**
	 * Sets a permission
	 *
	 * @param id Permission ID
	 * @param desc Permission description
	 */
	setPermission(id, desc) {
		this.permissions[id] = {desc: desc};
	}

	/**
	 * Adds a option to the server menu
	 *
	 * @param id Option ID
	 * @param name Option name (It will be shown as literal)
	 * @param url Href for the menu option
	 * @param permission Permission required to view the option
	 */
	setMenuOption(id, name, url, permission) {
		this.menu[id] = {name: name, url: url, permission: permission};
	}

	/**
	 * Sets a server handler
	 *
	 * @param id url sub-path where the handler works
	 * @param func Function (RequestContext, url_parts)
	 */
	setHandler(id, func) {
		this.handlers[id] = func;
	}

	/**
	 * Gets the available menu options in the context
	 *
	 * @param context An instance of RequestContext
	 * @param selected ID of selected option
	 */
	getMenu(context, selected) {
		let ret = [];
		for (let i in this.menu) {
			if (!this.menu[i].permission || (context.user && context.user.can(this.menu[i].permission))) {
				ret.push({name: this.menu[i].name, url: this.menu[i].url, selected: (selected === i)});
			}
		}
		ret = ret.sort((a, b) => {
			return a.name.localeCompare(b.name);
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
	 *
	 * @param userid User ID
	 */
	makeToken(userid) {
		let token;
		do {
			token = Text.randomToken(12);
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
	 *
	 * @param context An instance of RequestContext
	 */
	applyLogin(context) {
		let token = context.cookies['usertoken'];
		let user = context.post.user;
		let pass = context.post.password;
		this.sweepTokens();
		if (token && this.tokens[token]) {
			if (context.post.logout) {
				App.log('[LOGOUT] Userid: ' + this.tokens[token].user + ' | IP: ' + context.ip);
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
			user = Text.toId(user);
			if (this.users[user] && this.users[user].password === pass) {
				App.log('[LOGIN] Userid: ' + user + ' | IP: ' + context.ip);
				token = this.makeToken(user);
				context.setCookie('usertoken=' + token + ';');
				user = new User(this.users[user]);
				context.setUser(user);
			} else {
				App.log('[INVALID PASSWORD] Userid: ' + user + ' | IP: ' + context.ip);
				context.setInvalidLogin(user);
			}
		}
	}

	/**
	 * Gets the request IP Address
	 *
	 * @param request An instance of ClientRequest
	 */
	getIP(request) {
		let ip = request.connection.remoteAddress;
		if (App.config.useproxy && request.headers['x-forwarded-for']) {
			ip = request.headers['x-forwarded-for'].split(',')[0];
		}
		return ip;
	}

	/**
	 * Handler for server requests
	 *
	 * @param request An instance of ClientRequest
	 * @param response An instance of ServerResponse
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
		let context = new RequestContext(request, response, ip);
		context.resolveVars(function () {
			this.applyLogin(context);
			try {
				this.serve(context);
			} catch (error) {
				App.reportCrash(error);
				context.endWithError(500, 'Internal Server Error', 'Error: ' + error.code + " (" + error.message + ")");
			}
		}.bind(this));
	}

	/**
	 * Selects the server handler and ends the request
	 *
	 * @param context An instance of RequestContext
	 */
	serve(context) {
		if (context.url.path in {'/favicon.ico': 1, 'favicon.ico': 1}) {
			/* Favicon.ico */
			context.endWithStaticFile(Path.resolve(__dirname, '../../favicon.ico'));
		} else if (!context.url.path || context.url.path === '/') {
			/* Main page */
			context.setMenu(this.getMenu(context));
			FileSystem.readFile(Path.resolve(__dirname, 'main.html'), (error, data) => {
				if (error) {
					context.endWithError(500, 'Internal Server Error', 'Error: ' + error.code + " (" + error.message + ")");
				} else {
					context.endWithWebPage(data.toString(), {title: "Showdown ChatBot - Control Panel"});
				}
			});
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
					App.reportCrash(error);
					context.endWithError(500, 'Internal Server Error', 'Error: ' + error.code + " (" + error.message + ")");
				}
			} else {
				context.endWith404();
			}
		}
	}

	/**
	 * Runs The server
	 *
	 * @param callback Function (error)
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
 *
 * @param request An instance of ClientRequest
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

class User {
	/**
	 * @param config Configuration object (id, name, group, permissions)
	 */
	constructor(config) {
		this.id = config.id;
		this.name = config.name;
		this.group = config.group;
		this.permissions = config.permissions;
	}

	/*
	 * Returns true if the user has the permission, false if not
	 *
	 * @param permission The permission to check
	 */
	can(permission) {
		if (this.permissions['root'] || this.permissions[permission]) {
			return true;
		} else {
			return false;
		}
	}
}

class RequestContext {
	/**
	 * @param request An instance of ClientRequest
	 * @param response An instance of ServerResponse
	 * @param ip The IP address of the client request
	 */
	constructor(request, response, ip) {
		this.request = request;
		this.response = response;
		this.user = null;
		this.url = Url.parse(request.url);
		this.menu = [];
		this.ip = (ip || request.connection.remoteAddress);
		this.headers = {};
		this.invalidLogin = false;
		this.get = {};
		this.post = {};
		this.cookies = {};
	}

	/**
	 * Resolves cookies, post and get vars
	 *
	 * @param callback Function called when all vars are resolved
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
				body += data;
				if (body.length > 1e6) this.request.connection.destroy();
			}.bind(this));
			this.request.on('end', function () {
				this.post = QueryString.parse(body);
				/* Transform POST to string */
				for (let key in this.post) {
					if (typeof this.post[key] !== 'string') {
						this.post[key] = JSON.stringify(this.post[key]);
					}
				}
				if (typeof callback === "function") return callback();
			}.bind(this));
			return;
		}
		if (typeof callback === "function") return callback();
	}

	/**
	 * Sets the logged user
	 *
	 * @param user User ID
	 */
	setUser(user) {
		this.user = user;
	}

	/**
	 * Set the cookie in the headers
	 *
	 * @param txt Cookie query string
	 */
	setCookie(txt) {
		this.headers['Set-Cookie'] = txt + ' Path=/';
	}

	/**
	 * Sets the menu
	 *
	 * @param menu Array of menu options (name, url, selected)
	 */
	setMenu(menu) {
		this.menu = menu;
	}

	/**
	 * Informs that the login credentials were wrong
	 *
	 * @param user User ID
	 */
	setInvalidLogin(user) {
		this.invalidLogin = user;
	}

	/**
	 * Sends a html page to the client
	 *
	 * @param html HTML string to send
	 * @param code Response code (200 by default)
	 */
	endWithHtml(html, code) {
		this.headers['Content-Type'] = 'text/html; charset=utf-8';
		this.response.writeHead(code || 200, this.headers);
		this.response.end(html);
	}

	/**
	 * Sends a plain text to the client
	 *
	 * @param text String to be sent
	 * @param code Response code (200 by default)
	 */
	endWithText(text, code) {
		this.headers['Content-Type'] = 'text/plain; charset=utf-8';
		this.response.writeHead(code || 200, this.headers);
		this.response.end(text);
	}

	/**
	 * Sends a pre-formated html page to the client
	 *
	 * @param html body string to send
	 * @param options Options object (title, scripts)
	 * @param code Response code (200 by default)
	 */
	endWithWebPage(body, options, code) {
		let loginData = {};
		if (this.user) {
			loginData.name = this.user.name;
			loginData.group = this.user.group;
		} else {
			loginData.invalid = this.invalidLogin;
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
		this.endWithWebPage(html, {title: "Page not found"}, 404);
	}

	/**
	 * Sends an error page to the client (403 - Forbidden)
	 */
	endWith403() {
		let html = '';
		html += '<h1>Error 403</h1>';
		html += '<p>You have not permission to access this feature!</p>';
		this.endWithWebPage(html, {title: "Forbidden"}, 403);
	}

	/**
	 * Sends an static file to the client
	 *
	 * @param file Complete path of the requested file
	 */
	endWithStaticFile(file) {
		Static.serveFile(file, this.request, this.response);
	}

	/**
	 * Sends an error page to the client
	 *
	 * @param errcode Error Code
	 * @param title Page Title
	 * @param msg Error message
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
