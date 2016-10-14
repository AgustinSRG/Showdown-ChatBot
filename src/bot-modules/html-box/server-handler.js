/**
 * Server Handler: HtmlBox Commands
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
	App.server.setPermission('htmlbox', 'Permission for managing htmlbox commands');

	/* Menu Options */
	App.server.setMenuOption('htmlbox', 'HtmlBox&nbsp;Commands', '/htmlbox/', 'htmlbox', -2);

	/* Handlers */
	App.server.setHandler('htmlbox', (context, parts) => {
		if (parts[0] === 'list') {
			listHandler(context);
		}

		if (!context.user || !context.user.can('htmlbox')) {
			context.endWith403();
			return;
		}

		let submenu = new SubMenu("HtmlBox&nbsp;Commands", parts, context, [
			{id: 'commands', title: 'Commands', url: '/htmlbox/', handler: commandsHandler},
			{id: 'aliases', title: 'Aliases', url: '/htmlbox/aliases/', handler: aliasesHandler},
		], 'commands');

		return submenu.run();
	});

	function commandsHandler(context, html) {
		const Mod = App.modules.htmlbox.system;
		let ok = null, error = null;
		let adderror = false;

		if (context.post.add) {
			let cmd = Text.toCmdid(context.post.cmd);
			let content = (context.post.content || '').replace(/\n/g, '').trim();

			try {
				check(cmd, "You must specify a command");
				check(!Mod.data.commands[cmd], "Command " + cmd + " already exists");
				check(content, "Content cannot be blank");
				check(content.length <= 500, "Command content cannot be longer than 500 characters");
			} catch (err) {
				error = err.message;
				adderror = true;
			}

			if (!error) {
				Mod.data.commands[cmd] = content;
				Mod.db.write();
				App.logServerAction(context.user.id, "HtmlBox CMD | Crete command: " + cmd);
				ok = 'Html command "' + cmd + '" was created';
			}
		} else if (context.post.edit) {
			let cmd = Text.toCmdid(context.post.cmd);
			let content = (context.post.content || '').replace(/\n/g, '').trim();

			try {
				check(cmd, "You must specify a command");
				check(Mod.data.commands[cmd], "Command " + cmd + " not found");
				check(content, "Content cannot be blank");
				check(content.length <= 500, "Command content cannot be longer than 500 characters");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				Mod.data.commands[cmd] = content;
				Mod.db.write();
				App.logServerAction(context.user.id, "HtmlBox CMD | Edit command: " + cmd);
				ok = 'Html command "' + cmd + '" was modified sucessfully';
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
				App.logServerAction(context.user.id, "HtmlBox CMD | Delete command: " + cmd);
				ok = 'Html command "' + cmd + '" was deleted';
			}
		}

		let htmlVars = {};

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
		context.endWithWebPage(html, {title: "HtmlBox Commands - Showdown ChatBot"});
	}

	function aliasesHandler(context, html) {
		const Mod = App.modules.htmlbox.system;
		let ok = null, error = null;
		if (context.post.set) {
			let alias = Text.toCmdid(context.post.alias);
			let cmd = Text.toCmdid(context.post.cmd);
			if (alias) {
				if (cmd) {
					if (Mod.data.commands[cmd]) {
						Mod.data.aliases[alias] = cmd;
						Mod.db.write();
						App.logServerAction(context.user.id, "HtmlBox CMD | Set alias: " + alias + " to the command: " + cmd);
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
					App.logServerAction(context.user.id, "HtmlBox CMD | Delete alias: " + alias);
					ok = 'Alias <strong>' + alias + '</strong> was deleted sucessfully.';
				} else {
					error = 'Alias <strong>' + alias + '</strong> was not found.';
				}
			} else {
				error = "You must specify an alias id.";
			}
		}

		let htmlVars = {};

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
		context.endWithWebPage(html, {title: "HtmlBox Commands (Aliases) - Showdown ChatBot"});
	}

	function listHandler(context) {
		let html = '';
		html += '<html>';
		html += '<head><title>HtmlBox Commands - Showdown ChatBot</title></head>';
		html += '<body>';
		html += '<div align="center" style="padding:10px;"><h2>HtmlBox Commands List</h2></div>';
		html += '<div align="left" style="padding:10px;">';
		let cmds = App.modules.htmlbox.system.data.commands;
		let aliases = App.modules.htmlbox.system.data.aliases;
		for (let cmd in cmds) {
			html += '<p>';
			html += '<strong>' + cmd + '</strong>';
			let aliasList = [];
			for (let alias in aliases) {
				if (aliases[alias] === cmd) {
					aliasList.push(alias);
				}
			}
			if (aliasList.length > 0) {
				html += '&nbsp;(Aliases: <i>' + aliasList.join(', ') + '</i>)';
			}
			html += '</p>';
		}
		html += '</div>';
		html += '</body>';
		html += '</html>';
		context.endWithHtml(html);
	}
};
