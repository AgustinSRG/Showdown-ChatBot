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

const Text = Tools.get('text.js');
const Events = Tools.get('events.js');
const Util = require('util');
const Url = require('url');
const WebSocketClient = require('websocket').client;
const Https = require('https');

const Default_Login_Server = "play.pokemonshowdown.com";
const Max_Idle_Interval = 2 * 60 * 1000;
const Message_Sent_Delay = 2000;
const Default_Retry_Delay = 10 * 1000;
const Max_Lines = 3;
const Default_Room = "lobby";

class Bot {
	constructor(server, port, loginOptions, errOptions) {
		this.server = server;
		this.port = port;

		this.loginOptions = loginOptions || null;
		this.loginUrl = {
			loginServer: (loginOptions ? (loginOptions.loginServer || Default_Login_Server) : Default_Login_Server),
			serverId: (loginOptions ? (loginOptions.serverId || "showdown") : "showdown"),
		};

		this.errOptions = errOptions || null;

		this.connection = null;
		this.connecting = false;
		this.closed = false;
		this.status = new BotStatus();
		this.events = new Events();

		this.rooms = {};
		this.users = {};
		this.formats = {};

		this.sending = {};
		this.nextSend = 0;

		this.connectionCheckTimer = null;
		this.connectionRetryTimer = null;

		let webSocket = this.webSocket = new WebSocketClient();
		webSocket.on('connectFailed', function (err) {
			this.connecting = false;
			this.status.onDisconnect();
			this.events.emit('connectFailed', err);
		}.bind(this));

		webSocket.on('connect', function (connection) {
			this.connecting = false;
			this.connection = connection;
			this.status.onConnection();
			this.prepareConnection();
			this.startConnectionMonitor();
			this.events.emit('connect', connection);
		}.bind(this));

		if (errOptions) {
			this.on('connectFailed', function () {
				if (this.closed || this.connecting || this.status.connected) return;
				this.retryConnect(errOptions.retryDelay || Default_Retry_Delay);
			}.bind(this));
			this.on('disconnect', function () {
				if (this.closed || this.connecting || this.status.connected) return;
				this.retryConnect(errOptions.retryDelay || Default_Retry_Delay);
			}.bind(this));
		}
	}

	/* Getters */

	isConnected() {
		return this.status.connected || false;
	}

	getBotNick() {
		return this.status.nick || "";
	}

	getFormats() {
		return this.formats || {};
	}

	getUserGroup(user, room) {
		user = Text.toId(user);
		if (!this.rooms[room]) return null;
		if (!this.rooms[room].users[user]) return {offline: true};
		return {group: this.rooms[room].users[user]};
	}

	getConnectionUrl() {
		return Util.format("ws://%s:%d/showdown/%d/%s/websocket",
			this.server,
			this.port,
			~~(Math.random() * 900) + 100,
			Text.randomId(8));
	}

	getLoginUrl() {
		return Util.format("https://%s/~~%s/action.php",
			this.loginUrl.loginServer, this.loginUrl.serverId);
	}

	/* Setters */

	setLoginOptions(loginOptions) {
		this.loginOptions = loginOptions || null;
		this.loginUrl = {
			loginServer: (loginOptions ? (loginOptions.loginServer || Default_Login_Server) : Default_Login_Server),
			serverId: (loginOptions ? (loginOptions.serverId || "showdown") : "showdown"),
		};
	}

	prepareConnection() {
		let connection = this.connection;
		connection.on('error', function (err) {
			this.connecting = false;
			this.connection = null;
			this.reset();
			this.events.emit('disconnect', err);
		}.bind(this));

		connection.on('close', function () {
			this.connecting = false;
			this.connection = null;
			this.reset();
			this.events.emit('disconnect');
		}.bind(this));

		connection.on('message', function (message) {
			if (message.type === 'utf8') {
				this.lastMessage = Date.now();
				this.events.emit('message', message.utf8Data);
				this.receive(message.utf8Data);
			}
		}.bind(this));
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
		if (this.connectionCheckTimer) {
			clearInterval(this.connectionCheckTimer);
			this.connectionCheckTimer = null;
		}
		for (let k in this.sending) {
			this.sending[k].kill();
			delete this.sending[k];
		}
		this.nextSend = 0;
		this.rooms = {};
		this.users = {};
		this.status.onDisconnect();
	}

	/* Events */

	on(event, handler) {
		this.events.on(event, handler);
	}

	removeListener(event, handler) {
		this.events.removeListener(event, handler);
	}

	/* Connection */

	connect() {
		if (this.status.connected || this.connecting) return;
		this.connecting = true;
		this.closed = false;
		this.reset();
		this.events.emit('connecting');
		this.webSocket.connect(this.getConnectionUrl(), []);
	}

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
		this.reset();
		if (this.connection) {
			this.connection.close();
			this.connection = null;
		}
	}

	startConnectionMonitor() {
		if (this.connectionCheckTimer) return;
		if (!this.errOptions) return;
		let l = this.errOptions.ckeckInterval || Max_Idle_Interval;
		this.connectionCheckTimer = setInterval(function () {
			if (this.status.connected && this.lastMessage) {
				let time = Date.now();
				if (time - this.lastMessage > l) {
					this.events.emit('timeout');
					this.reconnect();
				}
			}
		}.bind(this), l);
	}

	/* Login */

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

	send(data) {
		if (!this.connection) return null;
		let id = this.getSendId();
		let manager = new SendManager(data, Max_Lines,
			function (msg) {
				this.connection.send(msg);
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

	sendTo(room, data) {
		if (!(data instanceof Array)) {
			data = [data.toString()];
		}
		for (let i = 0; i < data.length; i++) {
			data[i] = (room + '|' + data[i]);
		}
		return this.send(data);
	}

	sendToGlobal(data) {
		return this.sendTo('', data);
	}

	pm(user, data) {
		if (!(data instanceof Array)) {
			data = [data.toString()];
		}
		for (let i = 0; i < data.length; i++) {
			data[i] = ('|/msg ' + user + "," + data[i]);
		}
		return this.send(data);
	}

	joinRooms(rooms) {
		let data = [];
		for (let i = 0; i < rooms.length; i++) {
			if (this.rooms[rooms[i]]) continue;
			data.push('|/join ' + rooms[i]);
		}
		return this.send(data);
	}

	joinRoom(room) {
		return this.joinRooms([room]);
	}

	leaveRooms(rooms) {
		let data = [];
		for (let i = 0; i < rooms.length; i++) {
			if (!this.rooms[rooms[i]]) continue;
			data.push('|/leave ' + rooms[i]);
		}
		return this.send(data);
	}

	leaveRoom(room) {
		return this.leaveRooms([room]);
	}

	/* Receiving */

	receive(msg) {
		let type = msg.charAt(0);
		let data;
		if (type === 'a') {
			try {
				data = JSON.parse(msg.substr(1));
			} catch (err) {
				this.events.emit('error', err);
				return;
			}
			if (data instanceof Array) {
				for (let i = 0; i < data.length; i++) {
					this.receiveMsg(data[i]);
				}
			} else {
				this.receiveMsg(data);
			}
		}
	}

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
			userid = Text.toId(splittedLine[1]);
			time = Date.now();
			if (initialMsg) break;
			if (!this.users[userid]) {
				this.users[userid] = new BotUser(splittedLine[1]);
			}
			this.users[userid].onChat(room, splittedLine[1]);
			if (userid === this.status.userid) {
				this.events.emit('chat', room, time, splittedLine.slice(2).join('|'));
			} else {
				this.events.emit('userchat', room, time, splittedLine[1], splittedLine.slice(2).join('|'));
			}
			break;
		case 'c:':
			userid = Text.toId(splittedLine[2]);
			time = parseInt(splittedLine[1]) * 1000;
			if (initialMsg) break;
			if (!this.users[userid]) {
				this.users[userid] = new BotUser(splittedLine[2]);
			}
			this.users[userid].onChat(room, splittedLine[2]);
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
			userid = Text.toId(splittedLine[2]);
			if (!this.users[userid]) {
				this.users[userid] = new BotUser(splittedLine[2]);
			}
			this.users[userid].onRename(room, splittedLine[1], this.users);
			if (this.rooms[room]) {
				this.rooms[room].userRename(splittedLine[2], splittedLine[1]);
			}
			this.events.emit('userrename', room, splittedLine[2], splittedLine[1]);
			break;
		case 'J':
		case 'j':
			userid = Text.toId(splittedLine[1]);
			if (!this.users[userid]) {
				this.users[userid] = new BotUser(splittedLine[1]);
			}
			this.users[userid].onJoin(room, splittedLine[1]);
			if (this.rooms[room]) {
				this.rooms[room].userJoin(splittedLine[1]);
			}
			this.events.emit('userjoin', room, splittedLine[1]);
			break;
		case 'l':
		case 'L':
			userid = Text.toId(splittedLine[1]);
			if (!this.users[userid]) {
				this.users[userid] = new BotUser(splittedLine[1]);
			}
			this.users[userid].onLeave(room, splittedLine[1]);
			if (this.rooms[room]) {
				this.rooms[room].userLeave(splittedLine[1]);
			}
			this.events.emit('userleave', room, splittedLine[1]);
			break;
		}
		this.events.emit('parsedline', room, line, splittedLine, initialMsg);
	}

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

	onRename(nick, named) {
		this.nick = nick;
		this.userid = Text.toId(nick);
		this.named = named;
	}
}

class BotRoom {
	constructor(id, type) {
		this.id = id;
		this.type = type || "chat";
		this.title = "";
		this.users = {};
	}

	setTitle(title) {
		this.title = title;
	}

	userJoin(userIdent) {
		let ident = Text.parseUserIdent(userIdent);
		this.users[ident.id] = ident.group;
	}

	userLeave(user) {
		delete this.users[Text.toId(user)];
	}

	userRename(oldIdent, newIdent) {
		this.userLeave(oldIdent);
		this.userJoin(newIdent);
	}
}

class BotUser {
	constructor(name) {
		this.id = Text.toId(name);
		this.name = name;
		this.lastSeen = null;
		this.alts = [];
	}

	markAlt(alt, users) {
		if (alt === this.id) return;
		if (this.alts.indexOf(alt) < 0) {
			this.alts.push(alt);
			for (let i = 0; i < this.alts.length; i++) {
				if (users[this.alts[i]]) {
					users[this.alts[i]].markAlt(alt, users);
				}
			}
		}
	}

	onJoin(room, ident) {
		ident = Text.parseUserIdent(ident);
		this.name = ident.name;
		this.lastSeen = {
			type: "J",
			room: room,
			time: Date.now(),
		};
	}

	onChat(room, ident) {
		ident = Text.parseUserIdent(ident);
		this.name = ident.name;
		this.lastSeen = {
			type: "C",
			room: room,
			time: Date.now(),
		};
	}

	onLeave(room, ident) {
		ident = Text.parseUserIdent(ident);
		this.name = ident.name;
		this.lastSeen = {
			type: "L",
			room: room,
			time: Date.now(),
		};
	}

	onRename(room, newIdent, users) {
		newIdent = Text.parseUserIdent(newIdent);
		if (newIdent.id === this.id) {
			this.name = newIdent.name;
		} else {
			this.lastSeen = {
				type: "R",
				room: null,
				time: Date.now(),
				detail: newIdent.name,
			};
			this.markAlt(newIdent.id, users);
			if (!users[newIdent.id]) {
				users[newIdent.id] = new BotUser(newIdent.name);
			}
			users[newIdent.id].onJoin(room, newIdent.ident);
			users[newIdent.id].markAlt(this.id, users);
		}
	}
}

class SendManager {
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
		}
		let nextToSend = function () {
			if (!data.length) {
				clearInterval(this.interval);
				this.interval = null;
				this.finalize();
				return;
			}
			let toSend = data.splice(0, this.msgMaxLines);
			toSend = JSON.stringify(toSend);
			this.sendFunc(toSend);
		};
		this.interval = setInterval(nextToSend.bind(this), Message_Sent_Delay);
		nextToSend.call(this);
	}

	finalize() {
		this.status = 'finalized';
		if (typeof this.callback === "function") this.callback(this.err);
		if (typeof this.destroyHandler === "function") this.destroyHandler();
	}

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
exports.BotUser = BotUser;
exports.SendManager = SendManager;
