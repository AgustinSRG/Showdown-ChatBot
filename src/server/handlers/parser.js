/**
 * Server Handler: Command Parser
 */

'use strict';

const Text = Tools.get('text.js');

/* Permissions */

App.server.setPermission('parser', 'Permission for changing the command parser configuration');

/* Menu Options */

App.server.setMenuOption('parser', 'Command&nbsp;Parser', '/parser/', 'parser', 1);

/* Handlers */

App.server.setHandler('parser', (context, parts) => {
	/* Permission check */
	if (!context.user || !context.user.can('parser')) {
		context.endWith403();
		return;
	}

	let html = '';
	let opt = '';
	if (parts[0]) {
		opt = parts.shift();
	}
	html += '<div align="center"><h2>Command Parser</h2>';
	html += '<a class="submenu-option' + (opt in {'': 1, 'config': 1} ? '-selected' : '') + '" href="/parser/">Configuration</a>';
	html += ' | ';
	html += '<a class="submenu-option' + (opt in {'aliases': 1} ? '-selected' : '') + '" href="/parser/aliases/">Aliases</a>';
	html += ' | ';
	html += '<a class="submenu-option' + (opt in {'permissions': 1} ? '-selected' : '') + '" href="/parser/permissions/">Permissions</a>';
	html += ' | ';
	html += '<a class="submenu-option' + (opt in {'roomctrl': 1} ? '-selected' : '') + '" href="/parser/roomctrl/">Control Rooms</a>';
	html += '</div>';
	html += '<hr />';

	/* Sub-Options */
	switch (opt) {
	case '':
	case 'config':
		parserConfigurationHandler(context, html);
		break;
	case 'aliases':
		parserAliasesHandler(context, html);
		break;
	case 'permissions':
		parserPermissionsHandler(context, html);
		break;
	case 'roomctrl':
		parserRoomControlHandler(context, html);
		break;
	default:
		context.endWith404();
	}
});

function parserConfigurationHandler(context, html) {
	/* Actions */
	let ok = null, error = null;
	if (context.post.edit) {
		let auxGroups = (context.post.groups || "").split(',');
		let groups = [];
		for (let i = 0; i < auxGroups.length; i++) {
			auxGroups[i] = auxGroups[i].trim();
			if (auxGroups[i]) groups.push(auxGroups[i]);
		}
		let defGroups = ['voice', 'driver', 'mod', 'bot', 'owner', 'admin'];
		for (let i = 0; i < defGroups.length; i++) {
			if (groups.indexOf(context.post[defGroups[i]]) < 0) {
				error = 'Group corresponding to defined group <strong>' + defGroups[i] + '</strong> must be defined.';
				break;
			}
		}
		context.post.helpmsg = Text.toChatMessage(context.post.helpmsg);
		if (!error && context.post.helpmsg.length > 300) {
			error = "The help message must not be longer than 300 characters.";
		}
		if (!error) {
			let aux;
			let tokens = [];
			aux = (context.post.tokens || "").split(' ');
			for (let i = 0; i < aux.length; i++) {
				let id = Text.toCmdTokenid(aux[i]);
				if (id) {
					tokens.push(id);
				}
			}
			App.config.parser.tokens = tokens;
			App.config.parser.groups = groups;
			for (let i = 0; i < defGroups.length; i++) {
				App.config.parser[defGroups[i]] = context.post[defGroups[i]];
			}
			App.parser.data.helpmsg = context.post.helpmsg;
			App.parser.data.antispam = !!context.post.antispam;
			let rooms = {};
			aux = (context.post.sleep || "").split(',');
			for (let i = 0; i < aux.length; i++) {
				let id = Text.toRoomid(aux[i]);
				if (id) {
					rooms[id] = true;
				}
			}
			App.parser.data.sleep = rooms;
			App.db.write();
			App.parser.db.write();
			ok = 'Command parser configuration editted sucessfully.';
			App.logServerAction(context.user.id, "Edit command-parser configuration");
		}
	}

	/* Generate HTML */
	html += '<form method="post" action="">';
	html += '<table border="0">';
	html += '<tr><td>Command Tokens: </td><td><label><input name="tokens" type="text" size="50" value="' +
		App.config.parser.tokens.join(' ') + '"/> (Separated by spaces) </label></td></tr>';
	html += '<tr><td>Groups: </td><td><label><input name="groups" type="text" size="50" value="' +
		App.config.parser.groups.join(', ') + '"/> (Separated by commas, ordered from lowest to higher rank) </label></td></tr>';
	html += '<tr><td>Voice Group: </td><td><label><input name="voice" type="text" size="10" value="' +
		App.config.parser.voice + '"/></label></td></tr>';
	html += '<tr><td>Driver Group: </td><td><label><input name="driver" type="text" size="10" value="' +
		App.config.parser.driver + '"/></label></td></tr>';
	html += '<tr><td>Moderator Group: </td><td><label><input name="mod" type="text" size="10" value="' +
		App.config.parser.mod + '"/></label></td></tr>';
	html += '<tr><td>Bot Group: </td><td><label><input name="bot" type="text" size="10" value="' +
		App.config.parser.bot + '"/></label></td></tr>';
	html += '<tr><td>Room Owner Group: </td><td><label><input name="owner" type="text" size="10" value="' +
		App.config.parser.owner + '"/></label></td></tr>';
	html += '<tr><td>Administrator Group: </td><td><label><input name="admin" type="text" size="10" value="' +
		App.config.parser.admin + '"/></label></td></tr>';
	html += '<tr><td>Help Message: </td><td><label><input name="helpmsg" type="text" size="80" ' +
		'placeholder="Hi $USER, I am a bot for Pokemon Showdown." value="' + App.parser.data.helpmsg + '"/></label></td></tr>';
	html += '<tr><td>Sleeping Rooms: </td><td><label><input name="sleep" type="text" size="80" value="' +
		Object.keys(App.parser.data.sleep).join(', ') + '"/> (Separated by commas) </label></td></tr>';
	html += '<tr><td colspan="2"><input name="antispam" type="checkbox" value="checkbox"' +
		(App.parser.data.antispam ? ' checked="checked"' : '') + ' />&nbsp;Use Anti-Spam system for private commands</td></tr>';
	html += '</table>';
	html += '<p><label><input type="submit" name="edit" value="Save Changes" /></label></p>';
	html += '</form>';
	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}
	context.endWithWebPage(html, {title: "Command Parser Configuration - Showdown ChatBot"});
}

function parserAliasesHandler(context, html) {
	/* Actions */
	let ok = null, error = null;
	if (context.post.set) {
		let alias = Text.toCmdid(context.post.alias);
		let cmd = Text.toCmdid(context.post.cmd);
		if (alias) {
			if (cmd) {
				if (App.parser.commandExists(cmd)) {
					App.parser.data.aliases[alias] = cmd;
					App.parser.db.write();
					App.logServerAction(context.user.id, "Set alias: " + alias + " to the command: " + cmd);
					ok = 'Command "' + alias + '" is now alias of "' + cmd +
						'" (Note: If the original command does not exists, the alias will be useless)';
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
			if (App.parser.data.aliases[alias]) {
				delete App.parser.data.aliases[alias];
				App.parser.db.write();
				App.logServerAction(context.user.id, "Delete alias: " + alias);
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
		'<td width="200"><div align="center"><strong>Original Command </strong></div></td>' +
		'<td width="150"><div align="center"><strong>Options</strong></div></td></tr>';
	for (let alias in App.parser.data.aliases) {
		html += '<tr><td>' + alias + '</td><td>' + App.parser.data.aliases[alias] +
			'</td><td><div align="center"><form style="display:inline;" method="post" action="">' +
			'<input type="hidden" name="alias" value="' + alias +
			'" /><input type="submit" name="remove" value="Remove Alias" /></form></div></td></tr>';
	}
	html += '</table>';
	html += '<hr />';
	html += '<form method="post" action="">';
	html += '<table border="0">';
	html += '<tr><td>Alias: </td><td><label><input name="alias" type="text" size="40" /></label></td></tr>';

	html += '<tr><td>Command: </td><td><select name="cmd">';
	let cmds = App.parser.getCommadsArray().sort();
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

	context.endWithWebPage(html, {title: "Commands Aliases - Showdown ChatBot"});
}

function parserPermissionsHandler(context, html) {
	/* Actions */
	let ok = null, error = null;
	if (context.post.addroom) {
		let room = Text.toRoomid(context.post.room);
		if (!room || room === 'global-room') {
			error = 'You must specify a room.';
		} else {
			if (!App.parser.data.roompermissions[room]) {
				App.parser.data.roompermissions[room] = {};
				App.parser.db.write();
				App.logServerAction(context.user.id, "Add custom perrmission room: " + room);
				ok = 'Room <strong>' + room + '</strong> added to the custom permission configuration list.';
			} else {
				error = "Room <strong>" + room + "</strong> already has custom configuration.";
			}
		}
	} else if (context.post.delroom) {
		let room = Text.toRoomid(context.post.room);
		if (!room) {
			error = 'You must specify a room.';
		} else {
			if (App.parser.data.roompermissions[room]) {
				delete App.parser.data.roompermissions[room];
				App.parser.db.write();
				App.logServerAction(context.user.id, "Delete custom perrmission room: " + room);
				ok = 'Room <strong>' + room + '</strong> removed from the custom permission configuration list.';
			} else {
				error = "Room <strong>" + room + "</strong> not found.";
			}
		}
	} else if (context.post.editroom) {
		let room = Text.toRoomid(context.post.room);
		if (!room) {
			error = 'You must specify a room.';
		} else {
			let data;
			if (room === 'global-room') {
				data = App.parser.data.permissions;
			} else {
				if (!App.parser.data.roompermissions[room]) {
					App.parser.data.roompermissions[room] = {};
				}
				data = App.parser.data.roompermissions[room];
			}
			for (let i in App.parser.modPermissions) {
				let rank = context.post["perm-" + i];
				if (rank === 'user') {
					data[i] = 'user';
				} else if (App.config.parser.groups.indexOf(rank) >= 0) {
					data[i] = rank;
				} else {
					data[i] = 'excepted';
				}
			}
			App.parser.db.write();
			App.logServerAction(context.user.id, "Edit custom perrmission room: " + room);
			ok = 'Configuration for room <strong>' + room + '</strong> was editted sucessfully.';
		}
	} else if (context.post.editexp) {
		let expusers = {}, expcmds = [];
		let aux;
		aux = (context.post.expusers || "").split(',');
		for (let i = 0; i < aux.length; i++) {
			let id = Text.toId(aux[i]);
			if (id) {
				expusers[id] = true;
			}
		}
		aux = (context.post.canexp || "").split('\n');
		for (let i = 0; i < aux.length; i++) {
			let line = aux[i].split(',');
			let perm = Text.toId(line[0]);
			let user = Text.toId(line[1]);
			let room = Text.toRoomid(line[2]);
			if (!perm || !user || !App.parser.modPermissions[perm]) continue;
			expcmds.push({perm: perm, room: (room || null), user: user});
		}
		App.parser.data.exceptions = expusers;
		App.parser.data.canExceptions = expcmds;
		App.parser.db.write();
		App.logServerAction(context.user.id, "Edit Permission Exceptions");
		ok = 'Permission exceptions configuration editted sucessfully.';
	}

	/* Generate HTML */
	html += '<script type="text/javascript">function removeRoom(room) {var elem = document.getElementById(\'confirm-\' + room);' +
		'if (elem) {elem.innerHTML = \'<form style="display:inline;" id="confirm-delete-form" method="post" action="">' +
		'<input type="hidden" name="room" value="\' + room + \'" />Are you sure?&nbsp;' +
		'<input type="submit" name="delroom" value="Delete Configuration" /></form>\';}return false;}</script>';
	html += '<h3>Exceptions</h3>';
	html += '<form method="post" action="">';
	html += '<p><label><strong>Excepted Users</strong>:&nbsp;<input name="expusers" type="text" size="50" value="' +
		Object.keys(App.parser.data.exceptions).join(', ') + '"/></label>&nbsp;(Separated by commas)</p>';
	html += '<p><strong>Command Exceptions</strong></p>';
	let exceptions = [];
	for (let i = 0; i < App.parser.data.canExceptions.length; i++) {
		exceptions.push(App.parser.data.canExceptions[i].perm + ", " +
			App.parser.data.canExceptions[i].user +
				(App.parser.data.canExceptions[i].room ? (", " + App.parser.data.canExceptions[i].room) : ""));
	}
	html += '<textarea name="canexp" cols="80" rows="3">' + exceptions.join('\n') + '</textarea>';
	html += '<p>(Format: <em>permission, user, room</em>)</p>';
	html += '<p><label><input type="submit" name="editexp" value="Save Changes" /></label></p>';
	html += '</form>';
	html += '<hr />';
	html += getPermissionChart('global-room', 'Global Configuration');
	for (let r in App.parser.data.roompermissions) {
		html += '<hr />';
		html += getPermissionChart(r, 'Room: ' + r);
	}
	html += '<hr />';
	html += '<form method="post" action="">';
	html += '<label><input name="room" type="text" size="30" /></label>';
	html += '<label>&nbsp;&nbsp;<input type="submit" name="addroom" value="Add Room" /></label>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Commands Permisions - Showdown ChatBot"});
}

function parserRoomControlHandler(context, html) {
	/* Actions */
	let ok = null, error = null;
	if (context.post.set) {
		let room = Text.toRoomid(context.post.room);
		let control = Text.toRoomid(context.post.control);
		if (room) {
			if (control) {
				App.parser.data.roomctrl[control] = room;
				App.parser.db.write();
				App.logServerAction(context.user.id, "Set control room: " + control + " for: " + room);
				ok = 'Control room "' + control + '" was set for the room "' + room + '.';
			} else {
				error = "You must specify a control room";
			}
		} else {
			error = "You must specify a target room.";
		}
	} else if (context.post.remove) {
		let control = Text.toRoomid(context.post.control);
		if (control) {
			if (App.parser.data.roomctrl[control]) {
				delete App.parser.data.roomctrl[control];
				App.parser.db.write();
				App.logServerAction(context.user.id, "Delete control room: " + control);
				ok = 'Control room <strong>' + control + '</strong> was deleted sucessfully.';
			} else {
				error = 'Control room <strong>' + control + '</strong> was not found.';
			}
		} else {
			error = "You must specify a control room.";
		}
	}

	/* Generate HTML */
	html += '<table border="1">';
	html += '<tr><td width="200"><div align="center"><strong>Control Room</strong></div></td>' +
		'<td width="200"><div align="center"><strong>Target Room</strong></div></td>' +
		'<td width="200"><div align="center"><strong>Options</strong></div></td></tr>';
	for (let control in App.parser.data.roomctrl) {
		html += '<tr><td>' + control + '</td><td>' + App.parser.data.roomctrl[control] +
			'</td><td><div align="center"><form style="display:inline;" method="post" action=""><input type="hidden" name="control" value="' +
			control + '" /><input type="submit" name="remove" value="Remove Control Room" /></form></div></td></tr>';
	}
	html += '</table>';
	html += '<hr />';
	html += '<form method="post" action="">';
	html += '<table border="0">';
	html += '<tr><td>Control Room: </td><td><label><input name="control" type="text" size="40" /></label></td></tr>';
	html += '<tr><td>Traget Room: </td><td><label><input name="room" type="text" size="40" /></label></td></tr>';
	html += '</table>';
	html += '<p><label><input type="submit" name="set" value="Set Control Room" /></label></p>';
	html += '</form>';
	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}
	context.endWithWebPage(html, {title: "Control Rooms - Showdown ChatBot"});
}

/* Auxiliar Functions */

function getPermissionChart(room, title) {
	let html = '';
	html += '<h3>' + title + '</h3>';
	html += '<form method="post" action="">';
	html += '<input type="hidden" name="room" value="' + room + '" />';
	html += '<table border="1">';
	html += '<tr><td width="200px"><div align="center"><strong>Permission</strong></div></td> ' +
		'<td width="200px"><div align="center"><strong>Min Rank Required </strong></div></td></tr>';
	for (let i in App.parser.modPermissions) {
		html += '<tr>';
		html += '<td>' + i + '</td>';
		let rank = App.parser.modPermissions[i].group ? App.parser.modPermissions[i].group : 'excepted';
		let permData;
		if (room === 'global-room') {
			permData = App.parser.data.permissions;
		} else {
			permData = App.parser.data.roompermissions[room] || {};
		}
		if (permData[i]) {
			rank = permData[i];
		} else if (App.parser.data.permissions[i]) {
			rank = App.parser.data.permissions[i];
		}
		if (rank.length > 1 && App.config.parser[rank]) {
			rank = App.config.parser[rank];
		}
		html += '<td>';
		html += '<select name="perm-' + i + '">';
		html += '<option value="user"' + (rank === 'user' ? ' selected="selected"' : '') + '>Regular Users</option>';
		html += '<option value="excepted"' + (rank === 'excepted' ? ' selected="selected"' : '') + '>Excepted Users</option>';
		for (let j = 0; j < App.config.parser.groups.length; j++) {
			html += '<option value="' + App.config.parser.groups[j] + '"' +
				(rank === App.config.parser.groups[j] ? ' selected="selected"' : '') + '>Group ' + App.config.parser.groups[j] + '</option>';
		}
		html += '</select>';
		html += '</td>';
		html += '</tr>';
	}
	html += '</table>';
	html += '<p><label><input type="submit" name="editroom" value="Save Changes" /></label></p>';
	html += '</form>';
	if (room !== 'global-room') {
		html += '<p><button onclick="removeRoom(\'' + room +
			'\');">Use Default Values</button>&nbsp;<span id="confirm-' + room + '">&nbsp;</span></p>';
	}
	return html;
}
