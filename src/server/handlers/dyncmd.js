/**
 * Server Handler: Dynamic Commands
 * Interface to manage dynamic commands
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'templates', 'dyncmd-main.html'));
const indexCommandTemplate = new Template(Path.resolve(__dirname, 'templates', 'dyncmd-indexcmd.html'));
const textCommandTemplate = new Template(Path.resolve(__dirname, 'templates', 'dyncmd-textcmd.html'));
const subCommandTemplate = new Template(Path.resolve(__dirname, 'templates', 'dyncmd-subcmd.html'));
const listTemplate = new Template(Path.resolve(__dirname, 'templates', 'dyncmd-list.html'));
const aliasesTemplate = new Template(Path.resolve(__dirname, 'templates', 'dyncmd-aliases.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('dyncmd', 'Permission for managing dynamic commands');

	/* Menu Options */
	App.server.setMenuOption('dyncmd', 'Dynamic&nbsp;Commands', '/dyncmd/', 'dyncmd', 1);

	/* Handlers */
	App.server.setHandler('dyncmd', (context, parts) => {
		if (parts[0] && parts[0].split('?')[0] === 'list') {
			return serveDynCmdList(context);
		}

		if (parts[0] && parts[0].split('?')[0] === 'aliases') {
			return serveAliasesList(context);
		}

		if (!context.user || !context.user.can('dyncmd')) {
			context.endWith403();
			return;
		}

		let ok = null, error = null;
		let addFail = { cmd: '', id: '', content: '', index: false };
		if (context.post.addtextcmd) {
			let cmd = Text.toCmdid(context.post.cmd);
			let content = (context.post.content || "").trim();

			try {
				check(cmd, "You must specify a command.");
				check(content, "The command content must not be blank.");
				check(content.length <= 300, "The command content must not be longer than 300 characters.");
				check(!App.parser.data.dyncmds[cmd], "The command <strong>" + Text.escapeHTML(cmd) + "</strong> already exists.");
			} catch (err) {
				error = err.message;
				addFail.id = cmd || "";
				addFail.content = content || "";
			}

			if (!error) {
				App.parser.data.dyncmds[cmd] = content;
				App.parser.saveData();
				App.logServerAction(context.user.id, 'Add dynamic command (Type: Text) cmd: ' + cmd);
				ok = "The command <strong>" + Text.escapeHTML(cmd) + "</strong> was added as a text command.";
			}
		} else if (context.post.addindexcmd) {
			let cmd = Text.toCmdid(context.post.cmd);

			try {
				check(cmd, "You must specify a command.");
				check(!App.parser.data.dyncmds[cmd], "The command <strong>" + Text.escapeHTML(cmd) + "</strong> already exists.");
			} catch (err) {
				error = err.message;
				addFail.id = cmd || "";
				addFail.index = true;
			}

			if (!error) {
				App.parser.data.dyncmds[cmd] = Object.create(null);
				App.parser.saveData();
				App.logServerAction(context.user.id, 'Add dynamic command (Type: Index) cmd: ' + cmd);
				ok = "The command <strong>" + Text.escapeHTML(cmd) + "</strong> was added as an index command.";
			}
		} else if (context.post.delcmd) {
			let cmd = Text.toCmdid(context.post.cmd);

			try {
				check(cmd, "You must specify a command.");
				check(App.parser.data.dyncmds[cmd], "The command <strong>" + Text.escapeHTML(cmd) + "</strong> does not exists.");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				delete App.parser.data.dyncmds[cmd];
				App.parser.saveData();
				App.logServerAction(context.user.id, 'Delete dynamic command. cmd: ' + cmd);
				ok = "The command <strong>" + Text.escapeHTML(cmd) + "</strong> was deleted successfully.";
			}
		} else if (context.post.delsubcmd) {
			let cmd = Text.toCmdid(context.post.cmd);
			let sub = Text.toCmdid(context.post.subcmd);

			try {
				check(cmd && sub, "You must specify a subcommand.");
				check(typeof App.parser.data.dyncmds[cmd] === 'object' && App.parser.data.dyncmds[cmd][sub],
					"The command <strong>" + Text.escapeHTML(cmd) + "&nbsp;" + Text.escapeHTML(sub) + "</strong> does not exists.");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				delete App.parser.data.dyncmds[cmd][sub];
				App.parser.saveData();
				App.logServerAction(context.user.id, 'Delete dynamic sub-command. cmd: ' + cmd + '. sub: ' + sub);
				ok = "The command <strong>" + Text.escapeHTML(cmd) + "&nbsp;" + Text.escapeHTML(sub) + "</strong> was deleted successfully.";
			}
		} else if (context.post.editcmd) {
			let cmd = Text.toCmdid(context.post.cmd);
			let content = (context.post.content || "").trim();

			try {
				check(cmd, "You must specify a command.");
				check(typeof App.parser.data.dyncmds[cmd] === 'string', "The command <strong>" + Text.escapeHTML(cmd) + "</strong> is not a text command.");
				check(content, "The command content must not be blank.");
				check(content.length <= 300, "The command content must not be longer than 300 characters.");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				App.parser.data.dyncmds[cmd] = content;
				App.parser.saveData();
				App.logServerAction(context.user.id, 'Edit dynamic command. cmd: ' + cmd);
				ok = "The command <strong>" + Text.escapeHTML(cmd) + "</strong> was edited successfully.";
			}
		} else if (context.post.addsubcmd) {
			let cmd = Text.toCmdid(context.post.cmd);
			let sub = Text.toCmdid(context.post.subcmd);
			let content = (context.post.content || "").trim();

			try {
				check(cmd && sub, "You must specify a subcommand.");
				check(typeof App.parser.data.dyncmds[cmd] === 'object', "The command <strong>" + Text.escapeHTML(cmd) + "</strong> is not an index command.");
				check(content, "The command content must not be blank.");
				check(content.length <= 300, "The command content must not be longer than 300 characters.");
				check(!App.parser.data.dyncmds[cmd][sub], "The command <strong>" + Text.escapeHTML(cmd) + "&nbsp;" + Text.escapeHTML(sub) + "</strong> already exists.");
			} catch (err) {
				error = err.message;
				addFail.id = sub || "";
				addFail.cmd = cmd || "";
				addFail.content = content || "";
			}

			if (!error) {
				App.parser.data.dyncmds[cmd][sub] = content;
				App.parser.saveData();
				App.logServerAction(context.user.id, 'Add dynamic sub-command (Type: Text) cmd: ' + cmd + '. sub: ' + sub);
				ok = "The command <strong>" + Text.escapeHTML(cmd) + "&nbsp;" + Text.escapeHTML(sub) + "</strong> was added as a text subcommand.";
			}
		} else if (context.post.editsubcmd) {
			let cmd = Text.toCmdid(context.post.cmd);
			let sub = Text.toCmdid(context.post.subcmd);
			let content = (context.post.content || "").trim();

			try {
				check(cmd && sub, "You must specify a subcommand.");
				check(typeof App.parser.data.dyncmds[cmd] === 'object', "The command <strong>" + Text.escapeHTML(cmd) + "</strong> is not an index command.");
				check(content, "The command content must not be blank.");
				check(content.length <= 300, "The command content must not be longer than 300 characters.");
				check(App.parser.data.dyncmds[cmd][sub], "The command <strong>" + Text.escapeHTML(cmd) + "&nbsp;" + Text.escapeHTML(sub) + "</strong> does not exists.");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				App.parser.data.dyncmds[cmd][sub] = content;
				App.parser.saveData();
				App.logServerAction(context.user.id, 'Edit dynamic sub-command. cmd: ' + cmd + '. sub: ' + sub);
				ok = "The command <strong>" + Text.escapeHTML(cmd) + "&nbsp;" + Text.escapeHTML(sub) + "</strong> was edited successfully.";
			}
		}

		let htmlVars = Object.create(null);
		htmlVars.fail_id = Text.escapeHTML((!addFail.cmd) ? addFail.id : '');
		htmlVars.fail_text = Text.escapeHTML((!addFail.cmd) ? addFail.content : '');
		htmlVars.fail_index_id = Text.escapeHTML(addFail.index ? addFail.id : '');

		htmlVars.commands = '';
		for (let cmd in App.parser.data.dyncmds) {
			htmlVars.commands += '<a id="a" name="Cmd-' + Text.escapeHTML(cmd) + '"></a>';
			htmlVars.commands += getCommandTable(cmd, addFail);
			htmlVars.commands += '<br />';
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), { title: "Dynamic Commands - Showdown ChatBot" });
	});

	function serveDynCmdList(context) {
		let html = '';
		let cmdList = [];

		// Classic dynamic commands
		let cmds = App.parser.data.dyncmds;
		for (let cmd of Object.keys(cmds)) {
			switch (typeof cmds[cmd]) {
				case 'string':
					cmdList.push({
						id: cmd,
						type: "text",
						value: cmds[cmd],
					});
					break;
				case 'object':
					cmdList.push({
						id: cmd,
						type: "index",
						value: cmds[cmd],
					});
			}
		}

		// HTML commands

		if (App.modules.htmlbox && App.modules.htmlbox.system) {
			cmds = App.modules.htmlbox.system.data.commands;
			for (let cmd of Object.keys(cmds)) {
				cmdList.push({
					id: cmd,
					type: "html",
					value: cmds[cmd],
				});
			}
		}

		// Random commands

		if (App.modules.randcmd && App.modules.randcmd.system) {
			cmds = App.modules.randcmd.system.data.commands;
			for (let cmd of Object.keys(cmds)) {
				const options = (cmds[cmd] + "").split("\n").map(function (a) {
					return a.trim();
				}).filter(a => {
					return !!a;
				});
				if (options.length > 0) {
					cmdList.push({
						id: cmd,
						type: "random",
						value: options,
					});
				}
			}
		}

		// Shortcut commands

		if (App.modules.shortcuts && App.modules.shortcuts.system) {
			cmds = App.modules.shortcuts.system.data.commands;
			for (let cmd of Object.keys(cmds)) {
				cmdList.push({
					id: cmd,
					type: "shortcut",
					value: cmds[cmd],
				});
			}
		}


		// - Short

		cmdList = cmdList.sort((a, b) => {
			if (a.id < b.id) {
				return -1;
			} else {
				return 1;
			}
		});

		// - Respond with list

		for (let cmd of cmdList) {
			switch (cmd.type) {
				case "text":
					html += '<p><strong>' + Text.escapeHTML(cmd.id) + '</strong>&nbsp;&#8212;&nbsp;' + Text.escapeHTML(cmd.value) + '</p>';
					break;
				case "index":
					html += '<p><strong>' + Text.escapeHTML(cmd.id) + '</strong>&nbsp;&#8212;&nbsp;<u>Index Command</u></p>';
					html += '<ul>';
					for (let subcmd of Object.keys(cmd.value)) {
						html += '<li><strong>' + Text.escapeHTML(subcmd) + '</strong>&nbsp;&#8212;&nbsp;' + Text.escapeHTML(cmd.value[subcmd]) + '</li>';
					}
					html += '</ul>';
					break;
				case "random":
					html += '<p><strong>' + Text.escapeHTML(cmd.id) + '</strong>&nbsp;&#8212;&nbsp;<u>Random Command</u></p>';
					html += '<ul>';
					for (let opt of cmd.value) {
						html += '<li>' + Text.escapeHTML(opt) + '</li>';
					}
					html += '</ul>';
					break;
				case "shortcut":
					html += '<p><strong>' + Text.escapeHTML(cmd.id) + '</strong>&nbsp;&#8212;&nbsp;<u>Shortcut</u>&nbsp;&#8212;&nbsp;' + Text.escapeHTML(cmd.value) + '</p>';
					break;
				case "html":
					html += '<p><strong>' + Text.escapeHTML(cmd.id) + '</strong>&nbsp;&#8212;&nbsp;<u>HTML Command</u></p>';
					html += '<textarea style="width: 100%;" rows="4">';
					html += Text.escapeHTML(cmd.value);
					html += '</textarea>';
					break;
			}
		}

		context.endWithHtml(listTemplate.make({ list: html }));
	}

	function serveAliasesList(context) {
		let html = '';
		const commands = Object.create(null);

		// Regular aliases
		if (App.parser.data.aliases) {
			for (let alias of Object.keys(App.parser.data.aliases)) {
				const cmd = App.parser.data.aliases[alias];
				if (!commands[cmd]) {
					commands[cmd] = {
						id: cmd,
						aliases: [],
					};
				}
				commands[cmd].aliases.push(alias);
			}
		}

		// HTML commands

		if (App.modules.htmlbox && App.modules.htmlbox.system) {
			const mod = App.modules.htmlbox.system;
			for (let alias of Object.keys(mod.data.aliases)) {
				const cmd = mod.data.aliases[alias];
				if (!commands[cmd]) {
					commands[cmd] = {
						id: cmd,
						aliases: [],
					};
				}
				commands[cmd].aliases.push(alias);
			}
		}

		// Random commands

		if (App.modules.randcmd && App.modules.randcmd.system) {
			const mod = App.modules.randcmd.system;
			for (let alias of Object.keys(mod.data.aliases)) {
				const cmd = mod.data.aliases[alias];
				if (!commands[cmd]) {
					commands[cmd] = {
						id: cmd,
						aliases: [],
					};
				}
				commands[cmd].aliases.push(alias);
			}
		}

		// Shortcut commands

		if (App.modules.shortcuts && App.modules.shortcuts.system) {
			const mod = App.modules.shortcuts.system;
			for (let alias of Object.keys(mod.data.aliases)) {
				const cmd = mod.data.aliases[alias];
				if (!commands[cmd]) {
					commands[cmd] = {
						id: cmd,
						aliases: [],
					};
				}
				commands[cmd].aliases.push(alias);
			}
		}

		// - Sort

		const cmdList = Object.values(commands).sort((a, b) => {
			if (a.id < b.id) {
				return -1;
			} else {
				return 1;
			}
		});

		// Respond with list

		for (let cmd of cmdList) {
			html += '<tr>';
			html += '<td><b>' + Text.escapeHTML(cmd.id) + '</b></td>';
			html += '<td>' + Text.escapeHTML(cmd.aliases.join(", ")) + '</td>';
			html += '<tr>';
		}

		context.endWithHtml(aliasesTemplate.make({ list: html }));
	}

	/* Auxiliar Functions */
	function getCommandTable(cmdid, addFail) {
		let dynCmds = App.parser.data.dyncmds;
		let htmlVars = Object.create(null);
		htmlVars.cmdid = Text.escapeHTML(cmdid);
		if (typeof dynCmds[cmdid] === 'string') {
			htmlVars.text = Text.escapeHTML(dynCmds[cmdid]);
			return textCommandTemplate.make(htmlVars);
		} else if (typeof dynCmds[cmdid] === 'object') {
			htmlVars.subcmds = '';
			for (let k in dynCmds[cmdid]) {
				htmlVars.subcmds += subCommandTemplate.make({
					cmdid: Text.escapeHTML(cmdid),
					subcmd: Text.escapeHTML(k),
					text: Text.escapeHTML(dynCmds[cmdid][k]),
				});
			}
			htmlVars.fail_id = Text.escapeHTML(addFail.cmd === cmdid ? addFail.id : '');
			htmlVars.fail_text = Text.escapeHTML(addFail.cmd === cmdid ? addFail.content : '');
			return indexCommandTemplate.make(htmlVars);
		}
		return textCommandTemplate.make(htmlVars);
	}
};
