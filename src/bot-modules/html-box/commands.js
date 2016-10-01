/**
 * Commands File
 */

'use strict';

const Path = require('path');
const Translator = Tools.get('translate.js');
const Text = Tools.get('text.js');
const Chat = Tools.get('chat.js');
const LineSplitter = Tools.get('line-splitter.js');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));

function botCanHtml(room) {
	let roomData = App.bot.rooms[room];
	let botid = Text.toId(App.bot.getBotNick());
	return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({group: roomData.users[botid]}, 'bot'));
}

module.exports = {
	html: 'htmlcmd',
	htmlcmd: function () {
		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(translator.get('nochat', this.lang));
		}
		if (!botCanHtml(this.room)) {
			return this.errorReply(translator.get('nobot', this.lang));
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
			return this.errorReply(translator.get(0, this.lang) + " " + Chat.italics(cmd) + " " + translator.get(1, this.lang));
		}
	},

	htmlcmdlist: function () {
		let list = Object.keys(App.modules.htmlbox.system.data.commands).sort();
		if (list.length === 0) {
			return this.errorReply(translator.get(2, this.lang));
		}
		let spl = new LineSplitter(App.config.bot.maxMessageLength);
		spl.add(Chat.bold(translator.get(3, this.lang) + ":"));
		for (let i = 0; i < list.length; i++) {
			spl.add(" " + list[i] + (i < (list.length - 1) ? ',' : ''));
		}
		return this.restrictReply(spl.getLines(), 'htmlboxcmd');
	},
};
