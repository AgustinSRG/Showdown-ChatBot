/**
 * Commands File
 *
 * exec: Runs a command
 * wall: Runs a command in wall context
 * execdyn: Run a dynamic command (ignores static commnads)
 */

'use strict';

const Path = require('path');

const Text = Tools.get('text.js');
const Chat = Tools.get('chat.js');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'exec-cmd.translations'));

module.exports = {
	"exec": function () {
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		let spl = this.arg.split(' ');
		this.cmd = Text.toCmdid(spl.shift());
		this.arg = spl.join(' ');
		this.args = this.arg.split(',');
		if (!this.parser.exec(this)) {
			if (!this.parser.execDyn(this)) {
				let exactCmd = this.parser.searchCommand(this.cmd);
				this.errorReply(translator.get(0, this.lang) + ' ' + Chat.italics(this.cmd) + ' ' + translator.get(1, this.lang) + '.' +
					(exactCmd ? (' ' + translator.get(2, this.lang) + ' ' + Chat.italics(exactCmd) + '?') : ''));
			}
		}
	},

	"wall": function () {
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		let spl = this.arg.split(' ');
		this.cmd = Text.toCmdid(spl.shift());
		this.arg = spl.join(' ');
		this.args = this.arg.split(',');
		this.wall = true;
		if (!this.parser.exec(this)) {
			if (!this.parser.execDyn(this)) {
				let exactCmd = this.parser.searchCommand(this.cmd);
				this.errorReply(translator.get(0, this.lang) + ' ' + Chat.italics(this.cmd) + ' ' + translator.get(1, this.lang) + '.' +
					(exactCmd ? (' ' + translator.get(2, this.lang) + ' ' + Chat.italics(exactCmd) + '?') : ''));
			}
		}
	},

	"execdyn": function () {
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		let spl = this.arg.split(' ');
		this.cmd = Text.toCmdid(spl.shift());
		this.arg = spl.join(' ');
		this.args = this.arg.split(',');
		if (!this.parser.execDyn(this)) {
			this.errorReply(translator.get(0, this.lang) + ' ' + Chat.italics(this.cmd) + ' ' + translator.get(1, this.lang) + '.');
		}
	},
};
