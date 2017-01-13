/**
 * Commands File
 *
 * setmoderation: configures moderation filters
 * modexception: configures moderation exception
 */

'use strict';

const Path = require('path');

const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'settings.translations');

module.exports = {
	setmoderation: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('moderation', this.room)) return this.replyAccessDenied('moderation');
		if (this.args.length !== 2) return this.errorReply(this.usage({desc: 'mod-type'}, {desc: 'on/off'}));
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(this.mlt('nochat'));
		let mod = Text.toId(this.args[0]);
		let set = Text.toId(this.args[1]);
		if (set !== 'on' && set !== 'off') return this.errorReply(this.usage({desc: 'mod-type'}, {desc: 'on/off'}));
		let modtypes = App.modules.moderation.system.modBot.filters;
		if (mod in modtypes) {
			let config = App.modules.moderation.system.data;
			if (!config.roomSettings[room]) {
				config.roomSettings[room] = {};
			}
			config.roomSettings[room][mod] = !!(set === 'on');
			App.modules.moderation.system.db.write();
			App.logCommandAction(this);
			this.reply(this.mlt(0) + " " + Chat.italics(mod) + " " + this.mlt(1) +
				" " + (set === 'on' ? this.mlt(2) : this.mlt(3)) + " " +
				this.mlt(4) + " " + Chat.italics(this.parser.getRoomTitle(room)) + "");
		} else {
			return this.errorReply(this.mlt(5) + ": " + Object.keys(modtypes).join(', '));
		}
	},

	modexception: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('moderation', this.room)) return this.replyAccessDenied('moderation');
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(this.mlt('nochat'));
		let rank = this.arg.toLowerCase().trim();
		if (!rank) return this.errorReply(this.usage({desc: this.usageTrans('rank')}));
		let groups = ['user', 'excepted'].concat(App.config.parser.groups);
		if (groups.indexOf(rank) >= 0) {
			let config = App.modules.moderation.system.data;
			config.modexception.rooms[room] = rank;
			App.modules.moderation.system.db.write();
			App.logCommandAction(this);
			switch (rank) {
			case 'user':
				this.reply(this.mlt(6) + " " + Chat.italics(this.parser.getRoomTitle(room)));
				break;
			case 'excepted':
				this.reply(this.mlt(7) + " " + Chat.italics(this.parser.getRoomTitle(room)));
				break;
			default:
				this.reply(this.mlt(8) + " " + ' ' + Chat.bold(rank) + ' ' + this.mlt(9) +
					' ' + this.mlt(10) + ' ' + Chat.italics(this.parser.getRoomTitle(room)));
			}
		} else {
			return this.errorReply(this.mlt(11) + ": " + groups.join(', '));
		}
	},
};
