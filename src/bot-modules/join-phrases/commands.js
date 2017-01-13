/**
 * Commands File
 *
 * joinphrase: configures joinphrases
 * listjoinphrases: views joinphrases list
 * listjoinphraseshastebin: views joinphrases list (via Hastebin)
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Chat = Tools('chat');
const Hastebin = Tools('hastebin');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

module.exports = {
	joinphrase: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('joinphrases', this.room)) return this.replyAccessDenied('joinphrases');
		let config = App.modules.joinphrases.system.config;
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(this.mlt('nochat'));
		let user;
		switch (Text.toId(this.args[0])) {
		case 'add':
		case 'set':
			user = Text.toId(this.args[1]);
			let phrase = Text.trim(this.args.slice(2).join(','));
			if (!user || !phrase) {
				return this.errorReply(this.usage({desc: 'get'}, {desc: this.usageTrans('user')},
					{desc: this.mlt('phrase')}));
			}
			if (user.length > 19) return this.errorReply(this.mlt('inv'));
			if (!config.rooms[room]) config.rooms[room] = {};
			config.rooms[room][user] = phrase;
			App.modules.joinphrases.system.db.write();
			App.logCommandAction(this);
			this.reply(this.mlt(0) + ' ' + Chat.italics(user) + ' ' + this.mlt(1) +
				' ' + Chat.italics(this.parser.getRoomTitle(room)));
			break;
		case 'remove':
		case 'delete':
			user = Text.toId(this.args[1]);
			if (!user) return this.errorReply(this.usage({desc: 'get'}, {desc: this.usageTrans('user')}));
			if (config.rooms[room] && config.rooms[room][user]) {
				delete config.rooms[room][user];
				if (Object.keys(config.rooms[room]).length === 0) {
					delete config.rooms[room];
				}
				App.modules.joinphrases.system.db.write();
				App.logCommandAction(this);
				this.reply(this.mlt(2) + '' + Chat.italics(user) + ' ' + this.mlt(1) +
					' ' + Chat.italics(this.parser.getRoomTitle(room)));
			} else {
				this.errorReply(this.mlt(3) + ' ' + Chat.italics(user) + ' ' +
					this.mlt(1) + ' ' + Chat.italics(this.parser.getRoomTitle(room)));
			}
			break;
		case 'get':
			user = Text.toId(this.args[1]);
			if (!user) return this.errorReply(this.usage({desc: 'get'}, {desc: this.usageTrans('user')}));
			if (config.rooms[room] && config.rooms[room][user]) {
				this.reply(Text.stripCommands(config.rooms[room][user]));
			} else {
				this.errorReply(this.mlt(3) + ' ' + Chat.italics(user) + ' ' +
					this.mlt(1) + ' ' + Chat.italics(this.parser.getRoomTitle(room)));
			}
			break;
		default:
			this.errorReply(this.usage({desc: 'set / delete / get'}));
		}
	},

	listjoinphrases: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('joinphrases', this.room)) return this.replyAccessDenied('joinphrases');
		let config = App.modules.joinphrases.system.config;
		let server = App.config.server.url;
		if (!server) {
			this.cmd = 'listjoinphraseshastebin';
			return App.parser.exec(this);
		}
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(this.mlt('nochat'));
		if (!config.rooms[room]) {
			return this.errorReply(this.mlt(4) + " " + Chat.italics(this.parser.getRoomTitle(room)));
		}
		let html = '';
		html += '<html>';
		html += '<head><title>Join-Phrases of ' + Text.escapeHTML(this.parser.getRoomTitle(room)) + '</title></head>';
		html += '<body>';
		html += '<h3>Join-Phrases in ' + Text.escapeHTML(this.parser.getRoomTitle(room)) + '</h3>';
		html += '<ul>';
		for (let user in config.rooms[room]) {
			html += '<li>';
			html += '<strong>' + user + '</strong> - ';
			html += Text.escapeHTML(config.rooms[room][user]);
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

	listjoinphraseshastebin: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('joinphrases', this.room)) return this.replyAccessDenied('joinphrases');
		let config = App.modules.joinphrases.system.config;
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(this.mlt('nochat'));
		if (!config.rooms[room]) {
			return this.errorReply(this.mlt(4) + " " + Chat.italics(this.parser.getRoomTitle(room)));
		}
		let text = '';
		text += 'Join-Phrases in ' + this.parser.getRoomTitle(room) + ':\n\n';
		for (let user in config.rooms[room]) {
			text += user + ' - ';
			text += config.rooms[room][user];
			text += '\n';
		}
		Hastebin.upload(text, function (link, err) {
			if (err) {
				this.pmReply(this.mlt(5));
			} else {
				this.pmReply(link);
			}
		}.bind(this));
	},
};
