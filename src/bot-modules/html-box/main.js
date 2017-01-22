/**
 * Bot Module: HtmlBox Commands
 */

'use strict';

exports.setup = function (App) {
	class HtmlBoxModule {
		constructor() {
			this.db = App.dam.getDataBase('html-cmd.json');
			this.data = this.db.data;
			if (!this.data.commands) {
				this.data.commands = {};
			}
			if (!this.data.aliases) {
				this.data.aliases = {};
			}
		}
	}

	App.parser.addTrigger('htmlbox', 'after', context => {
		const Mod = App.modules.htmlbox.system;
		let cmd = context.cmd;
		let content = null;
		if (Mod.data.commands[cmd]) {
			content = Mod.data.commands[cmd];
		} else if (Mod.data.aliases[cmd] && Mod.data.commands[Mod.data.aliases[cmd]]) {
			content = Mod.data.commands[Mod.data.aliases[cmd]];
		}
		if (content) {
			context.arg = context.cmd;
			context.cmd = 'htmlcmd';
			App.parser.exec(context);
			App.parser.monitor.count(context.byIdent.id);
		}
	});

	return new HtmlBoxModule();
};
