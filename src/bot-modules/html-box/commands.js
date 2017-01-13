/**
 * Commands File
 *
 * htmlcmd: runs an HTML command
 * htmlcmdlist: gets the HTML commands list
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Chat = Tools('chat');
const LineSplitter = Tools('line-splitter');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

function botCanHtml(room, App) {
	let roomData = App.bot.rooms[room];
	let botid = Text.toId(App.bot.getBotNick());
	return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({group: roomData.users[botid]}, 'bot'));
}

module.exports = {
	html: 'htmlcmd',
	htmlcmd: function (App) {
		this.setLangFile(Lang_File);
		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}
		if (!botCanHtml(this.room, App)) {
			return this.errorReply(this.mlt('nobot'));
		}
		const Mod = App.modules.htmlbox.system;
		let spl = this.arg.split(' ');
		let cmd = Text.toCmdid(spl[0]);
		let content = null;
		if (!cmd) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		if (Mod.data.commands[cmd]) {
			content = Mod.data.commands[cmd];
		} else if (Mod.data.aliases[cmd] && Mod.data.commands[Mod.data.aliases[cmd]]) {
			content = Mod.data.commands[Mod.data.aliases[cmd]];
		}
		if (content) {
			if (this.can('htmlboxcmd', this.room)) {
				return this.send('/addhtmlbox ' + content, this.room);
			} else {
				return this.send('/pminfobox  ' + this.byIdent.id + ',' + content, this.room);
			}
		} else {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(cmd) + " " + this.mlt(1));
		}
	},

	htmlcmdlist: function (App) {
		this.setLangFile(Lang_File);
		let list = Object.keys(App.modules.htmlbox.system.data.commands).sort();
		if (list.length === 0) {
			return this.errorReply(this.mlt(2));
		}
		let spl = new LineSplitter(App.config.bot.maxMessageLength);
		spl.add(Chat.bold(this.mlt(3) + ":"));
		for (let i = 0; i < list.length; i++) {
			spl.add(" " + list[i] + (i < (list.length - 1) ? ',' : ''));
		}
		return this.restrictReply(spl.getLines(), 'htmlboxcmd');
	},
};
