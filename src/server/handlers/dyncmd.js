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

		if (!context.user || !context.user.can('dyncmd')) {
			context.endWith403();
			return;
		}

		let ok = null, error = null;
		let addFail = {cmd: '', id: '', content: '', index: false};
		if (context.post.addtextcmd) {
			let cmd = Text.toCmdid(context.post.cmd);
			let content = (context.post.content || "").trim();

			try {
				check(cmd, "You must specify a command.");
				check(content, "The command content must not be blank.");
				check(content.length <= 300, "The command content must not be longer than 300 characters.");
				check(!App.parser.data.dyncmds[cmd], "The command <strong>" + cmd + "</strong> already exists.");
			} catch (err) {
				error = err.message;
				addFail.id = cmd || "";
				addFail.content = content || "";
			}

			if (!error) {
				App.parser.data.dyncmds[cmd] = content;
				App.parser.saveData();
				App.logServerAction(context.user.id, 'Add dynamic command (Type: Text) cmd: ' + cmd);
				ok = "The command <strong>" + cmd + "</strong> was added as a text command.";
			}
		} else if (context.post.addindexcmd) {
			let cmd = Text.toCmdid(context.post.cmd);

			try {
				check(cmd, "You must specify a command.");
				check(!App.parser.data.dyncmds[cmd], "The command <strong>" + cmd + "</strong> already exists.");
			} catch (err) {
				error = err.message;
				addFail.id = cmd || "";
				addFail.index = true;
			}

			if (!error) {
				App.parser.data.dyncmds[cmd] = {};
				App.parser.saveData();
				App.logServerAction(context.user.id, 'Add dynamic command (Type: Index) cmd: ' + cmd);
				ok = "The command <strong>" + cmd + "</strong> was added as an index command.";
			}
		} else if (context.post.delcmd) {
			let cmd = Text.toCmdid(context.post.cmd);

			try {
				check(cmd, "You must specify a command.");
				check(App.parser.data.dyncmds[cmd], "The command <strong>" + cmd + "</strong> does not exists.");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				delete App.parser.data.dyncmds[cmd];
				App.parser.saveData();
				App.logServerAction(context.user.id, 'Delete dynamic command. cmd: ' + cmd);
				ok = "The command <strong>" + cmd + "</strong> was deleted sucessfully.";
			}
		} else if (context.post.delsubcmd) {
			let cmd = Text.toCmdid(context.post.cmd);
			let sub = Text.toCmdid(context.post.subcmd);

			try {
				check(cmd && sub, "You must specify a subcommand.");
				check(typeof App.parser.data.dyncmds[cmd] === 'object' && App.parser.data.dyncmds[cmd][sub],
					"The command <strong>" + cmd + "&nbsp;" + sub + "</strong> does not exists.");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				delete App.parser.data.dyncmds[cmd][sub];
				App.parser.saveData();
				App.logServerAction(context.user.id, 'Delete dynamic sub-command. cmd: ' + cmd + '. sub: ' + sub);
				ok = "The command <strong>" + cmd + "&nbsp;" + sub + "</strong> was deleted sucessfully.";
			}
		} else if (context.post.editcmd) {
			let cmd = Text.toCmdid(context.post.cmd);
			let content = (context.post.content || "").trim();

			try {
				check(cmd, "You must specify a command.");
				check(typeof App.parser.data.dyncmds[cmd] === 'string', "The command <strong>" + cmd + "</strong> is not a text command.");
				check(content, "The command content must not be blank.");
				check(content.length <= 300, "The command content must not be longer than 300 characters.");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				App.parser.data.dyncmds[cmd] = content;
				App.parser.saveData();
				App.logServerAction(context.user.id, 'Edit dynamic command. cmd: ' + cmd);
				ok = "The command <strong>" + cmd + "</strong> was editted sucessfully.";
			}
		} else if (context.post.addsubcmd) {
			let cmd = Text.toCmdid(context.post.cmd);
			let sub = Text.toCmdid(context.post.subcmd);
			let content = (context.post.content || "").trim();

			try {
				check(cmd && sub, "You must specify a subcommand.");
				check(typeof App.parser.data.dyncmds[cmd] === 'object', "The command <strong>" + cmd + "</strong> is not an index command.");
				check(content, "The command content must not be blank.");
				check(content.length <= 300, "The command content must not be longer than 300 characters.");
				check(!App.parser.data.dyncmds[cmd][sub], "The command <strong>" + cmd + "&nbsp;" + sub + "</strong> already exists.");
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
				ok = "The command <strong>" + cmd + "&nbsp;" + sub + "</strong> was added as a text subcommand.";
			}
		} else if (context.post.editsubcmd) {
			let cmd = Text.toCmdid(context.post.cmd);
			let sub = Text.toCmdid(context.post.subcmd);
			let content = (context.post.content || "").trim();

			try {
				check(cmd && sub, "You must specify a subcommand.");
				check(typeof App.parser.data.dyncmds[cmd] === 'object', "The command <strong>" + cmd + "</strong> is not an index command.");
				check(content, "The command content must not be blank.");
				check(content.length <= 300, "The command content must not be longer than 300 characters.");
				check(App.parser.data.dyncmds[cmd][sub], "The command <strong>" + cmd + "&nbsp;" + sub + "</strong> does not exists.");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				App.parser.data.dyncmds[cmd][sub] = content;
				App.parser.saveData();
				App.logServerAction(context.user.id, 'Edit dynamic sub-command. cmd: ' + cmd + '. sub: ' + sub);
				ok = "The command <strong>" + cmd + "&nbsp;" + sub + "</strong> was editted sucessfully.";
			}
		}

		let htmlVars = {};
		htmlVars.fail_id = ((!addFail.cmd) ? addFail.id : '');
		htmlVars.fail_text = ((!addFail.cmd) ? addFail.content : '');
		htmlVars.fail_index_id = (addFail.index ? addFail.id : '');

		htmlVars.commands = '';
		for (let cmd in App.parser.data.dyncmds) {
			htmlVars.commands += '<a id="a" name="Cmd-' + cmd + '"></a>';
			htmlVars.commands += getCommandTable(cmd, addFail);
			htmlVars.commands += '<br />';
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Dynamic Commands - Showdown ChatBot"});
	});

	function serveDynCmdList(context) {
		let html = '';
		let cmds = App.parser.data.dyncmds;
		for (let cmd in cmds) {
			switch (typeof cmds[cmd]) {
			case 'string':
				html += '<p><strong>' + cmd + '</strong>&nbsp;&#8212;&nbsp;' + Text.escapeHTML(cmds[cmd]) + '</p>';
				break;
			case 'object':
				html += '<p><strong>' + cmd + '</strong>&nbsp;&#8212;&nbsp;<u>Index Command</u></p>';
				html += '<ul>';
				for (let subcmd in cmds[cmd]) {
					html += '<li><strong>' + subcmd + '</strong>&nbsp;&#8212;&nbsp;' + Text.escapeHTML(cmds[cmd][subcmd]) + '</li>';
				}
				html += '</ul>';
				break;
			}
		}
		context.endWithHtml(listTemplate.make({list: html}));
	}

	/* Auxiliar Functions */
	function getCommandTable(cmdid, addFail) {
		let dynCmds = App.parser.data.dyncmds;
		let htmlVars = {};
		htmlVars.cmdid = cmdid;
		if (typeof dynCmds[cmdid] === 'string') {
			htmlVars.text = dynCmds[cmdid];
			return textCommandTemplate.make(htmlVars);
		} else if (typeof dynCmds[cmdid] === 'object') {
			htmlVars.subcmds = '';
			for (let k in dynCmds[cmdid]) {
				htmlVars.subcmds += subCommandTemplate.make({
					cmdid: cmdid,
					subcmd: k,
					text: dynCmds[cmdid][k],
				});
			}
			htmlVars.fail_id = (addFail.cmd === cmdid ? addFail.id : '');
			htmlVars.fail_text = (addFail.cmd === cmdid ? addFail.content : '');
			return indexCommandTemplate.make(htmlVars);
		}
		return textCommandTemplate.make(htmlVars);
	}
};
