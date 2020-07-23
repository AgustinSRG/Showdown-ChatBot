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

const Lang_File = Path.resolve(__dirname, 'seen.translations');
const Max_Alts_No_Full = 7;

module.exports = {
	seen: function (App) {
		this.setLangFile(Lang_File);
		let targetUser = Text.toId(this.arg);
		if (!targetUser) {
			this.pmReply(this.usage({ desc: this.usageTrans('user') }));
		} else if (targetUser.length > 19) {
			this.pmReply(this.mlt('inv'));
		} else if (targetUser === this.byIdent.id) {
			this.pmReply(this.mlt(0));
		} else if (targetUser === Text.toId(App.bot.getBotNick())) {
			this.pmReply(this.mlt(1));
		} else {
			let userData = App.userdata.getLastSeen(targetUser);
			if (userData) {
				let name = userData.name || targetUser;
				let seen = userData.lastSeen;
				let time = Math.round((Date.now() - seen.time) / 1000);
				let times = [];
				let aux;
				/* Get Time difference */
				aux = time % 60; // Seconds
				if (aux > 0 || time === 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(2) : this.mlt(3)));
				time = Math.floor(time / 60);
				aux = time % 60; // Minutes
				if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(4) : this.mlt(5)));
				time = Math.floor(time / 60);
				aux = time % 24; // Hours
				if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(6) : this.mlt(7)));
				time = Math.floor(time / 24); // Days
				if (time > 0) times.unshift(time + ' ' + (time === 1 ? this.mlt(8) : this.mlt(9)));
				/* Reply */
				let reply = this.mlt(15) + ' ' + Chat.bold(name) + ' ' +
					this.mlt('seen') + ' ' + Chat.italics(times.join(', ')) + ' ';
				let ago = this.mlt('ago');
				if (ago) reply += ago + ' ';
				switch (seen.type) {
					case 'J':
						reply += this.mlt(10) + ' ';
						break;
					case 'L':
						reply += this.mlt(11) + ' ';
						break;
					case 'C':
						reply += this.mlt(12) + ' ';
						break;
					case 'R':
						reply += this.mlt(13) + ' ' + Chat.bold(seen.detail);
						break;
				}
				if (seen.type in { 'J': 1, 'L': 1, 'C': 1 }) {
					let privates = (App.config.modules.core.privaterooms || []);
					if (privates.indexOf(seen.room) >= 0) {
						reply += this.mlt(14) + '.'; // Private Room
					} else if (seen.room.substr(0, 7) === "battle-") {
						reply += this.mlt('14b') + '.'; // Battle
					} else if (seen.room.substr(0, 10) === "groupchat-") {
						reply += this.mlt('14c') + '.'; // Groupchat
					} else {
						reply += Chat.room(seen.room); // Public Room
					}
				}
				this.pmReply(reply);
			} else {
				this.pmReply(this.mlt(15) + ' ' + Chat.italics(targetUser) + ' ' + this.mlt(16));
			}
		}
	},

	alts: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('alts', this.room)) return this.replyAccessDenied('alts');
		let targetUser = Text.toId(this.arg);
		let canFull = this.can('fullalts', this.room);
		if (!targetUser) {
			this.pmReply(this.usage({ desc: this.usageTrans('user') }));
		} else if (targetUser.length > 19) {
			this.pmReply(this.mlt('inv'));
		} else {
			let userData = App.userdata.getLastSeen(targetUser);
			let name = userData ? userData.name : targetUser;
			let alts = App.userdata.getAlts(targetUser);
			if (alts.length > Max_Alts_No_Full) {
				let fullLink = "";

				if (canFull) {
					let key = App.data.temp.createTempFile(
						"<html>" +
						"<body><p>" +
						this.mlt(17) + ' <b>' +
						Text.escapeHTML(name) + '</b>:</p><p> ' +
						Text.escapeHTML(alts.join(", ")) +
						"</p></body>" +
						"</html>"
					);

					fullLink = this.mlt("seelist") + ": " + App.server.getControlPanelLink('/temp/' + key);
				}

				this.pmReply(this.mlt(17) + ' ' +
					Chat.bold(name) + ': ' + alts.slice(0, Max_Alts_No_Full).join(', ').trim() +
					", (" + (alts.length - Max_Alts_No_Full) + ' ' + this.mlt('more') + '). ' + fullLink);
			} else if (alts.length > 0) {
				this.pmReply(this.mlt(17) + ' ' +
					Chat.bold(name) + ': ' + alts.join(', ').trim());
			} else {
				this.pmReply(this.mlt(18) + ' ' + Chat.italics(name) + '');
			}
		}
	},
};
