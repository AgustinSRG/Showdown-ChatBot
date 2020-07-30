/**
 * Moderator Bot
 */

'use strict';

const MAX_MODTIME_DURATION = 24 * 60 * 60 * 1000;
const MAX_MODTIME_RELEVANCE = 60 * 60 * 1000;

const Path = require('path');
const FileSystem = require('fs');
const Text = Tools('text');

const Lang_File = Path.resolve(__dirname, 'mod.translations');

class ModeratorBot {
	constructor(app, path) {
		this.app = app;
		this.chatLog = {};
		this.chatData = {};
		this.filters = {};

		let dir = FileSystem.readdirSync(path);
		for (let i = 0; i < dir.length; i++) {
			if ((/.*\.js/).test(dir[i])) {
				let filter = require(Path.resolve(path, dir[i]));
				if (filter.id && typeof filter.parse === 'function') {
					this.filters[filter.id] = filter.parse;
				} else {
					console.log("Warning: Invalid filter: " + dir[i]);
				}
			}
		}

		this.cleanInterval = setInterval(this.clean.bind(this), MAX_MODTIME_RELEVANCE);
	}

	clean() {
		for (let room in this.chatData) {
			for (let user in this.chatData[room]) {
				let now = Date.now();
				if (!this.chatData[room][user] || !this.chatData[room][user].times.length) {
					delete this.chatData[room][user];
					continue;
				}
				if (now - this.chatData[room][user].times[this.chatData[room][user].times.length - 1] > MAX_MODTIME_DURATION) {
					delete this.chatData[room][user];
					continue;
				}
				let newTimes = [];
				for (let j = 0; j < this.chatData[room][user].times.length; j++) {
					if (now - this.chatData[room][user].times[j] < MAX_MODTIME_RELEVANCE) {
						newTimes.push(this.chatData[room][user].times[j]);
					}
				}
				delete this.chatData[room][user].times;
				this.chatData[room][user].times = newTimes;
				if (this.chatData[room][user].points) {
					this.chatData[room][user].points--;
				}
			}
		}
	}

	isExcepted(ident, room) {
		let config = this.app.modules.moderation.system.data;
		if (config.modexception.rooms[room]) {
			return this.app.parser.equalOrHigherGroup(ident, config.modexception.rooms[room]);
		} else {
			return this.app.parser.equalOrHigherGroup(ident, config.modexception.global);
		}
	}

	applyZeroTolerance(context) {
		if (context.pointVal === 0) return;
		let config = this.app.modules.moderation.system.data;
		if (!config.zeroTolerance[context.room] || !config.zeroTolerance[context.room][context.byIdent.id]) return;
		let val = config.zeroTolerance[context.room][context.byIdent.id];
		if (val === 'min' || val === 'low') {
			context.pointVal += 1;
		} else if (val === 'normal') {
			context.pointVal += 1;
		} else if (val === 'high') {
			context.pointVal += 2;
		} else if (val === 'max') {
			context.pointVal += 3;
		}
		context.muteMessage += ' (' + this.app.multilang.mlt(Lang_File, this.getLanguage(context.room), '0tol') + ')';
	}

	botCanModerate(room) {
		let roomData = this.app.bot.rooms[room];
		let botid = Text.toId(this.app.bot.getBotNick());
		return (roomData && roomData.users[botid] && this.app.parser.equalOrHigherGroup({group: roomData.users[botid]}, 'driver'));
	}

	botCanBan(room) {
		let roomData = this.app.bot.rooms[room];
		let botid = Text.toId(this.app.bot.getBotNick());
		return (roomData && roomData.users[botid] && this.app.parser.equalOrHigherGroup({group: roomData.users[botid]}, 'mod'));
	}

	modEnabled(modType, room) {
		let config = this.app.modules.moderation.system.data;
		if (config.roomSettings[room] && config.roomSettings[room][modType] === true) {
			return true;
		} else if (config.roomSettings[room] && config.roomSettings[room][modType] === false) {
			return false;
		} else {
			return !!config.settings[modType];
		}
	}

	getLanguage(room) {
		return this.app.config.language.rooms[room] || this.app.config.language['default'];
	}

	getRulesLink(room) {
		let config = this.app.modules.moderation.system.data;
		if (config.rulesLink[room]) {
			return '. ' + config.rulesLink[room];
		} else {
			return '';
		}
	}

	getPunishment(val) {
		let config = this.app.modules.moderation.system.data;
		let punishments = config.punishments;
		if (val <= 0) return null;
		if (val > punishments.length) {
			return punishments[punishments.length - 1];
		} else {
			return punishments[val - 1];
		}
	}

	getModTypeValue(modType, defaultVal) {
		let config = this.app.modules.moderation.system.data;
		return config.values[modType] || defaultVal;
	}

	parse(room, time, by, msg) {
		let context = new ModerationContext(this.app, room, time, by, msg, this.getLanguage(room));
		let user = context.byIdent.id;

		if (!this.chatLog[room]) {
			this.chatLog[room] = {
				times: [0, 0, 0, 0],
				users: ['', '', '', ''],
				msgs: ['', '', '', ''],
			};
		}

		this.chatLog[room].times.push(time);
		this.chatLog[room].users.push(user);
		this.chatLog[room].msgs.push(msg);

		this.chatLog[room].times.shift();
		this.chatLog[room].users.shift();
		this.chatLog[room].msgs.shift();

		/* Exception */
		if (this.isExcepted(context.byIdent, room)) return;
		if (!this.botCanModerate(room)) return;


		/* User Data */
		if (!this.chatData[room]) this.chatData[room] = {};

		if (!this.chatData[room][user]) {
			this.chatData[room][user] = {times:[], lastMsgs: ['', '', ''], points:0, lastAction:0};
		}

		this.chatData[room][user].lastMsgs.push(context.msgLow);
		this.chatData[room][user].lastMsgs.shift();

		this.chatData[room][user].times.push(time);

		/* Filters */
		for (let f in this.filters) {
			if (f === 'spam') continue;
			if (!this.modEnabled(f, room)) continue;
			this.filters[f].call(this, context);
		}

		/* Spam */
		if (this.filters['spam'] && this.modEnabled('spam', room)) {
			this.filters['spam'].call(this, context);
		}

		/* Zero Tolerance */
		this.applyZeroTolerance(context);

		/* Punishment */
		if (context.pointVal > 0) {
			context.pointVal += this.chatData[room][user].points;
			this.chatData[room][user].points++;

			let cmd = this.getPunishment(context.pointVal);
			if (cmd === 'roomban' && !this.botCanBan(room)) cmd = 'hourmute'; // Bot cannot ban
			if (this.app.config.modules.core.privaterooms.indexOf(room) >= 0 && cmd === 'warn') cmd = 'mute'; // Cannot warn in private rooms

			this.app.bot.sendTo(room, '/' + cmd + ' ' + user + ', ' + this.app.multilang.mlt(Lang_File, this.getLanguage(room), 'mod') +
				': ' + context.muteMessage + this.getRulesLink(room));
		}
	}

	doHideText(room, raw) {
		if (!this.modEnabled('hidetext', room) && !this.modEnabled('cleartext', room)) return; // Not enabled
		if (!this.botCanModerate(room)) return;

		let muteregexp = /^(.+) was muted by (.+) for 7 minutes\.(\s\(.*\))?$/g;
		let hourmuteRegExp = /^(.+) was muted by (.+) for 1 hour\.(\s\(.*\))?$/g;
		let banRegExp = /^(.+) was banned from (.+) by (.+)\.(\s\(.*\))?$/g;

		let muteRes = muteregexp.exec(raw);
		let hmRes = hourmuteRegExp.exec(raw);
		let banRes = banRegExp.exec(raw);

		let res = muteRes || hmRes || banRes;

		if (res) {
			let user = Text.toId(res[1]);
			if (user) {
				if (this.modEnabled('cleartext', room)) {
					this.app.bot.sendTo(room, '/cleartext ' + user);
				} else if (!banRes) {
					this.app.bot.sendTo(room, '/hidetext ' + user);
				}
			}
		}
	}

	parseRaw(room, raw) {
		let by = '', val = 0;
		let indexwarn = raw.indexOf(" was warned by ");
		let indexmute = raw.indexOf(" was muted by ");
		if (indexmute !== -1) {
			let mutemsg = raw.split(" was muted by ");
			if (mutemsg.length > 1 && mutemsg[1].indexOf(this.app.bot.getBotNick().substr(1)) === -1) {
				by = Text.toId(mutemsg[0]);
				if (raw.indexOf("for 7 minutes") !== -1) {
					val = 2;
				} else {
					val = 3;
				}
			}
		} else if (indexwarn !== -1) {
			let warnmsg = raw.split(" was warned by ");
			if (warnmsg.length > 1 && warnmsg[1].indexOf(this.app.bot.getBotNick().substr(1)) === -1) {
				by = Text.toId(warnmsg[0]);
				val = 1;
			}
		}
		if (by && val > 0) {
			let config = this.app.modules.moderation.system.data;
			if (!config.zeroTolerance[room] || !config.zeroTolerance[room][by]) return;
			let zt = config.zeroTolerance[room][by];
			if (zt === 'normal') {
				val += 1;
			} else if (zt === 'high') {
				val += 2;
			} else if (zt === 'max') {
				val += 3;
			} else {
				return;
			}
			let cmd = this.getPunishment(val);
			if (cmd === 'roomban' && !this.botCanBan(room)) cmd = 'hourmute'; // Bot cannot ban
			if (this.app.config.modules.core.privaterooms.indexOf(room) >= 0 && cmd === 'warn') cmd = 'mute'; // Cannot warn in private rooms

			this.app.bot.sendTo(room, '/' + cmd + ' ' + by + ', ' + this.app.multilang.mlt(Lang_File, this.getLanguage(room), 'mod') +
				': ' + this.app.multilang.mlt(Lang_File, this.getLanguage(room), 'ztmsg'));
		}
	}

	destroy() {
		clearInterval(this.cleanInterval);
	}
}

class ModerationContext {
	constructor(app, room, time, by, msg, lang) {
		this.app = app;
		this.room = room;
		this.lang = lang;
		this.time = time;
		this.by = by;
		this.byIdent = Text.parseUserIdent(by);
		this.originalMessage = msg;
		this.msg = msg.trim().replace(/[ \u0000\u200B-\u200F]+/g, " ");
		this.msgLow = this.msg.toLowerCase();

		this.infractions = [];
		this.muteMessage = '';
		this.pointVal = 0;
		this.totalPointVal = 0;

		/* No-Nicks Msg */
		this.noNicksMsg = " " + this.msg + " ";
		if (this.app.bot.rooms[room]) {
			let usernum = 0;
			for (let userid in this.app.bot.rooms[room].users) {
				usernum++;
				if (!this.app.bot.rooms[room].localNames[userid]) continue;
				let name = this.app.bot.rooms[room].localNames[userid].replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
				let regex = new RegExp("[^a-z0-9A-Z]" + name + "[^a-z0-9A-Z]", 'g');
				this.noNicksMsg = this.noNicksMsg.replace(regex, " %" + usernum + "% ");
			}
		}
		this.noNicksMsg = this.noNicksMsg.trim();
		this.noNicksMsgLow = this.noNicksMsg.toLowerCase();
	}

	mlt(file, key, vars) {
		return this.app.multilang.mlt(file, this.lang, key, vars);
	}
}

exports.ModeratorBot = ModeratorBot;
exports.ModerationContext = ModerationContext;
