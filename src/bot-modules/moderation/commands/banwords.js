/**
 * Commands File
 *
 * banword: adds a banned word
 * unbanword: removes a banned word
 * viewbannedwords: gets a list with the banned words
 * viewbannedwordshastebin: gets a list with the banned words (via Hastebin)
 */

'use strict';

const Path = require('path');

const Text = Tools('text');
const Chat = Tools('chat');
const Translator = Tools('translate');
const Hastebin = Tools('hastebin');

const translator = new Translator(Path.resolve(__dirname, 'banwords.translations'));

module.exports = {
	banword: function (App) {
		if (!this.can('banword', this.room)) return this.replyAccessDenied('banword');
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
		const config = App.modules.moderation.system.data;
		let word = this.args[0].toLowerCase().trim();
		let type = Text.toId(this.args[1]) || 'banned';
		let punishment = Text.toId(this.args[2]) || 'mute';
		let strictMode = Text.toId(this.args[3]) || 'std';
		let nicks = Text.toId(this.args[4]) || 'std';
		console.log(word + ' | ' + type + ' | ' + punishment + ' | ' + strictMode + ' | ' + nicks);
		if (!word || !(type in {'banned': 1, 'inap': 1, 'insult': 1}) || !(strictMode in {'std': 1, 'strict': 1}) || !(nicks in {'std': 1, 'ignorenicks': 1})) {
			return this.errorReply(this.usage({desc: translator.get('word', this.lang)}, {desc: 'banned/inap/insult', optional: true},
				{desc: translator.get('punishment', this.lang), optional: true}, {desc: 'std/strict', optional: true},
				{desc: 'std/ignorenicks', optional: true}));
		}
		if (config.punishments.indexOf(punishment) === -1) {
			return this.errorReply(translator.get(0, this.lang) + ": " + config.punishments.join(', '));
		}
		if (config.bannedWords[room] && config.bannedWords[room][word]) {
			return this.errorReply(translator.get(1, this.lang) + " \"" + word + "\" " + translator.get(2, this.lang) +
				" " + Chat.italics(this.parser.getRoomTitle(room)));
		}
		if (!config.bannedWords[room]) config.bannedWords[room] = {};
		config.bannedWords[room][word] = {};
		config.bannedWords[room][word].strict = (strictMode === 'strict');
		config.bannedWords[room][word].nonicks = (nicks === 'ignorenicks');
		switch (type) {
		case 'banned':
			config.bannedWords[room][word].type = 'b';
			break;
		case 'inap':
			config.bannedWords[room][word].type = 'i';
			break;
		case 'insult':
			config.bannedWords[room][word].type = 'o';
			break;
		}
		config.bannedWords[room][word].val = config.punishments.indexOf(punishment) + 1;
		App.modules.moderation.system.db.write();
		App.logCommandAction(this);
		this.reply(translator.get(1, this.lang) + " \"" + word + "\" " + translator.get(3, this.lang) +
			" " + Chat.italics(this.parser.getRoomTitle(room)));
	},

	unbanword: function (App) {
		if (!this.can('banword', this.room)) return this.replyAccessDenied('banword');
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
		const config = App.modules.moderation.system.data;
		let word = this.args[0].toLowerCase().trim();
		if (!word) return this.errorReply(this.usage({desc: translator.get('word', this.lang)}));
		if (!config.bannedWords[room] || !config.bannedWords[room][word]) {
			return this.errorReply(translator.get(1, this.lang) + " \"" + word + "\" " + translator.get(4, this.lang) +
				" " + Chat.italics(this.parser.getRoomTitle(room)));
		}
		delete config.bannedWords[room][word];
		if (Object.keys(config.bannedWords[room]).length === 0) {
			delete config.bannedWords[room];
		}
		App.modules.moderation.system.db.write();
		App.logCommandAction(this);
		this.reply(translator.get(1, this.lang) + " \"" + word + "\" " + translator.get(5, this.lang) +
			" " + Chat.italics(this.parser.getRoomTitle(room)));
	},

	viewbannedwords: function (App) {
		if (!this.can('viewbanwords', this.room)) return this.replyAccessDenied('viewbanwords');
		let server = App.config.server.url;
		if (!server) {
			this.cmd = 'viewbannedwordshastebin';
			return App.parser.exec(this);
		}
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
		const config = App.modules.moderation.system.data;
		let words = config.bannedWords[room];
		if (!words) return this.pmReply(translator.get(6, this.lang) + " " + Chat.italics(this.parser.getRoomTitle(room)));
		let html = '';
		html += '<html>';
		html += '<head><title>Banned Words of ' + Text.escapeHTML(App.parser.getRoomTitle(room)) + '</title></head>';
		html += '<body>';
		html += '<h3>Banned Words in ' + Text.escapeHTML(App.parser.getRoomTitle(room)) + '</h3>';
		html += '<ul>';
		words = Object.keys(words).sort();
		for (let i = 0; i < words.length; i++) {
			let word = words[i];
			html += '<li>';
			html += '<strong>' + Text.escapeHTML(word) + '</strong>';
			html += '&nbsp;|&nbsp;';
			switch (config.bannedWords[room][word].type) {
			case 'b':
				html += 'Type: Banned';
				break;
			case 'i':
				html += 'Type: Inapropiate';
				break;
			case 'o':
				html += 'Type: Insult / Offensive';
				break;
			}
			html += '&nbsp;|&nbsp;';
			html += 'Punishment: ' + App.modules.moderation.system.modBot.getPunishment(config.bannedWords[room][word].val);
			if (config.bannedWords[room][word].strict) {
				html += '&nbsp;|&nbsp;';
				html += 'Strict Word';
			}
			if (config.bannedWords[room][word].nonicks) {
				html += '&nbsp;|&nbsp;';
				html += 'Ignore Nicknames';
			}
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

	viewbannedwordshastebin: function (App) {
		if (!this.can('viewbanwords', this.room)) return this.replyAccessDenied('viewbanwords');
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
		const config = App.modules.moderation.system.data;
		let words = config.bannedWords[room];
		if (!words) return this.pmReply(translator.get(6, this.lang) + " " + Chat.italics(this.parser.getRoomTitle(room)));
		let text = '';
		text += 'Banned Words in ' + this.parser.getRoomTitle(room) + ':\n\n';
		words = Object.keys(words).sort();
		for (let i = 0; i < words.length; i++) {
			let word = words[i];
			text += word + ' | ';
			switch (config.bannedWords[room][word].type) {
			case 'b':
				text += 'Type: Banned';
				break;
			case 'i':
				text += 'Type: Inapropiate';
				break;
			case 'o':
				text += 'Type: Insult / Offensive';
				break;
			}
			text += ' | ';
			text += 'Punishment: ' + App.modules.moderation.system.modBot.getPunishment(config.bannedWords[room][word].val);
			if (config.bannedWords[room][word].strict) {
				text += ' | ';
				text += 'Strict Word';
			}
			if (config.bannedWords[room][word].nonicks) {
				text += ' | ';
				text += 'Ignore Nicknames';
			}
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
};
