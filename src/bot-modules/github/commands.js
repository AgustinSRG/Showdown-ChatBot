/**
 * Commands File
 */

'use strict';

const Path = require('path');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));

module.exports = {
	gitban: function (App) {
		if (!this.can('gitban', this.room)) return this.replyAccessDenied('gitban');
		const bl = App.config.modules.github.blacklist;
		let target = this.arg.toLowerCase().trim();
		if (!target) {
			return this.errorReply(this.usage({desc: 'user'}));
		}
		if (bl[target]) {
			return this.errorReply(translator.get(0, this.lang) + " __" + target + "__ " + translator.get(1, this.lang));
		} else {
			bl[target] = true;
			App.db.write();
			this.reply(translator.get(0, this.lang) + " __" + target + "__ " + translator.get(2, this.lang));
			App.logCommandAction(this);
		}
	},

	gitunban: function (App) {
		if (!this.can('gitban', this.room)) return this.replyAccessDenied('gitban');
		const bl = App.config.modules.github.blacklist;
		let target = this.arg.toLowerCase().trim();
		if (!target) {
			return this.errorReply(this.usage({desc: 'user'}));
		}
		if (!bl[target]) {
			return this.errorReply(translator.get(0, this.lang) + " __" + target + "__ " + translator.get(3, this.lang));
		} else {
			delete bl[target];
			App.db.write();
			this.reply(translator.get(0, this.lang) + " __" + target + "__ " + translator.get(4, this.lang));
			App.logCommandAction(this);
		}
	},
};
