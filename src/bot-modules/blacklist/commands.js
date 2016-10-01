/**
 * Commands File
 */

'use strict';

const Path = require('path');
const Translator = Tools.get('translate.js');
const Text = Tools.get('text.js');
const Chat = Tools.get('chat.js');
const Hastebin = Tools.get('hastebin.js');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));

function tryGetRoomTitle(room) {
	if (App.bot.rooms[room]) {
		return Text.escapeHTML(App.bot.rooms[room].title || room);
	} else {
		return Text.escapeHTML(room);
	}
}

module.exports = {
	ab: "blacklist",
	blacklist: function () {
		if (!this.can('blacklist', this.room)) return this.replyAccessDenied('blacklist');
		let room = this.targetRoom;
		if (!room || this.getRoomType(room) !== 'chat') {
			return this.errorReply(translator.get('nochat', this.lang));
		}
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('user')}, {desc: '...', optional: true}));
		let added = [];
		for (let i = 0; i < this.args.length; i++) {
			let user = Text.toId(this.args[i]);
			if (!user || user.length > 19) continue;
			if (App.modules.blacklist.system.blacklist(room, user)) {
				added.push(user);
			}
		}
		if (added.length > 0) {
			this.reply(translator.get(0, this.lang) + " " + Chat.italics(room) + ": " + added.join(', '));
			App.modules.blacklist.system.db.write();
			App.logCommandAction(this);
			let cmds = App.modules.blacklist.system.getInitCmds();
			if (cmds.length) {
				App.bot.send(cmds);
			}
		} else {
			this.errorReply(translator.get(1, this.lang));
		}
	},

	unab: "unblacklist",
	unblacklist: function () {
		if (!this.can('blacklist', this.room)) return this.replyAccessDenied('blacklist');
		let room = this.targetRoom;
		if (!room || this.getRoomType(room) !== 'chat') {
			return this.errorReply(translator.get('nochat', this.lang));
		}
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('user')}, {desc: '...', optional: true}));
		let removed = [];
		for (let i = 0; i < this.args.length; i++) {
			let user = Text.toId(this.args[i]);
			if (App.modules.blacklist.system.unblacklist(room, user)) {
				removed.push(user);
			}
		}
		if (removed.length > 0) {
			this.reply(translator.get(2, this.lang) + " " + Chat.italics(room) + ": " + removed.join(', '));
			App.modules.blacklist.system.db.write();
			App.logCommandAction(this);
		} else {
			this.errorReply(translator.get(3, this.lang));
		}
	},

	vab: "viewblacklist",
	viewblacklist: function () {
		if (!this.can('blacklist', this.room)) return this.replyAccessDenied('blacklist');
		let room = this.targetRoom;
		if (!room || this.getRoomType(room) !== 'chat') {
			return this.errorReply(translator.get('nochat', this.lang));
		}
		let server = App.config.server.url;
		if (!server) {
			this.cmd = 'viewblacklisthastebin';
			return App.parser.exec(this);
		}
		let bl = App.modules.blacklist.system.data[room];
		if (!bl || Object.keys(bl).length === 0) {
			return this.pmReply(translator.get(5, this.lang) + " " + Chat.italics(room));
		}
		let html = '';
		html += '<html>';
		html += '<head><title>Blacklist of ' + tryGetRoomTitle(room) + '</title></head>';
		html += '<body>';
		html += '<h3>Users blaclisted in ' + tryGetRoomTitle(room) + '</h3>';
		html += '<ul>';
		let blUsers = Object.keys(bl).sort();
		for (let i = 0; i < blUsers.length; i++) {
			html += '<li>' + Text.escapeHTML(blUsers[i]) + '</li>';
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

	viewblacklisthastebin: function () {
		if (!this.can('blacklist', this.room)) return this.replyAccessDenied('blacklist');
		let room = this.targetRoom;
		if (!room || this.getRoomType(room) !== 'chat') {
			return this.errorReply(translator.get('nochat', this.lang));
		}
		let bl = App.modules.blacklist.system.data[room];
		if (!bl || Object.keys(bl).length === 0) {
			return this.pmReply(translator.get(5, this.lang) + " " + Chat.italics(room));
		}
		let text = '';
		text += 'Users blacklisted in ' + room + ':\n\n';
		let blUsers = Object.keys(bl).sort();
		for (let i = 0; i < blUsers.length; i++) {
			text += blUsers[i] + '\n';
		}
		Hastebin.upload(text, function (link, err) {
			if (err) {
				this.pmReply(translator.get(4, this.lang));
			} else {
				this.pmReply(link);
			}
		}.bind(this));
	},
};
