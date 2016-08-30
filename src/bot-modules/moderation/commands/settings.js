/**
 * Commands File
 */

'use strict';

const Path = require('path');

const Text = Tools.get('text.js');
const Chat = Tools.get('chat.js');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'settings.translations'));

App.parser.addPermission('moderation', {group: 'owner'});

module.exports = {
	setmoderation: function () {
		if (!this.can('moderation', this.room)) return this.replyAccessDenied('moderation');
		if (this.args.length !== 2) return this.errorReply(this.usage({desc: 'mod-type'}, {desc: 'on/off'}));
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
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
			this.reply(translator.get(0, this.lang) + " " + Chat.italics(mod) + " " + translator.get(1, this.lang) +
				" " + (set === 'on' ? translator.get(2, this.lang) : translator.get(3, this.lang)) + " " +
				translator.get(4, this.lang) + " " + Chat.italics(room) + "");
		} else {
			return this.errorReply(translator.get(5, this.lang) + ": " + Object.keys(modtypes).join(', '));
		}
	},

	modexception: function () {
		if (!this.can('moderation', this.room)) return this.replyAccessDenied('moderation');
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
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
				this.reply(translator.get(6, this.lang) + " " + Chat.italics(room));
				break;
			case 'excepted':
				this.reply(translator.get(7, this.lang) + " " + Chat.italics(room));
				break;
			default:
				this.reply(translator.get(8, this.lang) + " " + ' ' + Chat.bold(rank) + ' ' +
					translator.get(9, this.lang) + ' ' + translator.get(10, this.lang) + ' ' + Chat.italics(room));
			}
		} else {
			return this.errorReply(translator.get(11, this.lang) + ": " + groups.join(', '));
		}
	},
};
