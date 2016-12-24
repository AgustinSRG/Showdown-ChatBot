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
const Translator = Tools('translate');
const Hastebin = Tools('hastebin');

const translator = new Translator(Path.resolve(__dirname, 'zerotolerance.translations'));

module.exports = {
	addzerotolerance: function (App) {
		if (!this.can('zerotolerance', this.room)) return this.replyAccessDenied('zerotolerance');
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
		const config = App.modules.moderation.system.data;
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('user')}, {desc: 'min/low/normal/high/max', optional: true}));
		let user = Text.toId(this.args[0]);
		let level = Text.toId(this.args[1]) || 'normal';
		if (!user || !(level in {'min': 1, 'low': 1, 'normal': 1, 'high': 1, 'max': 1})) {
			return this.errorReply(this.usage({desc: this.usageTrans('user')}, {desc: 'min/low/normal/high/max', optional: true}));
		}
		if (user.length > 19) {
			return this.errorReply(translator.get(0, this.lang));
		}
		if (!config.zeroTolerance[room]) {
			config.zeroTolerance[room] = {};
		}
		config.zeroTolerance[room][user] = level;
		App.modules.moderation.system.db.write();
		App.logCommandAction(this);
		this.reply(translator.get(1, this.lang) + " " + Chat.italics(user) + " " + translator.get(2, this.lang) +
			" (" + translator.get(3, this.lang) + ": " + level + ") " + translator.get(4, this.lang) +
			" " + Chat.italics(this.parser.getRoomTitle(room)));
	},

	rmzerotolerance: function (App) {
		if (!this.can('zerotolerance', this.room)) return this.replyAccessDenied('zerotolerance');
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
		const config = App.modules.moderation.system.data;
		let user = Text.toId(this.args[0]);
		if (!user) return this.errorReply(this.usage({desc: this.usageTrans('user')}));
		if (!config.zeroTolerance[room] || !config.zeroTolerance[room][user]) {
			return this.errorReply(translator.get(1, this.lang) + " " + Chat.italics(user) + " " +
				translator.get(5, this.lang) + " " + Chat.italics(this.parser.getRoomTitle(room)));
		}
		delete config.zeroTolerance[room][user];
		if (Object.keys(config.zeroTolerance[room]).length === 0) {
			delete config.zeroTolerance[room];
		}
		App.modules.moderation.system.db.write();
		App.logCommandAction(this);
		this.reply(translator.get(1, this.lang) + " " + Chat.italics(user) + " " + translator.get(6, this.lang) +
			" " + Chat.italics(this.parser.getRoomTitle(room)));
	},

	viewzerotolerance: function (App) {
		if (!this.can('viewzerotol', this.room)) return this.replyAccessDenied('viewzerotol');
		let server = App.config.server.url;
		if (!server) {
			this.cmd = 'viewzerotolerancehastebin';
			return App.parser.exec(this);
		}
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
		const config = App.modules.moderation.system.data;
		let zt = config.zeroTolerance[room];
		if (!zt) {
			return this.pmReply(translator.get(8, this.lang) + " " + Chat.italics(this.parser.getRoomTitle(room)) +
				" " + translator.get(9, this.lang));
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
		if (!this.can('viewzerotol', this.room)) return this.replyAccessDenied('viewzerotol');
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
		const config = App.modules.moderation.system.data;
		let zt = config.zeroTolerance[room];
		if (!zt) {
			return this.pmReply(translator.get(8, this.lang) + " " + Chat.italics(this.parser.getRoomTitle(room)) +
				" " + translator.get(9, this.lang));
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
				this.pmReply(translator.get(7, this.lang));
			} else {
				this.pmReply(link);
			}
		}.bind(this));
	},

	checkzerotolerance: function (App) {
		let room = this.parseRoomAliases(Text.toRoomid(this.args[0]));
		let user = Text.toId(this.args[1]) || this.byIdent.id;
		if (!user || !room) return this.errorReply(this.usage({desc: this.usageTrans('room')}, {desc: this.usageTrans('user'), optional: true}));
		if (!App.bot.rooms[room] || this.getRoomType(room) !== 'chat') {
			return this.errorReply(translator.get(10, this.lang) + " " + Chat.italics(room) +
				" " + translator.get(11, this.lang));
		}
		if (user.length > 19) {
			return this.errorReply(translator.get(0, this.lang));
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
			this.pmReply(translator.get(1, this.lang) + " " + Chat.italics(user) + " " + translator.get(12, this.lang) +
				" " + translator.get(4, this.lang) + " " + Chat.italics(this.parser.getRoomTitle(room)));
		} else {
			let level = config.zeroTolerance[room][user];
			this.pmReply(translator.get(1, this.lang) + " " + Chat.italics(user) + " " + translator.get(13, this.lang) +
				" (" + translator.get(3, this.lang) + ": " + level + ") " + translator.get(4, this.lang) +
				" " + Chat.italics(this.parser.getRoomTitle(room)));
		}
	},
};
