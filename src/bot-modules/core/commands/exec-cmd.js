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
		if (!App.parser.exec(this)) {
			if (!App.parser.execDyn(this)) {
				this.errorReply(translator.get(0, this.lang) + ' ' + Chat.italics(this.cmd) + ' ' + translator.get(1, this.lang) + '.');
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
		if (!App.parser.exec(this)) {
			if (!App.parser.execDyn(this)) {
				this.errorReply(translator.get(0, this.lang) + ' ' + Chat.italics(this.cmd) + ' ' + translator.get(1, this.lang) + '.');
			}
		}
	},

	"execdyn": function () {
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		let spl = this.arg.split(' ');
		this.cmd = Text.toCmdid(spl.shift());
		this.arg = spl.join(' ');
		this.args = this.arg.split(',');
		if (!App.parser.execDyn(this)) {
			this.errorReply(translator.get(0, this.lang) + ' ' + Chat.italics(this.cmd) + ' ' + translator.get(1, this.lang) + '.');
		}
	},
};
