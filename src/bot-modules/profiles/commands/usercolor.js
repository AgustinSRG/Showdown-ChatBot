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

module.exports = {
	usercolor: "usernamecolor",
	usernamecolor: function (App) {
		this.setLangFile(Lang_File);
		let target = Text.toId(this.arg) || Text.toId(this.by);
		if (!target || target.length > 18) return this.pmReply(this.mlt('inv'));

		const Mod = App.modules.profiles.system;

		const targetName = (this.arg || this.byIdent.name).trim();

		const color = Chat.usernameColor(target);
		const linkColor = 'https://www.w3schools.com/colors/colors_picker.asp?color=' + color.substring(1);

		const customColor = Mod.getCustomColor(target);
		const customColorName = Mod.getCustomColorUsername(target);
		const linkCustomColor = customColor ? ('https://www.w3schools.com/colors/colors_picker.asp?color=' + customColor.substring(1)) : null;

		// HTML response
		let html = '';

		const effectiveColor = customColor || color;

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

		if (customColor) {
			html += '<br>';
			html += '<strong>' +
				Text.escapeHTML(this.mlt(5)) + ': </strong><strong style="color: ' + color + ';">' +
				Text.escapeHTML(color) + '</strong> (<strong style="color: ' + color + ';">' +
				Text.escapeHTML(targetName) + '</strong>)';
		}

		// Text response
		let txtResponse;
		if (customColor) {
			txtResponse = this.mlt(1) +
				" " + Chat.bold(targetName) + ": " + Chat.code(customColor) +
				" (" + this.mlt(6) + " " + Chat.code(customColorName) + ")" +
				" - " +
				linkCustomColor + " | " +
				this.mlt(5) + ": " + Chat.code(color) + " - " + linkColor;
		} else {
			txtResponse = this.mlt(1) + " " + Chat.bold(targetName) + ": " + Chat.code(color) + " - " + linkColor;
		}

		this.htmlRestrictReplyNoImages(html, 'usernamecolor', txtResponse);
	},
};
