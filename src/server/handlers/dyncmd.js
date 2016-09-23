/**
 * Server Handler: Dynamic Commands
 * Interface to manage dynamic commands
 */

'use strict';

const Text = Tools.get('text.js');
const check = Tools.get('check.js');

/* Permissions */

App.server.setPermission('dyncmd', 'Permission for managing dynamic commands');

/* Menu Options */

App.server.setMenuOption('dyncmd', 'Dynamic&nbsp;Commands', '/dyncmd/', 'dyncmd', 1);

/* Handlers */

App.server.setHandler('dyncmd', (context, parts) => {
	/* Public CMD list */
	if (parts[0].split('?')[0] === 'list') {
		return serveDynCmdList(context);
	}

	/* Permission check */
	if (!context.user || !context.user.can('dyncmd')) {
		context.endWith403();
		return;
	}

	/* Actions */
	let ok = null, error = null;
	let addFail = {cmd: '', id: '', content: '', index: false};
	if (context.post.addtextcmd) {
		let cmd = Text.toCmdid(context.post.cmd);
		let content = (context.post.content || "").trim();
		/* Check */
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
		/* Do action */
		if (!error) {
			App.parser.data.dyncmds[cmd] = content;
			App.parser.saveData();
			App.logServerAction(context.user.id, 'Add dynamic command (Type: Text) cmd: ' + cmd);
			ok = "The command <strong>" + cmd + "</strong> was added as a text command.";
		}
	} else if (context.post.addindexcmd) {
		let cmd = Text.toCmdid(context.post.cmd);
		/* Check */
		try {
			check(cmd, "You must specify a command.");
			check(!App.parser.data.dyncmds[cmd], "The command <strong>" + cmd + "</strong> already exists.");
		} catch (err) {
			error = err.message;
			addFail.id = cmd || "";
			addFail.index = true;
		}
		/* Do action */
		if (!error) {
			App.parser.data.dyncmds[cmd] = {};
			App.parser.saveData();
			App.logServerAction(context.user.id, 'Add dynamic command (Type: Index) cmd: ' + cmd);
			ok = "The command <strong>" + cmd + "</strong> was added as an index command.";
		}
	} else if (context.post.delcmd) {
		let cmd = Text.toCmdid(context.post.cmd);
		/* Check */
		try {
			check(cmd, "You must specify a command.");
			check(App.parser.data.dyncmds[cmd], "The command <strong>" + cmd + "</strong> does not exists.");
		} catch (err) {
			error = err.message;
		}
		/* Do action */
		if (!error) {
			delete App.parser.data.dyncmds[cmd];
			App.parser.saveData();
			App.logServerAction(context.user.id, 'Delete dynamic command. cmd: ' + cmd);
			ok = "The command <strong>" + cmd + "</strong> was deleted sucessfully.";
		}
	} else if (context.post.delsubcmd) {
		let cmd = Text.toCmdid(context.post.cmd);
		let sub = Text.toCmdid(context.post.subcmd);
		/* Check */
		try {
			check(cmd && sub, "You must specify a subcommand.");
			check(typeof App.parser.data.dyncmds[cmd] === 'object' && App.parser.data.dyncmds[cmd][sub],
				"The command <strong>" + cmd + "&nbsp;" + sub + "</strong> does not exists.");
		} catch (err) {
			error = err.message;
		}
		/* Do action */
		if (!error) {
			delete App.parser.data.dyncmds[cmd][sub];
			App.parser.saveData();
			App.logServerAction(context.user.id, 'Delete dynamic sub-command. cmd: ' + cmd + '. sub: ' + sub);
			ok = "The command <strong>" + cmd + "&nbsp;" + sub + "</strong> was deleted sucessfully.";
		}
	} else if (context.post.editcmd) {
		let cmd = Text.toCmdid(context.post.cmd);
		let content = (context.post.content || "").trim();
		/* Check */
		try {
			check(cmd, "You must specify a command.");
			check(typeof App.parser.data.dyncmds[cmd] === 'string', "The command <strong>" + cmd + "</strong> is not a text command.");
			check(content, "The command content must not be blank.");
			check(content.length <= 300, "The command content must not be longer than 300 characters.");
		} catch (err) {
			error = err.message;
		}
		/* Do action */
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
		/* Check */
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
		/* Do action */
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
		/* Check */
		try {
			check(cmd && sub, "You must specify a subcommand.");
			check(typeof App.parser.data.dyncmds[cmd] === 'object', "The command <strong>" + cmd + "</strong> is not an index command.");
			check(content, "The command content must not be blank.");
			check(content.length <= 300, "The command content must not be longer than 300 characters.");
			check(App.parser.data.dyncmds[cmd][sub], "The command <strong>" + cmd + "&nbsp;" + sub + "</strong> does not exists.");
		} catch (err) {
			error = err.message;
		}
		/* Do action */
		if (!error) {
			App.parser.data.dyncmds[cmd][sub] = content;
			App.parser.saveData();
			App.logServerAction(context.user.id, 'Edit dynamic sub-command. cmd: ' + cmd + '. sub: ' + sub);
			ok = "The command <strong>" + cmd + "&nbsp;" + sub + "</strong> was editted sucessfully.";
		}
	}

	/* Generate HTML */
	let html = '';
	html += '<script type="text/javascript">function deleteCommand(cmd) {var elem = document.getElementById(\'confirm-delcmd-\' + cmd);' +
		'if (elem) {elem.innerHTML = \'<form style="display:inline;" id="confirm-delete-form" method="post" action="./">' +
		'<input type="hidden" name="cmd" value="\' + cmd + \'" />Are you sure?&nbsp;' +
		'<input type="submit" name="delcmd" value="Confirm Delete" /></form>\';}return false;}</script>';
	html += '<script type="text/javascript">function deleteSubCommand(cmd, sub)' +
		'{var elem = document.getElementById(\'confirm-delsubcmd-\' + cmd + \'-\' + sub);' +
		'if (elem) {elem.innerHTML = \'<form style="display:inline;" id="confirm-delete-form" method="post" action="#Cmd-\' + cmd + \'">' +
		'<input type="hidden" name="cmd" value="\' + cmd + \'" /><input type="hidden" name="subcmd" value="\' + sub + \'" />' +
		'Are you sure?&nbsp;<input type="submit" name="delsubcmd" value="Confirm Delete" /></form>\';}return false;}</script>';

	html += '<h2>Dynamic Commands</h2>';
	html += '<p><a href="/dyncmd/list" target="_blank">View Dynamic commands current list</a></p>';

	html += '<form method="post" action="./"><p>ID:&nbsp;<label><input name="cmd" type="text" size="30" value="' +
		((!addFail.cmd) ? addFail.id : '') + '"/></label></p><p><textarea name="content" cols="80" rows="2">' +
		((!addFail.cmd) ? addFail.content : '') + '</textarea></p><p><label>' +
		'<input type="submit" name="addtextcmd" value="Add Text Command" /></label></p></form>';
	html += '<hr />';
	html += '<form method="post" action="./"><p>ID:&nbsp;<label><input name="cmd" type="text" size="30" value="' +
		(addFail.index ? addFail.id : '') + '" /></label></p><p><label>' +
		'<input type="submit" name="addindexcmd" value="Add Index Command" /></label></p></form>';
	html += '<hr />';

	/* Command tables */
	for (let cmd in App.parser.data.dyncmds) {
		html += '<a id="a" name="Cmd-' + cmd + '"></a>';
		html += getCommandTable(cmd, addFail);
		html += '<br />';
	}

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Dynamic Commands - Showdown ChatBot"});
});

function serveDynCmdList(context) {
	let html = '';
	html += '<html>';
	html += '<head><title>Dynamic Commands - Showdown ChatBot</title></head>';
	html += '<body>';
	html += '<div align="center" style="padding:10px;"><h2>Dynamic Commands List</h2></div>';
	html += '<div align="left" style="padding:10px;">';
	let cmds = App.parser.data.dyncmds;
	for (let cmd in cmds) {
		switch (typeof cmds[cmd]) {
		case 'string':
			html += '<p><strong>' + cmd + '</strong>&nbsp;&#8212;&nbsp;' + cmds[cmd] + '</p>';
			break;
		case 'object':
			html += '<p><strong>' + cmd + '</strong>&nbsp;&#8212;&nbsp;<u>Index Command</u></p>';
			html += '<ul>';
			for (let subcmd in cmds[cmd]) {
				html += '<li><strong>' + subcmd + '</strong>&nbsp;&#8212;&nbsp;' + cmds[cmd][subcmd] + '</li>';
			}
			html += '</ul>';
			break;
		}
	}
	html += '</div>';
	html += '</body>';
	html += '</html>';
	context.endWithHtml(html);
}

/* Auxiliar Functions */

function getCommandTable(cmdid, addFail) {
	let dynCmds = App.parser.data.dyncmds;
	let html = '';
	html += '<table border="1">';
	html += '<tr><td width="300"><strong>Command</strong></td><td width="300">' + cmdid + '</td></tr>';
	html += '<tr><td colspan="2">';
	if (typeof dynCmds[cmdid] === 'string') {
		html += '<form method="post" action="#Cmd-' + cmdid + '">';
		html += '<input type="hidden" name="cmd" value="' + cmdid + '" />';
		html += '<p><label><textarea name="content" cols="80" rows="2">' + dynCmds[cmdid] + '</textarea></label></p>';
		html += '<p><label><input type="submit" name="editcmd" value="Edit Command" /></label></p>';
		html += '</form>';
	} else if (typeof dynCmds[cmdid] === 'object') {
		for (let k in dynCmds[cmdid]) {
			html += '<table border="1">';
			html += '<tr><td width="250"><strong>SubCommand</strong></td><td width="250">' + k + '</td></tr>';
			html += '<tr><td colspan="2">';
			html += '<form method="post" action="#Cmd-' + cmdid + '">';
			html += '<input type="hidden" name="cmd" value="' + cmdid + '" />';
			html += '<input type="hidden" name="subcmd" value="' + k + '" />';
			html += '<p><label><textarea name="content" cols="80" rows="2">' + dynCmds[cmdid][k] + '</textarea></label></p>';
			html += '<p><label><input type="submit" name="editsubcmd" value="Edit SubCommand" /></label></p>';
			html += '</form>';
			html += '<p><button onclick="deleteSubCommand(\'' + cmdid + '\', \'' + k + '\')">Delete SubCommand</button>' +
				'&nbsp;<span id="confirm-delsubcmd-' + cmdid + '-' + k + '">&nbsp;</span></p>';
			html += '</td></tr>';
			html += '</table>';
			html += '<br />';
		}
		html += '<form method="post" action="#Cmd-' + cmdid + '">';
		html += '<input type="hidden" name="cmd" value="' + cmdid + '" />';
		html += '<p>ID:&nbsp;<label><input name="subcmd" type="text" size="30" value="' +
			(addFail.cmd === cmdid ? addFail.id : '') + '"/></label></p>';
		html += '<p><textarea name="content" cols="80" rows="2">' + (addFail.cmd === cmdid ? addFail.content : '') + '</textarea></p>';
		html += '<p><label><input type="submit" name="addsubcmd" value="Add SubCommand" /></label></p>';
		html += '</form>';
	}
	html += '<p><button onclick="deleteCommand(\'' + cmdid + '\')">Delete Command</button>&nbsp;' +
		'<span id="confirm-delcmd-' + cmdid + '">&nbsp;</span></p>';
	html += '</td></tr>';
	html += '</table>';
	return html;
}
