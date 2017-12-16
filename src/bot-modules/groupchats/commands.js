/**
 * Commands File
 *
 * groupchat: configure groupchats
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

module.exports = {
	groupchatvoice: function (App) {
		const Mod = App.modules.groupchats.system;
		this.setLangFile(Lang_File);
		if (!this.can('groupchats', this.room)) return this.replyAccessDenied('groupchats');
		let target = Text.toId(this.arg);

		if (!target) {
			return this.errorReply(this.usage({desc: this.usageTrans("user")}));
		}

		if (target.length > 19) {
			return this.errorReply(this.mlt(0));
		}

		let room = Mod.rooms[this.room || ""];

		if (!room) {
			return this.errorReply(this.mlt(1));
		}

		let config = Mod.config[room];

		if (config.users[target] === "voice") {
			return this.errorReply(this.mlt(2, {user: Chat.italics(target), group: "voice"}));
		}

		config.users[target] = "voice";
		Mod.setAuth(room, target, "voice");
		Mod.saveData();
		App.logCommandAction(this);
		this.reply(this.mlt(3, {user: Chat.italics(target), group: "voice"}));
	},

	groupchatdriver: function (App) {
		const Mod = App.modules.groupchats.system;
		this.setLangFile(Lang_File);
		if (!this.can('groupchats', this.room)) return this.replyAccessDenied('groupchats');
		let target = Text.toId(this.arg);

		if (!target) {
			return this.errorReply(this.usage({desc: this.usageTrans("user")}));
		}

		if (target.length > 19) {
			return this.errorReply(this.mlt(0));
		}

		let room = Mod.rooms[this.room || ""];

		if (!room) {
			return this.errorReply(this.mlt(1));
		}

		let config = Mod.config[room];

		if (config.users[target] === "driver") {
			return this.errorReply(this.mlt(2, {user: Chat.italics(target), group: "driver"}));
		}

		config.users[target] = "driver";
		Mod.setAuth(room, target, "driver");
		Mod.saveData();
		App.logCommandAction(this);
		this.reply(this.mlt(3, {user: Chat.italics(target), group: "driver"}));
	},

	groupchatmod: function (App) {
		const Mod = App.modules.groupchats.system;
		this.setLangFile(Lang_File);
		if (!this.can('groupchats', this.room)) return this.replyAccessDenied('groupchats');
		let target = Text.toId(this.arg);

		if (!target) {
			return this.errorReply(this.usage({desc: this.usageTrans("user")}));
		}

		if (target.length > 19) {
			return this.errorReply(this.mlt(0));
		}

		let room = Mod.rooms[this.room || ""];

		if (!room) {
			return this.errorReply(this.mlt(1));
		}

		let config = Mod.config[room];

		if (config.users[target] === "mod") {
			return this.errorReply(this.mlt(2, {user: Chat.italics(target), group: "mod"}));
		}

		config.users[target] = "mod";
		Mod.setAuth(room, target, "mod");
		Mod.saveData();
		App.logCommandAction(this);
		this.reply(this.mlt(3, {user: Chat.italics(target), group: "mod"}));
	},

	groupchatdeauth: function (App) {
		const Mod = App.modules.groupchats.system;
		this.setLangFile(Lang_File);
		if (!this.can('groupchats', this.room)) return this.replyAccessDenied('groupchats');
		let target = Text.toId(this.arg);

		if (!target) {
			return this.errorReply(this.usage({desc: this.usageTrans("user")}));
		}

		if (target.length > 19) {
			return this.errorReply(this.mlt(0));
		}

		let room = Mod.rooms[this.room || ""];

		if (!room) {
			return this.errorReply(this.mlt(1));
		}

		let config = Mod.config[room];

		if (!config.users[target]) {
			return this.errorReply(this.mlt(4, {user: Chat.italics(target)}));
		}

		let group = config.users[target];
		delete config.users[target];
		Mod.setAuth(room, target, "deauth");
		Mod.saveData();
		App.logCommandAction(this);
		this.reply(this.mlt(5, {user: Chat.italics(target), group: group}));
	},
};
