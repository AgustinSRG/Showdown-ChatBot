/**
 * Commands File
 *
 * usernamecolor: gets the color of an username
 */

'use strict';

const Path = require('path');

const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'usercolor.translations');

function botCanHtml(room, App) {
	let roomData = App.bot.rooms[room];
	let botid = Text.toId(App.bot.getBotNick());
	return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'bot'));
}

module.exports = {
	usercolor: "usernamecolor",
	usernamecolor: function (App) {
		this.setLangFile(Lang_File);
		let target = Text.toId(this.arg) || Text.toId(this.by);
		if (!target || target.length > 18) return this.pmReply(this.mlt('inv'));

		const targetName = (this.arg || this.byIdent.name).trim();

		const color = Chat.usernameColor(target);
		const link = 'https://www.w3schools.com/colors/colors_picker.asp?color=' + color.substring(1);

		if ((this.room && botCanHtml(this.room, App) && this.can("usernamecolor", this.room)) || botCanHtml('lobby', App)) {
			// HTML response
			let html = '';

			html += '<strong>' +
				Text.escapeHTML(this.mlt(2)) + ': </strong><strong style="color: ' + color + ';">' +
				Text.escapeHTML(targetName) + '</strong>';

			html += '<br>';

			html += '<strong>' +
				Text.escapeHTML(this.mlt(3)) + ': </strong><strong style="color: ' + color + ';">' +
				Text.escapeHTML(color) + '</strong> - <a href="' + Text.escapeHTML(link) + '" target="_blank">' + Text.escapeHTML(this.mlt(4)) + '</a>';

			if (this.room && botCanHtml(this.room, App) && this.can("usernamecolor", this.room)) {
				this.send("/addhtmlbox " + html, this.room);
			} else {
				this.send("/pminfobox " + this.byIdent.id + ", " + html, 'lobby');
			}
		} else {
			// Text response
			this.restrictReply(this.mlt(1) + " " + Chat.bold(targetName) + ": " + Chat.code(color) + " - " + link, "usernamecolor");
		}
	},
};
