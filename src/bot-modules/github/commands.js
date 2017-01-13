/**
 * Commands File
 *
 * gitban: adds a GitHub user to the PR blacklist
 * gitunban: removes a GitHub user from the blacklist
 */

'use strict';

const Path = require('path');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

module.exports = {
	gitban: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('gitban', this.room)) return this.replyAccessDenied('gitban');
		const bl = App.config.modules.github.blacklist;
		let target = this.arg.toLowerCase().trim();
		if (!target) {
			return this.errorReply(this.usage({desc: 'user'}));
		}
		if (bl[target]) {
			return this.errorReply(this.mlt(0) + " __" + target + "__ " + this.mlt(1));
		} else {
			bl[target] = true;
			App.db.write();
			this.reply(this.mlt(0) + " __" + target + "__ " + this.mlt(2));
			App.logCommandAction(this);
		}
	},

	gitunban: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('gitban', this.room)) return this.replyAccessDenied('gitban');
		const bl = App.config.modules.github.blacklist;
		let target = this.arg.toLowerCase().trim();
		if (!target) {
			return this.errorReply(this.usage({desc: 'user'}));
		}
		if (!bl[target]) {
			return this.errorReply(this.mlt(0) + " __" + target + "__ " + this.mlt(3));
		} else {
			delete bl[target];
			App.db.write();
			this.reply(this.mlt(0) + " __" + target + "__ " + this.mlt(4));
			App.logCommandAction(this);
		}
	},
};
