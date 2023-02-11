/**
 * Commands File
 *
 * randcmd: runs a randomized command
 * addrand: adds an option to a randomized command
 * rmrand: removes an option from a randomized command
 * rmallrand: removes an entire randomized command
 * setrandalias: Sets an alias to a randomized command
 * rmrandalias: Removes an alias to a randomized command
 * showrand: Shows content of a randomized command
 * listrand: Shows list of randomized commands
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

function botCanHtml(room, App) {
	let roomData = App.bot.rooms[room];
	let botid = Text.toId(App.bot.getBotNick());
	return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'bot'));
}

function botCanUseBasicCommands(room, App) {
	let roomData = App.bot.rooms[room];
	let botid = Text.toId(App.bot.getBotNick());
	return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'driver'));
}

module.exports = {
	randcmd: function (App) {
		this.setLangFile(Lang_File);
		let canCommands = this.can('randcmd', this.room) && this.getRoomType(this.room) === 'chat' && botCanHtml(this.room, App);
		let canBasicCommands = this.can('randcmd', this.room) && this.getRoomType(this.room) === 'chat' && botCanUseBasicCommands(this.room, App);

		const Mod = App.modules.randcmd.system;
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
			const options = content.split("\n").map(function (a) {
				return a.trim();
			}).filter(function (a) {
				if (!canCommands && a.startsWith("/addhtmlbox")) {
					return false;
				}
				if (!canBasicCommands && (a.startsWith("!") || a.startsWith("/"))) {
					return false;
				}
				return !!a;
			});

			if (options.length === 0) {
				if (!this.can('randcmd', this.room)) {
					return this.replyAccessDenied('randcmd');
				}
				if (this.getRoomType(this.room) !== 'chat') {
					return this.errorReply(this.mlt('nochat'));
				}
				return this.errorReply(this.mlt('nobot'));
			}

			let replyText = ((options[Math.floor(Math.random() * options.length)] || "") + "").trim();

			const COMMAND_EXCEPTIONS = [
				"/addhtmlbox",
				"/events",
			];

			let hasExemptedCommand = false;

			for (let cmd of COMMAND_EXCEPTIONS) {
				if (replyText.startsWith(cmd + " ")) {
					hasExemptedCommand = true;
					break;
				}
			}

			if (App.parser.data.infocmds) {
				const extraCommands = (App.parser.data.infocmds + "").split(",");
				for (let cmd of extraCommands) {
					const cmdTrim = cmd.trim();
					if (!cmdTrim) {
						continue;
					}
					if (replyText.startsWith(cmdTrim + " ")) {
						hasExemptedCommand = true;
						break;
					}
				}
			}

			if (!canBasicCommands) {
				this.restrictReply(Text.stripCommands(replyText), 'quote');
			} else if (replyText.startsWith("/wall ") || replyText.startsWith("/announce ")) {
				replyText = replyText.split(" ").slice(1).join(" ");

				if (replyText) {
					this.replyCommand("/announce " + replyText);
				}
			} else if (hasExemptedCommand || replyText.startsWith("!")) {
				this.replyCommand(replyText);
			} else {
				this.reply(Text.stripCommands(replyText));
			}
		} else {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(this.token + cmd) + " " + this.mlt(1));
		}
	},

	"seerand": "showrand",
	showrand: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('randadmin', this.room)) return this.replyAccessDenied('randadmin');
		const cmd = Text.toId(this.args[0]);

		if (!cmd) {
			return this.errorReply(this.usage({ desc: this.usageTrans('command') }));
		}

		const Mod = App.modules.randcmd.system;

		let prevOptions = (Mod.data.commands[cmd] || "").split("\n").map(function (a) {
			return a.trim();
		}).filter(function (a) {
			return !!a;
		});

		if (prevOptions.length === 0) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(this.token + cmd) + " " + this.mlt(1));
		}

		let text = this.mlt(9) + ": " + this.token + cmd + ":\n";

		for (let opt of prevOptions) {
			text += "\n    - " + opt;
		}

		return this.replyCommand("!code " + text);
	},

	listrand: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('randadmin', this.room)) return this.replyAccessDenied('randadmin');
		let list = Object.keys(App.modules.randcmd.system.data.commands).sort();
		if (list.length === 0) {
			return this.errorReply(this.mlt(13));
		}
		let text = this.mlt(3) + ":\n";

		for (let cmd of list) {
			text += "\n    " + this.token + cmd;
		}

		return this.replyCommand("!code " + text);
	},

	addrand: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('randadmin', this.room)) return this.replyAccessDenied('randadmin');

		const cmd = Text.toId(this.args[0]);
		const option = this.args.slice(1).join(",").trim();

		if (!cmd || !option) {
			return this.errorReply(this.usage({ desc: this.usageTrans('command') }, { desc: this.mlt("opt") }));
		}

		const Mod = App.modules.randcmd.system;

		let prevOptions = (Mod.data.commands[cmd] || "").split("\n").map(function (a) {
			return a.trim();
		}).filter(function (a) {
			return !!a;
		});

		if (prevOptions.indexOf(option) >= 0) {
			return this.errorReply(this.mlt(4) + ": " + Chat.italics(this.token + cmd));
		}

		prevOptions.push(option);

		Mod.data.commands[cmd] = prevOptions.join("\n");
		Mod.db.write();
		this.addToSecurityLog();

		this.reply(this.mlt(5) + ": " + Chat.italics(this.token + cmd));
	},

	rmrand: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('randadmin', this.room)) return this.replyAccessDenied('randadmin');

		const cmd = Text.toId(this.args[0]);
		const option = this.args.slice(1).join(",").trim();

		if (!cmd || !option) {
			return this.errorReply(this.usage({ desc: this.usageTrans('command') }, { desc: this.mlt("opt") }));
		}

		const Mod = App.modules.randcmd.system;

		let prevOptions = (Mod.data.commands[cmd] || "").split("\n").map(function (a) {
			return a.trim();
		}).filter(function (a) {
			return !!a;
		});

		if (prevOptions.indexOf(option) === -1) {
			return this.errorReply(this.mlt(6) + ": " + Chat.italics(this.token + cmd));
		}

		prevOptions = prevOptions.filter(function (o) {
			return o !== option;
		});

		if (prevOptions.length > 0) {
			Mod.data.commands[cmd] = prevOptions.join("\n");
		} else {
			delete Mod.data.commands[cmd];
		}

		Mod.db.write();
		this.addToSecurityLog();

		this.reply(this.mlt(7) + ": " + Chat.italics(this.token + cmd));
	},

	rmallrand: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('randadmin', this.room)) return this.replyAccessDenied('randadmin');

		const cmd = Text.toId(this.args[0]);

		if (!cmd) {
			return this.errorReply(this.usage({ desc: this.usageTrans('command') }));
		}

		const Mod = App.modules.randcmd.system;

		if (!Mod.data.commands[cmd]) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(this.token + cmd) + " " + this.mlt(1));
		}

		delete Mod.data.commands[cmd];

		Mod.db.write();
		this.addToSecurityLog();

		this.reply(this.mlt(8) + ": " + Chat.italics(this.token + cmd));
	},

	setrandalias: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('randadmin', this.room)) return this.replyAccessDenied('randadmin');

		const alias = Text.toId(this.args[0]);
		const cmd = Text.toId(this.args[1]);

		if (!alias || !cmd) {
			return this.errorReply(this.usage({ desc: this.mlt("alias") }, { desc: this.usageTrans('command') }));
		}

		const Mod = App.modules.randcmd.system;

		if (!Mod.data.commands[cmd]) {
			return this.errorReply(this.mlt(0) + " " + Chat.italics(this.token + cmd) + " " + this.mlt(1));
		}

		Mod.data.aliases[alias] = cmd;
		Mod.db.write();
		this.addToSecurityLog();

		this.reply(this.mlt(10) + ": " + Chat.italics(this.token + alias) + " " + this.mlt("for") + " " + Chat.italics(this.token + cmd));
	},

	rmrandalias: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('randadmin', this.room)) return this.replyAccessDenied('randadmin');

		const alias = Text.toId(this.args[0]);

		if (!alias) {
			return this.errorReply(this.usage({ desc: this.mlt("alias") }));
		}

		const Mod = App.modules.randcmd.system;

		if (!Mod.data.aliases[alias]) {
			return this.errorReply(this.mlt(11) + ": " + Chat.italics(this.token + alias));
		}

		delete Mod.data.aliases[alias];
		Mod.db.write();
		this.addToSecurityLog();

		this.reply(this.mlt(12) + ": " + Chat.italics(this.token + alias));
	},
};
