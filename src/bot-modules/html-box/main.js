/*
 * Bot Module: HtmlBox Commands
 */

'use strict';

const Path = require('path');

const DataBase = Tools.get('json-db.js');

exports.db = new DataBase(Path.resolve(App.confDir, 'html-cmd.json'));

exports.data = exports.db.data;

if (!exports.data.commands) {
	exports.data.commands = {};
}

if (!exports.data.aliases) {
	exports.data.aliases = {};
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

require(Path.resolve(__dirname, 'server-handler.js'));
