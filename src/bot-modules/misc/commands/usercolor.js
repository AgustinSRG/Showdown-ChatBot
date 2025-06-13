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

		const Mod = App.modules.misc.system;

		const targetName = (this.arg || this.byIdent.name).trim();

		const color = Chat.usernameColor(target);
		const linkColor = 'https://www.w3schools.com/colors/colors_picker.asp?color=' + color.substring(1);

		const customColor = Mod.getCustomColor(target);
		const customColorName = Mod.getCustomColorUsername(target);
		const linkCustomColor = customColor ? ('https://www.w3schools.com/colors/colors_picker.asp?color=' + customColor.substring(1)) : null;

		if ((this.room && botCanHtml(this.room, App) && this.can("usernamecolor", this.room)) || botCanHtml('lobby', App)) {
			// HTML response
			let html = '';

			const effectiveColor = customColor || color;
			const effectiveColorLink = linkCustomColor || linkColor;

			html += '<strong>' +
				Text.escapeHTML(this.mlt(2)) + ': </strong><strong style="color: ' + effectiveColor + ';">' +
				Text.escapeHTML(targetName) + '</strong>';

			html += '<br>';

			html += '<strong>' +
				Text.escapeHTML(this.mlt(3)) + ': </strong><strong style="color: ' + effectiveColor + ';">' +
				Text.escapeHTML(effectiveColor) + '</strong>';

			if (customColorName) {
				html += ' (' + this.mlt(6) + " " + '<strong style="color: ' + effectiveColor + ';">' + Text.escapeHTML(customColorName) + '</strong>)';
			}

			html += ' - <a href="' + Text.escapeHTML(effectiveColorLink) + '" target="_blank">' + Text.escapeHTML(this.mlt(4)) + '</a>';

			if (customColor) {
				html += '<br>';
				html += '<strong>' +
					Text.escapeHTML(this.mlt(5)) + ': </strong><strong style="color: ' + color + ';">' +
					Text.escapeHTML(color) + '</strong> (<strong style="color: ' + color + ';">' +
					Text.escapeHTML(targetName) + '</strong>) - <a href="' + Text.escapeHTML(linkColor) + '" target="_blank">' + Text.escapeHTML(this.mlt(4)) + '</a>';
			}

			if (this.room && botCanHtml(this.room, App) && this.can("usernamecolor", this.room)) {
				this.send("/addhtmlbox " + html, this.room);
			} else {
				this.send("/pminfobox " + this.byIdent.id + ", " + html, 'lobby');
			}
		} else {
			// Text response
			if (customColor) {
				this.restrictReply(this.mlt(1) +
					" " + Chat.bold(targetName) + ": " + Chat.code(customColor) +
					" (" + this.mlt(6) + " " + Chat.code(customColorName) + ")" +
					" - " +
					linkCustomColor + " | " +
					this.mlt(5) + ": " + Chat.code(color) + " - " + linkColor, "usernamecolor");
			} else {
				this.restrictReply(this.mlt(1) + " " + Chat.bold(targetName) + ": " + Chat.code(color) + " - " + linkColor, "usernamecolor");
			}
		}
	},
};
