/**
 * Server Handler: HtmlBox Commands
 */

'use strict';

const Text = Tools.get('text.js');
const check = Tools.get('check.js');

/* Permissions */

App.server.setPermission('htmlbox', 'Permission for managing htmlbox commands');

/* Menu Options */

App.server.setMenuOption('htmlbox', 'HtmlBox&nbsp;Commands', '/htmlbox/', 'htmlbox', -2);

/* Handlers */

App.server.setHandler('htmlbox', (context, parts) => {
	if (parts[0] === 'list') {
		listHandler(context);
	}

	/* Permission check */
	if (!context.user || !context.user.can('htmlbox')) {
		context.endWith403();
		return;
	}

	/* Actions */
	let html = '';
	let opt = '';
	if (parts[0]) {
		opt = parts.shift();
	}
	html += '<div align="center"><h2>HtmlBox Commands</h2>';
	html += '<a class="submenu-option' + (opt in {'': 1, 'commands': 1} ? '-selected' : '') + '" href="/htmlbox/">Commands</a>';
	html += ' | ';
	html += '<a class="submenu-option' + (opt in {'aliases': 1} ? '-selected' : '') + '" href="/htmlbox/aliases/">Aliases</a>';
	html += '</div>';
	html += '<hr />';

	/* Sub-Options */
	switch (opt) {
	case '':
	case 'commands':
		commandsHandler(context, html);
		break;
	case 'aliases':
		aliasesHandler(context, html);
		break;
	default:
		context.endWith404();
	}
});

function commandsHandler(context, html) {
	/* Actions */
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

	html += '<script type="text/javascript">function removeCmd(cmd) {var elem = document.getElementById(\'confirm-\' + cmd);' +
		'if (elem) {elem.innerHTML = \'<form style="display:inline;" id="confirm-delete-form" method="post" action="">' +
		'<input type="hidden" name="cmd" value="\' + cmd + \'" />Are you sure?&nbsp;' +
		'<input type="submit" name="delcmd" value="Delete Html Command" /></form>\';}return false;}</script>';

	let commands = Mod.data.commands;
	for (let cmd in commands) {
		html += '<form method="post" action="">';
		html += '<input type="hidden" name="cmd" value="' + cmd + '" />';
		html += '<p><strong>Command</strong>:&nbsp;' + cmd + '</p>';
		html += '<p><textarea name="content" cols="150" rows="4">' + commands[cmd] + '</textarea></p>';
		html += '<p><input type="submit" name="edit" value="Edit Html Command" /></p>';
		html += '</form>';
		html += '<p><button onclick="removeCmd(\'' + cmd +
			'\');">Delete</button>&nbsp;<span id="confirm-' + cmd + '">&nbsp;</span></p>';
		html += '<hr />';
	}

	html += '<form method="post" action="">';
	html += '<p><strong>Command</strong>:&nbsp;<input name="cmd" type="text" size="40" value="' +
		(adderror ? (context.post.cmd || '') : '') + '" /></p>';
	html += '<p><textarea name="content" cols="150" rows="4" placeholder="command content (HTML)">' + (adderror ? (context.post.content || '') : '') + '</textarea></p>';
	html += '<p><input type="submit" name="add" value="Add Html Command" /></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "HtmlBox Commands - Showdown ChatBot"});
}

function aliasesHandler(context, html) {
	/* Actions */
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

	/* Generate HTML */
	html += '<table border="1">';
	html += '<tr><td width="200"><div align="center"><strong>Alias</strong></div></td>' +
		'<td width="200"><div align="center"><strong>Html Command </strong></div></td>' +
		'<td width="150"><div align="center"><strong>Options</strong></div></td></tr>';
	for (let alias in Mod.data.aliases) {
		html += '<tr><td>' + alias + '</td><td>' + Mod.data.aliases[alias] +
			'</td><td><div align="center"><form style="display:inline;" method="post" action="">' +
			'<input type="hidden" name="alias" value="' + alias +
			'" /><input type="submit" name="remove" value="Remove Alias" /></form></div></td></tr>';
	}
	html += '</table>';
	html += '<hr />';
	html += '<form method="post" action="">';
	html += '<table border="0">';
	html += '<tr><td>Alias: </td><td><label><input name="alias" type="text" size="40" /></label></td></tr>';

	html += '<tr><td>Html Command: </td><td><select name="cmd">';
	let cmds = Object.keys(Mod.data.commands).sort();
	for (let i = 0; i < cmds.length; i++) {
		html += '<option value="' + cmds[i] + '">' + cmds[i] + '</option>';
	}
	html += '</select></td></tr>';

	html += '</table>';
	html += '<p><label><input type="submit" name="set" value="Set Alias" /></label></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

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
