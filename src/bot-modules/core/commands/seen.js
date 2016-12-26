/**
 * Commands File
 *
 * seen: Gets the last time the bot saw an user
 * alts: Gets the known alts that the bot got via rename warnings
 */

'use strict';

const Path = require('path');

const Text = Tools('text');
const Chat = Tools('chat');
const Translator = Tools('translate');

const translator = new Translator(Path.resolve(__dirname, 'seen.translations'));

module.exports = {
	seen: function (App) {
		let targetUser = Text.toId(this.arg);
		if (!targetUser) {
			this.pmReply(this.usage({desc: this.usageTrans('user')}));
		} else if (targetUser.length > 19) {
			this.pmReply(translator.get('inv', this.lang));
		} else if (targetUser === this.byIdent.id) {
			this.pmReply(translator.get(0, this.lang));
		} else if (targetUser === Text.toId(App.bot.getBotNick())) {
			this.pmReply(translator.get(1, this.lang));
		} else if (App.userdata.users[targetUser] && App.userdata.users[targetUser].lastSeen) {
			let name = App.userdata.users[targetUser].name;
			let seen = App.userdata.users[targetUser].lastSeen;
			let time = Math.round((Date.now() - seen.time) / 1000);
			let times = [];
			let aux;
			/* Get Time difference */
			aux = time % 60; // Seconds
			if (aux > 0 || time === 0) times.unshift(aux + ' ' + (aux === 1 ? translator.get(2, this.lang) : translator.get(3, this.lang)));
			time = Math.floor(time / 60);
			aux = time % 60; // Minutes
			if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? translator.get(4, this.lang) : translator.get(5, this.lang)));
			time = Math.floor(time / 60);
			aux = time % 24; // Hours
			if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? translator.get(6, this.lang) : translator.get(7, this.lang)));
			time = Math.floor(time / 24); // Days
			if (time > 0) times.unshift(time + ' ' + (time === 1 ? translator.get(8, this.lang) : translator.get(9, this.lang)));
			/* Reply */
			let reply = translator.get(15, this.lang) + ' ' + Chat.bold(name) + ' ' +
				translator.get('seen', this.lang) + ' ' + Chat.italics(times.join(', ')) + ' ';
			let ago = translator.get('ago', this.lang);
			if (ago) reply += ago + ' ';
			switch (seen.type) {
			case 'J':
				reply += translator.get(10, this.lang) + ' ';
				break;
			case 'L':
				reply += translator.get(11, this.lang) + ' ';
				break;
			case 'C':
				reply += translator.get(12, this.lang) + ' ';
				break;
			case 'R':
				reply += translator.get(13, this.lang) + ' ' + Chat.bold(seen.detail);
				break;
			}
			if (seen.type in {'J': 1, 'L': 1, 'C': 1}) {
				let privates = (App.config.modules.core.privaterooms || []);
				if (privates.indexOf(seen.room) >= 0) {
					reply += translator.get(14, this.lang) + '.'; // Private Room
				} else {
					reply += Chat.room(seen.room); // Public Room
				}
			}
			this.pmReply(reply);
		} else {
			this.pmReply(translator.get(15, this.lang) + ' ' + Chat.italics(targetUser) + ' ' + translator.get(16, this.lang));
		}
	},

	alts: function (App) {
		let targetUser = Text.toId(this.arg);
		if (!targetUser) {
			this.pmReply(this.usage({desc: this.usageTrans('user')}));
		} else if (targetUser.length > 19) {
			this.pmReply(translator.get('inv', this.lang));
		} else if (App.userdata.users[targetUser]) {
			let alts = App.userdata.getAlts(targetUser);
			if (alts.length > 10) {
				this.pmReply(translator.get(17, this.lang) + ' ' +
					Chat.bold(App.userdata.users[targetUser].name) + ': ' + alts.slice(0, 10).join(', ').trim() +
					", (" + (alts.length - 10) + ' ' + translator.get('more', this.lang) + ')');
			} else if (alts.length > 0) {
				this.pmReply(translator.get(17, this.lang) + ' ' +
					Chat.bold(App.userdata.users[targetUser].name) + ': ' + alts.join(', ').trim() + '');
			} else {
				this.pmReply(translator.get(18, this.lang) + ' ' + Chat.italics(targetUser) + '');
			}
		}
	},
};
