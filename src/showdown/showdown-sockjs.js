/**
 * Pokemon Showdown Basic Bot
 * Author: Agustin San Roman (C) Copyright 2016
 *
 * This library is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this library.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

const Text = Tools('text');
const Events = Tools('events');
const Util = require('util');
const Url = require('url');
const SockJS = require('sockjs-client');
const Https = require('https');

const Message_Sent_Delay = 2000; // Delay in order to avoid losing messages because of anti-flood system
const Default_Room = "lobby"; // If the server sends a message without specifying the room

const Default_Login_Server = "play.pokemonshowdown.com";
const Default_Server_Id = "showdown";
const Default_Retry_Delay = 10 * 1000;
const Max_Lines_Default = 3;

/**
 * Represents a Pokemon Showdown Bot
 */
class Bot {
	/**
	 * @param {String} server - The Pokemon Showdown sever to connect
	 * @param {Number} port
	 * @param {String} loginServer - Default: play.pokemonshowdown.com
	 * @param {Number} maxLinesSend - Pokemon Showdown server lines per message restriction
	 * @param {Boolean} connectionRetry - true for retrying the connectio on disconnect
	 * @param {Number} connectionRetryDelay - miliseconds to wait before retrying the connection
	 */
	constructor(server, port, serverId, loginServer, maxLinesSend, connectionRetry, connectionRetryDelay, secure) {
		this.server = server;
		this.port = port;
		this.secure = !!secure;

		this.loginOptions = {};
		this.loginOptions.serverId = serverId;
		this.loginOptions.loginServer = loginServer;
		this.loginUrl = {
			loginServer: (this.loginOptions.loginServer || Default_Login_Server),
			serverId: (this.loginOptions.serverId || Default_Server_Id),
		};

		this.maxLinesSend = maxLinesSend || Max_Lines_Default;

		this.socket = null;
		this.connecting = false;
		this.conntime = 0;
		this.closed = false;
		this.status = new BotStatus();
		this.events = new Events();
		this.events.setMaxListeners(50);

		this.rooms = {};
		this.formats = {};

		this.sending = {};
		this.nextSend = 0;

		this.connectionRetryTimer = null;

		this.errOptions = {};
		this.errOptions.retryDelay = connectionRetryDelay;

		if (connectionRetry) {
			this.on('connectFailed', function () {
				if (this.closed || this.connecting || this.status.connected) return;
				this.retryConnect(this.errOptions.retryDelay || Default_Retry_Delay);
			}.bind(this));
			this.on('disconnect', function () {
				if (this.closed || this.connecting || this.status.connected) return;
				this.retryConnect(this.errOptions.retryDelay || Default_Retry_Delay);
			}.bind(this));
		}
	}

	/* Getters */

	/**
	 * @returns {Boolean} Check if the bot is connected to the server
	 */
	isConnected() {
		return this.status.connected || false;
	}

	/**
	 * @returns {String} The bot nicknsme
	 */
	getBotNick() {
		return this.status.nick || "";
	}

	/**
	 * @returns {Object} Formats data received from the Pokemon Showdown Server
	 */
	getFormats() {
		return this.formats || {};
	}

	/**
	 * @param {String} user
	 * @param {String} room
	 * @returns {String} The user group (symbol)
	 */
	getUserGroup(user, room) {
		user = Text.toId(user);
		if (!this.rooms[room]) return null;
		if (!this.rooms[room].users[user]) return {offline: true};
		return {group: this.rooms[room].users[user]};
	}

	/**
	 * @returns {String} The websocket url to connect
	 */
	getConnectionUrl() {
		return Util.format("%s://%s:%d/showdown/", this.secure ? "https" : "http", this.server, this.port);
	}

	/**
	 * @returns {String} The login server url
	 */
	getLoginUrl() {
		return Util.format("https://%s/~~%s/action.php",
			this.loginUrl.loginServer, this.loginUrl.serverId);
	}

	/* Setters */

	/**
	 * @param {Object} loginOptions
	 */
	setLoginOptions(loginOptions) {
		this.loginOptions = loginOptions || null;
		this.loginUrl = {
			loginServer: (loginOptions ? (loginOptions.loginServer || Default_Login_Server) : Default_Login_Server),
			serverId: (loginOptions ? (loginOptions.serverId || "showdown") : "showdown"),
		};
	}

	reset() {
		if (this.connectionRetryTimer) {
			clearTimeout(this.connectionRetryTimer);
			this.connectionRetryTimer = null;
		}
		if (this.loginRetryTimer) {
			clearTimeout(this.loginRetryTimer);
			this.loginRetryTimer = null;
		}
		for (let k in this.sending) {
			this.sending[k].kill();
			delete this.sending[k];
		}
		this.nextSend = 0;
		this.rooms = {};
		this.conntime = 0;
		this.status.onDisconnect();
	}

	/* Events */

	/**
	 * @param {String} event
	 * @param {function} handler
	 */
	on(event, handler) {
		this.events.on(event, handler);
	}

	/**
	 * @param {String} event
	 * @param {function} handler
	 */
	removeListener(event, handler) {
		this.events.removeListener(event, handler);
	}

	/* Connection */

	connect() {
		if (this.status.connected || this.socket) return;
		this.closed = false;
		this.reset();
		this.socket = new SockJS(this.getConnectionUrl());
		this.socket.onerror = function () {
			this.connecting = false;
			this.reset();
			if (this.socket) {
				this.socket.close();
				this.socket = null;
			}
			this.events.emit('disconnect');
		}.bind(this);
		this.socket.onopen = function () {
			this.connecting = false;
			this.status.onConnection();
			this.conntime = Date.now();
			this.events.emit('connect', this.socket);
		}.bind(this);
		this.socket.onclose = function (e) {
			if (!this.closed) this.socket = null;
			this.connecting = false;
			this.reset();
			this.events.emit('disconnect', {code: e.code, message: e.reason});
		}.bind(this);
		this.socket.onmessage = function (e) {
			let data = e.data;
			if (typeof data !== "string") {
				data = JSON.stringify(data);
			}
			this.lastMessage = Date.now();
			this.events.emit('message', data);
			this.receive(data);
		}.bind(this);
		this.connecting = true;
		this.events.emit('connecting');
	}

	/**
	 * @param {Number} delay
	 */
	retryConnect(delay) {
		if (this.connectionRetryTimer) {
			clearTimeout(this.connectionRetryTimer);
			this.connectionRetryTimer = null;
		}
		this.connectionRetryTimer = setTimeout(function () {
			if (this.closed) return;
			this.connect();
		}.bind(this), delay);
	}

	reconnect() {
		this.disconnect();
		this.connect();
	}

	disconnect() {
		this.closed = true;
		this.connecting = false;
		this.reset();
		if (this.socket) {
			this.socket.onclose = function (e) {
				this.events.emit('disconnect', {code: e.code, message: e.reason});
			}.bind(this);
			this.socket.close();
			this.socket = null;
		}
	}

	/* Login */

	/**
	 * @param {String} nick
	 * @param {String} pass - Passowrd if needed
	 * @param {funtion(String)} callback - Gets the access token
	 */
	getRename(nick, pass, callback) {
		if (!this.status.challstr) {
			this.events.emit('renamefailure', 'nochallstr', nick, pass);
			return;
		}

		let data = "";
		let url = Url.parse(this.getLoginUrl());
		let requestOptions = {
			hostname: url.hostname,
			port: url.port,
			path: url.pathname,
			agent: false,
		};

		if (!pass) {
			requestOptions.method = 'GET';
			requestOptions.path += '?act=getassertion&userid=' +
				Text.toId(nick) + '&challengekeyid=' + this.status.challstr.id +
				'&challenge=' + this.status.challstr.str;
		} else {
			requestOptions.method = 'POST';
			data = 'act=login&name=' + Text.toId(nick) + '&pass=' + pass +
				'&challengekeyid=' + this.status.challstr.id + '&challenge=' +
				this.status.challstr.str;
			requestOptions.headers = {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': data.length,
			};
		}

		let req = Https.request(requestOptions, function (res) {
			res.setEncoding('utf8');
			let str = '';
			res.on('data', function (chunk) {
				str += chunk;
			});
			res.on('end', function () {
				if (str === ';') {
					this.events.emit('renamefailure', 'wrongpassword', nick, pass);
					return;
				}
				if (str.length < 50) {
					this.events.emit('renamefailure', 'servererror', nick, pass);
					return;
				}
				if (str.includes('heavy load')) {
					this.events.emit('renamefailure', 'heavyload', nick, pass);
					return;
				}
				try {
					str = JSON.parse(str.substr(1));
					if (str.actionsuccess) {
						str = str.assertion;
					} else {
						this.events.emit('renamefailure', 'unknown', nick, pass, JSON.stringify(str));
						return;
					}
				} catch (e) {}
				if (callback) callback.call(this, str);
			}.bind(this));
		}.bind(this));

		req.on('error', function (err) {
			this.events.emit('renamefailure', 'request', nick, pass, err);
		}.bind(this));

		if (data) {
			req.write(data);
		}

		req.end();
	}

	/**
	 * @param {String} nick
	 * @param {String} pass - Passowrd if needed
	 */
	rename(nick, pass) {
		if (Text.toId(this.status.nick) === Text.toId(nick)) {
			this.sendToGlobal('/trn ' + nick);
		} else {
			this.getRename(nick, pass, function (token) {
				if (token) {
					this.sendToGlobal('/trn ' + nick + ',0,' + token);
				}
			}.bind(this));
		}
	}

	/**
	 * @param {Number} delay
	 * @param {String} nick
	 * @param {String} pass - Passowrd if needed
	 */
	retryRename(delay, nick, pass) {
		if (this.loginRetryTimer) {
			clearTimeout(this.loginRetryTimer);
			this.loginRetryTimer = null;
		}
		this.loginRetryTimer = setTimeout(function () {
			this.rename(nick, pass);
		}.bind(this), delay);
	}

	logout() {
		return this.sendToGlobal("/logout");
	}

	/* Sending */

	getSendId() {
		return this.nextSend++;
	}

	/**
	 * @param {String|Array<String>} data
	 * @returns {SendManager}
	 */
	send(data) {
		if (!this.socket) return null;
		let id = this.getSendId();
		let manager = new SendManager(data, this.maxLinesSend,
			function (msg) {
				this.socket.send(msg);
				this.events.emit('send', msg);
			}.bind(this),

			function () {
				delete this.sending[id];
			}.bind(this)
		);
		this.sending[id] = manager;
		manager.start();
		return manager;
	}

	/**
	 * @param {String} room
	 * @param {String|Array<String>} data
	 * @returns {SendManager}
	 */
	sendTo(room, data) {
		if (!(data instanceof Array)) {
			data = [data.toString()];
		}
		for (let i = 0; i < data.length; i++) {
			data[i] = (room + '|' + data[i]);
		}
		return this.send(data);
	}

	/**
	 * @param {String|Array<String>} data
	 * @returns {SendManager}
	 */
	sendToGlobal(data) {
		return this.sendTo('', data);
	}

	/**
	 * @param {String} user
	 * @param {String|Array<String>} data
	 * @returns {SendManager}
	 */
	pm(user, data) {
		if (!(data instanceof Array)) {
			data = [data.toString()];
		}
		for (let i = 0; i < data.length; i++) {
			data[i] = ('|/msg ' + user + "," + data[i]);
		}
		return this.send(data);
	}

	/**
	 * @param {Array<String>} rooms
	 * @returns {SendManager}
	 */
	joinRooms(rooms) {
		let data = [];
		for (let i = 0; i < rooms.length; i++) {
			if (this.rooms[rooms[i]]) continue;
			data.push('|/join ' + rooms[i]);
		}
		return this.send(data);
	}

	/**
	 * @param {String} room
	 * @returns {SendManager}
	 */
	joinRoom(room) {
		return this.joinRooms([room]);
	}

	/**
	 * @param {Array<String>} rooms
	 * @returns {SendManager}
	 */
	leaveRooms(rooms) {
		let data = [];
		for (let i = 0; i < rooms.length; i++) {
			if (!this.rooms[rooms[i]]) continue;
			data.push('|/leave ' + rooms[i]);
		}
		return this.send(data);
	}

	/**
	 * @param {String} room
	 * @returns {SendManager}
	 */
	leaveRoom(room) {
		return this.leaveRooms([room]);
	}

	/* Receiving */

	/**
	 * Receives messages from the websocket
	 * @param {String} msg
	 */
	receive(msg) {
		this.receiveMsg(msg);
	}

	/**
	 * Receives parsed messages
	 * @param {String} msg
	 */
	receiveMsg(msg) {
		if (!msg) return;
		if (msg.includes('\n')) {
			let lines = msg.split('\n');
			let room = Default_Room;
			let firstLine = 0;
			if (lines[0].charAt(0) === '>') {
				room = lines[0].substr(1) || Default_Room;
				firstLine = 1;
			}
			for (let i = firstLine; i < lines.length; i++) {
				if (lines[i].split('|')[1] === 'init') {
					for (let j = i; j < lines.length; j++) {
						this.parseLine(room, lines[j], true);
					}
					break;
				} else {
					this.parseLine(room, lines[i], false);
				}
			}
		} else {
			this.parseLine(Default_Room, msg, false);
		}
	}

	/**
	 * Receives lines (individual messages)
	 * @param {String} room
	 * @param {String} line
	 * @param {Boolean} initialMsg
	 */
	parseLine(room, line, initialMsg) {
		let splittedLine = line.substr(1).split('|');
		let userid, time;
		this.events.emit('line', room, line, splittedLine, initialMsg);
		switch (splittedLine[0]) {
		case 'formats':
			let formats = line.substr(splittedLine[0].length + 2);
			this.updateFormats(formats);
			this.events.emit('formats', formats);
			break;
		case 'challstr':
			this.status.onChallstr(splittedLine[1], splittedLine[2]);
			this.events.emit('challstr', this.status.challstr);
			break;
		case 'updateuser':
			this.status.onRename(splittedLine[1], !!parseInt(splittedLine[2]));
			this.status.avatar = splittedLine[3];
			this.events.emit('updateuser', this.status.nick,
				this.status.named, this.status.avatar);
			break;
		case 'queryresponse':
			this.events.emit('queryresponse', line.substr(15));
			break;
		case 'popup':
			this.events.emit('popup', line.substr(7));
			break;
		case 'init':
			this.rooms[room] = new BotRoom(room, splittedLine[1]);
			this.events.emit('roomjoin', room, splittedLine[1]);
			break;
		case 'deinit':
			delete this.rooms[room];
			this.events.emit('roomleave', room);
			break;
		case 'noinit':
			this.events.emit('roomjoinfailure', room, splittedLine[1], splittedLine[2]);
			break;
		case 'title':
			if (this.rooms[room]) {
				this.rooms[room].setTitle(splittedLine[1]);
			}
			break;
		case 'users':
			if (!this.rooms[room]) break;
			this.rooms[room].users = {};
			let userArr = line.substr(7).split(",");
			for (let k = 1; k < userArr.length; k++) {
				this.rooms[room].userJoin(userArr[k]);
			}
			break;
		case 'c':
			if (initialMsg) break;
			userid = Text.toId(splittedLine[1]);
			time = Date.now();
			if (userid === this.status.userid) {
				this.events.emit('chat', room, time, splittedLine.slice(2).join('|'));
			} else {
				this.events.emit('userchat', room, time, splittedLine[1], splittedLine.slice(2).join('|'));
			}
			break;
		case 'c:':
			if (initialMsg) break;
			userid = Text.toId(splittedLine[2]);
			time = parseInt(splittedLine[1]) * 1000;
			if (userid === this.status.userid) {
				this.events.emit('chat', room, time, splittedLine.slice(3).join('|'));
			} else {
				this.events.emit('userchat', room, time, splittedLine[2], splittedLine.slice(3).join('|'));
			}
			break;
		case 'pm':
			userid = Text.toId(splittedLine[1]);
			if (userid === this.status.userid) {
				this.events.emit('pmsent', splittedLine[2], splittedLine.slice(3).join('|'));
			} else {
				this.events.emit('pm', splittedLine[1], splittedLine.slice(3).join('|'));
			}
			break;
		case 'n':
		case 'N':
			if (initialMsg) break;
			if (this.rooms[room]) {
				this.rooms[room].userRename(splittedLine[2], splittedLine[1]);
			}
			this.events.emit('userrename', room, splittedLine[2], splittedLine[1]);
			break;
		case 'J':
		case 'j':
			if (initialMsg) break;
			if (this.rooms[room]) {
				this.rooms[room].userJoin(splittedLine[1]);
			}
			this.events.emit('userjoin', room, splittedLine[1]);
			break;
		case 'l':
		case 'L':
			if (initialMsg) break;
			if (this.rooms[room]) {
				this.rooms[room].userLeave(splittedLine[1]);
			}
			this.events.emit('userleave', room, splittedLine[1]);
			break;
		}
		this.events.emit('parsedline', room, line, splittedLine, initialMsg);
	}

	/**
	 * @param {String} formats - Formats data received from the server
	 */
	updateFormats(formats) {
		let formatsArr = formats.split('|');
		let commaIndex, formatData, code, name;
		this.formats = {};
		for (let i = 0; i < formatsArr.length; i++) {
			commaIndex = formatsArr[i].indexOf(',');
			if (commaIndex === -1) {
				this.formats[Text.toId(formatsArr[i])] = {name: formatsArr[i],
					team: true, ladder: true, chall: true};
			} else if (commaIndex === 0) {
				i++;
				continue;
			} else {
				name = formatsArr[i];
				formatData = {name: name, team: true, ladder: true, chall: true};
				code = commaIndex >= 0 ? parseInt(name.substr(commaIndex + 1), 16) : NaN;
				if (!isNaN(code)) {
					name = name.substr(0, commaIndex);
					if (code & 1) formatData.team = false;
					if (!(code & 2)) formatData.ladder = false;
					if (!(code & 4)) formatData.chall = false;
					if (!(code & 8)) formatData.disableTournaments = true;
				} else {
					if (name.substr(name.length - 2) === ',#') { // preset teams
						formatData.team = false;
						name = name.substr(0, name.length - 2);
					}
					if (name.substr(name.length - 2) === ',,') { // search-only
						formatData.chall = false;
						name = name.substr(0, name.length - 2);
					} else if (name.substr(name.length - 1) === ',') { // challenge-only
						formatData.ladder = false;
						name = name.substr(0, name.length - 1);
					}
				}
				formatData.name = name;
				this.formats[Text.toId(name)] = formatData;
			}
		}
	}

	destroy() {
		this.disconnect();
	}
}

/**
 * Represents ths Bot status
 */
class BotStatus {
	constructor() {
		this.connected = false;
		this.nick = null;
		this.userid = null;
		this.named = false;
		this.challstr = null;
		this.avatar = 0;
	}

	onConnection() {
		this.connected = true;
	}

	/**
	 * @param {String} id - Login Key
	 * @param {String} str - Login Token
	 */
	onChallstr(id, str) {
		this.challstr = {
			id: id,
			str: str,
		};
	}

	onDisconnect() {
		this.connected = false;
		this.nick = null;
		this.userid = null;
		this.named = false;
		this.challstr = null;
	}

	/**
	 * @param {String} nick
	 * @param {Boolean} named
	 */
	onRename(nick, named) {
		this.nick = nick;
		this.userid = Text.toId(nick);
		this.named = named;
	}
}

/**
 * Represents a Pokemon Showdown Room
 */
class BotRoom {
	/**
	 * @param {String} id
	 * @param {String} type - It can be: "chat" or "battle"
	 */
	constructor(id, type) {
		this.id = id;
		this.type = type || "chat";
		this.title = "";
		this.users = {};
		this.localNames = {};
	}

	/**
	 * @param {String} title
	 */
	setTitle(title) {
		this.title = title;
	}

	/**
	 * @param {String} userIdent
	 */
	userJoin(userIdent) {
		let ident = Text.parseUserIdent(userIdent);
		this.users[ident.id] = ident.group;
		this.localNames[ident.id] = ident.name;
	}

	/**
	 * @param {String} user
	 */
	userLeave(user) {
		delete this.users[Text.toId(user)];
		delete this.localNames[Text.toId(user)];
	}

	/**
	 * @param {String} oldIdent
	 * @param {String} newIdent
	 */
	userRename(oldIdent, newIdent) {
		this.userLeave(oldIdent);
		this.userJoin(newIdent);
	}
}

/**
 * Represents a queue manager that sends messages
 * to a Pokemon Showdown Server
 */
class SendManager {
	/**
	 * @param {String|Array<String>} data
	 * @param {Number} msgMaxLines
	 * @param {function(String)} sendFunc
	 * @param {function} destroyHandler
	 */
	constructor(data, msgMaxLines, sendFunc, destroyHandler) {
		this.data = data;
		this.msgMaxLines = msgMaxLines;
		this.sendFunc = sendFunc;
		this.status = 'sending';
		this.callback = null;
		this.destroyHandler = destroyHandler;
		this.err = null;
		this.interval = null;
	}

	start() {
		let data = this.data;
		if (!(data instanceof Array)) {
			data = [data.toString()];
		} else {
			data = data.slice();
		}
		let nextToSend = function () {
			if (!data.length) {
				clearInterval(this.interval);
				this.interval = null;
				this.finalize();
				return;
			}
			let toSend = [];
			let firstMsg = data.shift();
			toSend.push(firstMsg);
			let roomToSend = "";
			if (firstMsg.indexOf('|') >= 0) {
				roomToSend = firstMsg.split('|')[0];
			}
			while (data.length > 0 && toSend.length < this.msgMaxLines) {
				let subMsg = data[0];
				if (subMsg.split('|')[0] !== roomToSend) {
					break;
				} else {
					toSend.push(subMsg.split('|').slice(1).join('|'));
					data.shift();
				}
			}
			this.sendFunc(toSend.join('\n'));
		};
		this.interval = setInterval(nextToSend.bind(this), Message_Sent_Delay);
		nextToSend.call(this);
	}

	finalize() {
		this.status = 'finalized';
		if (typeof this.callback === "function") this.callback(this.err);
		if (typeof this.destroyHandler === "function") this.destroyHandler(this);
	}

	/**
	 * @param {function} callback
	 */
	then(callback) {
		if (this.status !== 'sending') {
			return callback(this.err);
		} else {
			this.callback = callback;
		}
	}

	kill() {
		if (this.interval) clearInterval(this.interval);
		this.interval = null;
		this.err = new Error("Send Manager was killed");
		this.finalize();
	}
}

exports.Bot = Bot;
exports.BotStatus = BotStatus;
exports.BotRoom = BotRoom;
exports.SendManager = SendManager;
