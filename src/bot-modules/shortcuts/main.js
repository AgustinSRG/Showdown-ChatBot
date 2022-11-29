/**
 * Bot Module: Commands Shortcuts
 */

'use strict';

exports.setup = function (App) {
	class CommandShortcutsModule {
		constructor() {
			this.db = App.dam.getDataBase('shortcut-cmds.json');
			this.data = this.db.data;
			if (!this.data.commands) {
				this.data.commands = Object.create(null);
			}
			if (!this.data.aliases) {
				this.data.aliases = Object.create(null);
			}
		}
	}

	App.parser.addTrigger('shortcuts', 'after', context => {
		const Mod = App.modules.shortcuts.system;
		let cmd = context.cmd;
		let content = null;
		if (Mod.data.commands[cmd]) {
			content = Mod.data.commands[cmd];
		} else if (Mod.data.aliases[cmd] && Mod.data.commands[Mod.data.aliases[cmd]]) {
			content = Mod.data.commands[Mod.data.aliases[cmd]];
		}
		if (content) {
			context.arg = context.cmd;
			context.cmd = 'shortcutcmd';
			App.parser.exec(context);
			App.parser.monitor.count(context.byIdent.id);
			return true;
		}
	});

	App.parser.addCommandKeysProvider('shortcuts', () => {
		const Mod = App.modules.shortcuts.system;
		let cmds = Object.keys(Mod.data.commands);
		let aliases = Object.keys(Mod.data.aliases).filter(function (a) {
			return !!Mod.data.commands[Mod.data.aliases[a]];
		});
		return cmds.concat(aliases);
	});

	return new CommandShortcutsModule();
};
