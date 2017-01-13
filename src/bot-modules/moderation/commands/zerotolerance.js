/**
 * Commands File
 *
 * addzerotolerance: adds an user to the zero tolerance list
 * rmzerotolerance: removes an user from the zero tolerance list
 * viewzerotolerance: gets the zero tolerance list
 * viewzerotolerancehastebin: gets the zero tolerance list (via Hastebin)
 * checkzerotolerance: checks the zero tolerance status of an user
 */

'use strict';

const Path = require('path');

const Text = Tools('text');
const Chat = Tools('chat');
const Hastebin = Tools('hastebin');

const Lang_File = Path.resolve(__dirname, 'zerotolerance.translations');

module.exports = {
	addzerotolerance: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('zerotolerance', this.room)) return this.replyAccessDenied('zerotolerance');
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(this.mlt('nochat'));
		const config = App.modules.moderation.system.data;
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('user')}, {desc: 'min/low/normal/high/max', optional: true}));
		let user = Text.toId(this.args[0]);
		let level = Text.toId(this.args[1]) || 'normal';
		if (!user || !(level in {'min': 1, 'low': 1, 'normal': 1, 'high': 1, 'max': 1})) {
			return this.errorReply(this.usage({desc: this.usageTrans('user')}, {desc: 'min/low/normal/high/max', optional: true}));
		}
		if (user.length > 19) {
			return this.errorReply(this.mlt(0));
		}
		if (!config.zeroTolerance[room]) {
			config.zeroTolerance[room] = {};
		}
		config.zeroTolerance[room][user] = level;
		App.modules.moderation.system.db.write();
		App.logCommandAction(this);
		this.reply(this.mlt(1) + " " + Chat.italics(user) + " " + this.mlt(2) +
			" (" + this.mlt(3) + ": " + level + ") " + this.mlt(4) +
			" " + Chat.italics(this.parser.getRoomTitle(room)));
	},

	rmzerotolerance: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('zerotolerance', this.room)) return this.replyAccessDenied('zerotolerance');
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(this.mlt('nochat'));
		const config = App.modules.moderation.system.data;
		let user = Text.toId(this.args[0]);
		if (!user) return this.errorReply(this.usage({desc: this.usageTrans('user')}));
		if (!config.zeroTolerance[room] || !config.zeroTolerance[room][user]) {
			return this.errorReply(this.mlt(1) + " " + Chat.italics(user) + " " +
				this.mlt(5) + " " + Chat.italics(this.parser.getRoomTitle(room)));
		}
		delete config.zeroTolerance[room][user];
		if (Object.keys(config.zeroTolerance[room]).length === 0) {
			delete config.zeroTolerance[room];
		}
		App.modules.moderation.system.db.write();
		App.logCommandAction(this);
		this.reply(this.mlt(1) + " " + Chat.italics(user) + " " + this.mlt(6) +
			" " + Chat.italics(this.parser.getRoomTitle(room)));
	},

	viewzerotolerance: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('viewzerotol', this.room)) return this.replyAccessDenied('viewzerotol');
		let server = App.config.server.url;
		if (!server) {
			this.cmd = 'viewzerotolerancehastebin';
			return App.parser.exec(this);
		}
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(this.mlt('nochat'));
		const config = App.modules.moderation.system.data;
		let zt = config.zeroTolerance[room];
		if (!zt) {
			return this.pmReply(this.mlt(8) + " " + Chat.italics(this.parser.getRoomTitle(room)) +
				" " + this.mlt(9));
		}
		let html = '';
		html += '<html>';
		html += '<head><title>Zero tolerance configuration of ' + Text.escapeHTML(App.parser.getRoomTitle(room)) + '</title></head>';
		html += '<body>';
		html += '<h3>Zero tolerance configuration of ' + Text.escapeHTML(App.parser.getRoomTitle(room)) + '</h3>';
		html += '<ul>';
		let users = Object.keys(zt).sort();
		for (let i = 0; i < users.length; i++) {
			let user = users[i];
			html += '<li>';
			html += '<strong>' + user + '</strong>';
			html += '&nbsp;(Level: ' + zt[user] + ')';
			html += '</li>';
		}
		html += '</ul>';
		html += '</body>';
		html += '</html>';
		let key = App.data.temp.createTempFile(html);
		if (server.charAt(server.length - 1) === '/') {
			return this.pmReply(App.config.server.url + 'temp/' + key);
		} else {
			return this.pmReply(App.config.server.url + '/temp/' + key);
		}
	},

	viewzerotolerancehastebin: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('viewzerotol', this.room)) return this.replyAccessDenied('viewzerotol');
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(this.mlt('nochat'));
		const config = App.modules.moderation.system.data;
		let zt = config.zeroTolerance[room];
		if (!zt) {
			return this.pmReply(this.mlt(8) + " " + Chat.italics(this.parser.getRoomTitle(room)) +
				" " + this.mlt(9));
		}
		let text = '';
		text += 'Zero tolerance configuration of ' + this.parser.getRoomTitle(room) + ':\n\n';
		let users = Object.keys(zt).sort();
		for (let i = 0; i < users.length; i++) {
			let user = users[i];
			text += user;
			text += ' (Level: ' + zt[user] + ')';
			text += '\n';
		}
		Hastebin.upload(text, function (link, err) {
			if (err) {
				this.pmReply(this.mlt(7));
			} else {
				this.pmReply(link);
			}
		}.bind(this));
	},

	checkzerotolerance: function (App) {
		this.setLangFile(Lang_File);
		let room = this.parseRoomAliases(Text.toRoomid(this.args[0]));
		let user = Text.toId(this.args[1]) || this.byIdent.id;
		if (!user || !room) return this.errorReply(this.usage({desc: this.usageTrans('room')}, {desc: this.usageTrans('user'), optional: true}));
		if (!App.bot.rooms[room] || this.getRoomType(room) !== 'chat') {
			return this.errorReply(this.mlt(10) + " " + Chat.italics(room) +
				" " + this.mlt(11));
		}
		if (user.length > 19) {
			return this.errorReply(this.mlt(0));
		}
		if (user !== this.byIdent.id) {
			let group = App.bot.rooms[room].users[this.byIdent.id] || " ";
			let ident = Text.parseUserIdent(group + this.byIdent.id);
			if (!this.parser.can(ident, 'checkzerotol', room)) {
				return this.replyAccessDenied('checkzerotol');
			}
		}
		let config = App.modules.moderation.system.data;
		if (!config.zeroTolerance[room] || !config.zeroTolerance[room][user]) {
			this.pmReply(this.mlt(1) + " " + Chat.italics(user) + " " + this.mlt(12) +
				" " + this.mlt(4) + " " + Chat.italics(this.parser.getRoomTitle(room)));
		} else {
			let level = config.zeroTolerance[room][user];
			this.pmReply(this.mlt(1) + " " + Chat.italics(user) + " " + this.mlt(13) +
				" (" + this.mlt(3) + ": " + level + ") " + this.mlt(4) +
				" " + Chat.italics(this.parser.getRoomTitle(room)));
		}
	},
};
