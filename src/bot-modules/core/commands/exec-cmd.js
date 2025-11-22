/**
 * Commands File
 *
 * exec: Runs a command
 * wall: Runs a command in wall context
 * nohtml: Runs a command in a no-html context
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
		if (!this.arg) return this.errorReply(this.usage({ desc: this.usageTrans('command') }));
		let spl = this.arg.split(' ');
		this.cmd = Text.toCmdid(spl.shift());
		this.arg = spl.join(' ');
		this.args = this.arg.split(',');

		this.parser.run(this);
	},

	"wall": function () {
		this.setLangFile(Lang_File);
		if (!this.arg) return this.errorReply(this.usage({ desc: this.usageTrans('command') }));
		let spl = this.arg.split(' ');
		this.cmd = Text.toCmdid(spl.shift());
		this.arg = spl.join(' ');
		this.args = this.arg.split(',');
		this.wall = true;

		this.parser.run(this);
	},

	"nohtml": function () {
		this.setLangFile(Lang_File);
		if (!this.arg) return this.errorReply(this.usage({ desc: this.usageTrans('command') }));
		let spl = this.arg.split(' ');
		this.cmd = Text.toCmdid(spl.shift());
		this.arg = spl.join(' ');
		this.args = this.arg.split(',');
		this.noHtml = true;

		this.parser.run(this);
	},

	"execdyn": function () {
		this.setLangFile(Lang_File);
		if (!this.arg) return this.errorReply(this.usage({ desc: this.usageTrans('command') }));
		let spl = this.arg.split(' ');
		this.cmd = Text.toCmdid(spl.shift());
		this.arg = spl.join(' ');
		this.args = this.arg.split(',');
		if (!this.parser.execDyn(this)) {
			this.errorReply(this.mlt(0) + ' ' + Chat.italics(this.cmd) + ' ' + this.mlt(1) + '.');
		}
	},
};
