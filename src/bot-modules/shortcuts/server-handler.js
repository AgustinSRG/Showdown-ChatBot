/**
 * Server Handler: Shortcut Commands
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const SubMenu = Tools('submenu');
const Template = Tools('html-template');

const cmdsTemplate = new Template(Path.resolve(__dirname, 'template-cmds.html'));
const cmdTemplate = new Template(Path.resolve(__dirname, 'template-cmd.html'));
const aliasesTemplate = new Template(Path.resolve(__dirname, 'template-aliases.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('shortcuts', 'Permission for managing shortcuts commands');

	/* Menu Options */
	App.server.setMenuOption('shortcuts', 'Shortcut&nbsp;Commands', '/shortcuts/', 'shortcuts', -2);

	/* Handlers */
	App.server.setHandler('shortcuts', (context, parts) => {
		if (!context.user || !context.user.can('shortcuts')) {
			context.endWith403();
			return;
		}

		let submenu = new SubMenu("Shortcut&nbsp;Commands", parts, context, [
			{id: 'commands', title: 'Commands', url: '/shortcuts/', handler: commandsHandler},
			{id: 'aliases', title: 'Aliases', url: '/shortcuts/aliases/', handler: aliasesHandler},
		], 'commands');

		return submenu.run();
	});

	function commandsHandler(context, html) {
		const Mod = App.modules.shortcuts.system;
		let ok = null, error = null;
		let adderror = false;

		if (context.post.add) {
			let cmd = Text.toCmdid(context.post.cmd);
			let content = (context.post.content || '');

			try {
				check(cmd, "You must specify a command");
				check(!Mod.data.commands[cmd], "Command " + cmd + " already exists");
				check(content, "Content cannot be blank");
			} catch (err) {
				error = err.message;
				adderror = true;
			}

			if (!error) {
				Mod.data.commands[cmd] = content;
				Mod.db.write();
				App.logServerAction(context.user.id, "Shortcut CMD | Create command: " + cmd);
				ok = 'Shortcut command "' + cmd + '" was created';
			}
		} else if (context.post.edit) {
			let cmd = Text.toCmdid(context.post.cmd);
			let content = (context.post.content || '');

			try {
				check(cmd, "You must specify a command");
				check(Mod.data.commands[cmd], "Command " + cmd + " not found");
				check(content, "Content cannot be blank");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				Mod.data.commands[cmd] = content;
				Mod.db.write();
				App.logServerAction(context.user.id, "Shortcut CMD | Edit command: " + cmd);
				ok = 'Shortcut command "' + cmd + '" was modified successfully';
			}
		} else if (context.post.delcmd) {
			let cmd = Text.toCmdid(context.post.cmd);

			try {
				check(cmd, "You must specify a command");
				check(Mod.data.commands[cmd], "Command " + cmd + " not found");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				delete Mod.data.commands[cmd];
				Mod.db.write();
				App.logServerAction(context.user.id, "Shortcut CMD | Delete command: " + cmd);
				ok = 'Shortcut command "' + cmd + '" was deleted';
			}
		}

		let htmlVars = Object.create(null);

		htmlVars.cmds = '';
		let commands = Mod.data.commands;
		for (let cmd in commands) {
			htmlVars.cmds += cmdTemplate.make({
				cmd: cmd,
				content: commands[cmd],
			});
		}

		htmlVars.cmd = (adderror ? (context.post.cmd || '') : '');
		htmlVars.content = (adderror ? (context.post.content || '') : '');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += cmdsTemplate.make(htmlVars);
		context.endWithWebPage(html, {title: "Shortcut Commands - Showdown ChatBot"});
	}

	function aliasesHandler(context, html) {
		const Mod = App.modules.randcmd.system;
		let ok = null, error = null;
		if (context.post.set) {
			let alias = Text.toCmdid(context.post.alias);
			let cmd = Text.toCmdid(context.post.cmd);
			if (alias) {
				if (cmd) {
					if (Mod.data.commands[cmd]) {
						Mod.data.aliases[alias] = cmd;
						Mod.db.write();
						App.logServerAction(context.user.id, "Shortcut CMD | Set alias: " + alias + " to the command: " + cmd);
						ok = 'Command "' + alias + '" is now alias of "' + cmd + '"';
					} else {
						error = "The command <strong>" + cmd + "</strong> does not exists.";
					}
				} else {
					error = "You must specify a command";
				}
			} else {
				error = "You must specify an alias id.";
			}
		} else if (context.post.remove) {
			let alias = Text.toCmdid(context.post.alias);
			if (alias) {
				if (Mod.data.aliases[alias]) {
					delete Mod.data.aliases[alias];
					Mod.db.write();
					App.logServerAction(context.user.id, "Shortcut CMD | Delete alias: " + alias);
					ok = 'Alias <strong>' + alias + '</strong> was deleted successfully.';
				} else {
					error = 'Alias <strong>' + alias + '</strong> was not found.';
				}
			} else {
				error = "You must specify an alias id.";
			}
		}

		let htmlVars = Object.create(null);

		htmlVars.aliases = '';
		for (let alias in Mod.data.aliases) {
			htmlVars.aliases += '<tr><td>' + alias + '</td><td>' + Mod.data.aliases[alias] +
			'</td><td><div align="center"><form style="display:inline;" method="post" action="">' +
			'<input type="hidden" name="alias" value="' + alias +
			'" /><input type="submit" name="remove" value="Remove Alias" /></form></div></td></tr>';
		}

		htmlVars.cmd_select = '<select name="cmd">';
		let cmds = Object.keys(Mod.data.commands).sort();
		for (let i = 0; i < cmds.length; i++) {
			htmlVars.cmd_select += '<option value="' + cmds[i] + '">' + cmds[i] + '</option>';
		}
		htmlVars.cmd_select += '</select>';

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += aliasesTemplate.make(htmlVars);
		context.endWithWebPage(html, {title: "Shortcut Commands (Aliases) - Showdown ChatBot"});
	}
};
