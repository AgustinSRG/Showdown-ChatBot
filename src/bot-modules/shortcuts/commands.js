/**
 * Commands File
 *
 * shortcutcmd: runs a shortcut command
 * makeshortcut: adds an option to a shortcut command
 * rmshortcut: removes an option from a shortcut command
 * setshortcutalias: Sets an alias to a shortcut command
 * rmshortcutalias: Removes an alias to a shortcut command
 * showshortcut: Shows content of a shortcut command
 * listshortcut: Shows list of shortcut commands
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

module.exports = {
	shortcutcmd: function (App) {
		this.setLangFile(Lang_File);

		if (this.isShortcut) {
			return this.errorReply(this.mlt('noloop'));
		}

		if (!this.can('shortcut', this.room)) return this.replyAccessDenied('shortcut');

		const Mod = App.modules.shortcuts.system;
		let spl = this.arg.split(' ');
		let cmd = Text.toCmdid(spl[0]);
		let content = null;
		if (!cmd) return this.errorReply(this.usage({ desc: this.usageTrans('command') }));
		if (Mod.data.commands[cmd]) {
			content = Mod.data.commands[cmd];
		} else if (Mod.data.aliases[cmd] && Mod.data.commands[Mod.data.aliases[cmd]]) {
			content = Mod.data.commands[Mod.data.aliases[cmd]];
		}
		if (content) {
			const options = content.split("&&").map(function (a) {
				return a.trim();
			}).slice(0, 5);

			for (let opt of options) {
				this.parser.parse(opt, this.room, this.by, true);
			}
		} else {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(this.token + cmd) + " " + this.mlt(1));
		}
	},

	"seeshortcut": "showshortcut",
	showshortcut: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('shortcutadmin', this.room)) return this.replyAccessDenied('shortcutadmin');
		const cmd = Text.toId(this.args[0]);

		if (!cmd) {
			return this.errorReply(this.usage({ desc: this.usageTrans('command') }));
		}

		const Mod = App.modules.shortcuts.system;

		let prevOptions = (Mod.data.commands[cmd] || "").split("&&").map(function (a) {
			return a.trim();
		}).filter(function (a) {
			return !!a;
		});

		if (prevOptions.length === 0) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(this.token + cmd) + " " + this.mlt(1));
		}

		let text = this.mlt(2) + ": " + this.token + cmd + ":\n";

		for (let opt of prevOptions) {
			text += "\n    " + opt;
		}

		return this.replyCommand("!code " + text);
	},

	listshortcut: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('shortcutadmin', this.room)) return this.replyAccessDenied('shortcutadmin');
		let list = Object.keys(App.modules.shortcuts.system.data.commands).sort();
		if (list.length === 0) {
			return this.errorReply(this.mlt(3));
		}
		let text = this.mlt(4) + ":\n";

		for (let cmd of list) {
			text += "\n    " + this.token + cmd;
		}

		return this.replyCommand("!code " + text);
	},

	makeshortcut: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('shortcutadmin', this.room)) return this.replyAccessDenied('shortcutadmin');

		const cmd = Text.toId(this.args[0]);
		const option = this.args.slice(1).join(",").trim();

		if (!cmd || !option) {
			return this.errorReply(this.usage({ desc: this.usageTrans('command') }, { desc: this.token + "cmd1 && " + this.token + "cmd2 && ..." }));
		}

		const Mod = App.modules.shortcuts.system;

		const options = option.split("&&").map(function (a) {
			return a.trim();
		}).filter(a => {
			return !!a;
		});

		if (options.length === 0) {
			return this.errorReply(this.usage({ desc: this.usageTrans('command') }, { desc: this.token + "cmd1 && " + this.token + "cmd2 && ..." }));
		}

		if (options.length > 5) {
			return this.errorReply(this.mlt(5));
		}

		Mod.data.commands[cmd] = options.join("&&");
		Mod.db.write();
		this.addToSecurityLog();

		this.reply(this.mlt(6) + ": " + Chat.italics(this.token + cmd));
	},

	rmshortcut: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('shortcutadmin', this.room)) return this.replyAccessDenied('shortcutadmin');

		const cmd = Text.toId(this.args[0]);

		if (!cmd) {
			return this.errorReply(this.usage({ desc: this.usageTrans('command') }));
		}

		const Mod = App.modules.shortcuts.system;

		if (!Mod.data.commands[cmd]) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(this.token + cmd) + " " + this.mlt(1));
		}

		delete Mod.data.commands[cmd];

		Mod.db.write();
		this.addToSecurityLog();

		this.reply(this.mlt(7) + ": " + Chat.italics(this.token + cmd));
	},

	setshortcutalias: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('shortcutadmin', this.room)) return this.replyAccessDenied('shortcutadmin');

		const alias = Text.toId(this.args[0]);
		const cmd = Text.toId(this.args[1]);

		if (!alias || !cmd) {
			return this.errorReply(this.usage({ desc: this.mlt("alias") }, { desc: this.usageTrans('command') }));
		}

		const Mod = App.modules.shortcuts.system;

		if (!Mod.data.commands[cmd]) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(this.token + cmd) + " " + this.mlt(1));
		}

		Mod.data.aliases[alias] = cmd;
		Mod.db.write();
		this.addToSecurityLog();

		this.reply(this.mlt(8) + ": " + Chat.italics(this.token + alias) + " " + this.mlt("for") + " " + Chat.italics(this.token + cmd));
	},

	rmshortcutalias: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('shortcutadmin', this.room)) return this.replyAccessDenied('shortcutadmin');

		const alias = Text.toId(this.args[0]);

		if (!alias) {
			return this.errorReply(this.usage({ desc: this.mlt("alias") }));
		}

		const Mod = App.modules.shortcuts.system;

		if (!Mod.data.aliases[alias]) {
			return this.errorReply(this.mlt(9) + ": " + Chat.italics(this.token + alias));
		}

		delete Mod.data.aliases[alias];
		Mod.db.write();
		this.addToSecurityLog();

		this.reply(this.mlt(10) + ": " + Chat.italics(this.token + alias));
	},
};
