/**
 * Commands File
 *
 * exec: Runs a command
 * wall: Runs a command in wall context
 * execdyn: Run a dynamic command (ignores static commnads)
 */

'use strict';

const Path = require('path');

const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'exec-cmd.translations');

module.exports = {
	"exec": function () {
		this.setLangFile(Lang_File);
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		let spl = this.arg.split(' ');
		this.cmd = Text.toCmdid(spl.shift());
		this.arg = spl.join(' ');
		this.args = this.arg.split(',');
		if (!this.parser.exec(this)) {
			if (!this.parser.execDyn(this)) {
				let exactCmd = this.parser.searchCommand(this.cmd);
				this.errorReply(this.mlt(0) + ' ' + Chat.italics(this.cmd) + ' ' + this.mlt(1) + '.' +
					(exactCmd ? (' ' + this.mlt(2) + ' ' + Chat.italics(exactCmd) + '?') : '') + " " + this.mlt(3) + " " + Chat.code(this.token + "help") + " " + this.mlt(4) + ".");
			}
		}
	},

	"wall": function () {
		this.setLangFile(Lang_File);
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		let spl = this.arg.split(' ');
		this.cmd = Text.toCmdid(spl.shift());
		this.arg = spl.join(' ');
		this.args = this.arg.split(',');
		this.wall = true;
		if (!this.parser.exec(this)) {
			if (!this.parser.execDyn(this)) {
				let exactCmd = this.parser.searchCommand(this.cmd);
				this.errorReply(this.mlt(0) + ' ' + Chat.italics(this.cmd) + ' ' + this.mlt(1) + '.' +
					(exactCmd ? (' ' + this.mlt(2) + ' ' + Chat.italics(exactCmd) + '?') : '') + " " + this.mlt(3) + " " + Chat.code(this.token + "help") + " " + this.mlt(4) + ".");
			}
		}
	},

	"execdyn": function () {
		this.setLangFile(Lang_File);
		if (!this.arg) return this.errorReply(this.usage({desc: this.usageTrans('command')}));
		let spl = this.arg.split(' ');
		this.cmd = Text.toCmdid(spl.shift());
		this.arg = spl.join(' ');
		this.args = this.arg.split(',');
		if (!this.parser.execDyn(this)) {
			this.errorReply(this.mlt(0) + ' ' + Chat.italics(this.cmd) + ' ' + this.mlt(1) + '.');
		}
	},
};
