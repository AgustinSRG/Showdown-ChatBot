/**
 * Server Handler: Moderation
 */

'use strict';

const Text = Tools.get('text.js');
const check = Tools.get('check.js');

/* Menu Options */

App.server.setMenuOption('moderation', 'Moderation', '/moderation/', 'moderation');

/* Handlers */

App.server.setHandler('moderation', (context, parts) => {
	/* Permission Check */
	if (!context.user || !context.user.can('moderation')) {
		context.endWith403();
		return;
	}

	let html = '';
	let opt = '';
	if (parts[0]) {
		opt = parts.shift();
	}
	html += '<div align="center"><h2>Moderation</h2>';
	html += '<a class="submenu-option' + (opt in {'': 1, 'config': 1} ? '-selected' : '') + '" href="/moderation/">Configuration</a>';
	html += ' | ';
	html += '<a class="submenu-option' + (opt in {'settings': 1} ? '-selected' : '') + '" href="/moderation/settings/">Settings</a>';
	html += ' | ';
	html += '<a class="submenu-option' + (opt in {'exception': 1} ? '-selected' : '') + '" href="/moderation/exception/">Moderation Exception</a>';
	html += ' | ';
	html += '<a class="submenu-option' + (opt in {'rules': 1} ? '-selected' : '') + '" href="/moderation/rules/">Rules link</a>';
	html += ' | ';
	html += '<a class="submenu-option' + (opt in {'other': 1} ? '-selected' : '') + '" href="/moderation/other/">Other</a>';
	html += '</div>';
	html += '<hr />';

	/* Sub-Options */
	switch (opt) {
	case '':
	case 'config':
		moderationConfigHandler(context, html);
		break;
	case 'settings':
		moderationSettingsHandler(context, html);
		break;
	case 'exception':
		moderationExceptionHandler(context, html);
		break;
	case 'rules':
		moderationRulesHandler(context, html);
		break;
	case 'other':
		moderationOtherHandler(context, html);
		break;
	default:
		context.endWith404();
	}
});

function moderationConfigHandler(context, html) {
	/* Actions */
	let config = App.modules.moderation.system.data;
	let ok = null, error = null;
	if (context.post.savepuns) {
		let puns = (context.post.punishments || "").split(',');
		let aux = [];
		for (let i = 0; i < puns.length; i++) {
			let pun = Text.toId(puns[i]);
			if (pun) {
				aux.push(pun);
			}
		}
		if (aux.length) {
			config.punishments = aux;
			App.modules.moderation.system.db.write();
			App.logServerAction(context.user.id, "Moderation: Edit Punishments");
			ok = "Punishments saved";
		} else {
			error = "You must specify at least one punishment";
		}
	} else if (context.post.editval) {
		let values = {};
		for (let k in App.modules.moderation.system.modBot.filters) {
			let pun = context.post[k];
			if (pun && config.punishments.indexOf(pun) >= 0) {
				values[k] = config.punishments.indexOf(pun) + 1;
			}
		}
		config.values = values;
		App.modules.moderation.system.db.write();
		App.logServerAction(context.user.id, "Moderation: Edit Moderation values");
		ok = "Moderation values saved";
	}

	/* Html */

	html += '<form method="post" action=""><p><strong>Punishments</strong>:&nbsp;' +
		'<input name="punishments" type="text" size="50" value="' + config.punishments.join(', ') +
		'" /></p><p><input type="submit" name="savepuns" value="Save Changes" /></p></form>';

	html += '<hr />';
	html += '<form method="post" action="">';
	html += '<table border="1">';
	html += '<tr><td width="200"><div align="center"><strong>Moderation Type </strong></div></td>' +
		'<td width="200"><div align="center"><strong>Default Punishment </strong></div></td></tr>';
	for (let k in App.modules.moderation.system.modBot.filters) {
		let val = config.values[k] || 0;
		html += '<tr>';
		html += '<td>' + k + '</td>';
		html += '<td>';
		html += '<select name="' + k + '">';
		let punishments = config.punishments;
		for (let i = 0; i < punishments.length; i++) {
			html += '<option value="' + punishments[i] + '"' + (val === (i + 1) ? ' selected="selected"' : '') +
				' >' + punishments[i] + '</option>';
		}
		html += '<option value=""' + (val === 0 ? ' selected="selected"' : '') + ' >Default</option>';
		html += '</select>';
		html += '</td>';
		html += '</tr>';
	}
	html += '</table>';
	html += '<p><input type="submit" name="editval" value="Save Changes" /></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}
	context.endWithWebPage(html, {title: "Moderation Configuration - Showdown ChatBot"});
}

function getSettingsForm(room) {
	let opts = [];
	for (let k in App.modules.moderation.system.modBot.filters) {
		if (App.modules.moderation.system.modBot.modEnabled(k, room)) {
			opts.push('<input name="' + k + '" type="checkbox" value="true" checked="checked" />&nbsp;' + k);
		} else {
			opts.push('<input name="' + k + '" type="checkbox" value="true" />&nbsp;' + k);
		}
	}
	return '<p>' + opts.join(' | ') + '</p>';
}

function moderationSettingsHandler(context, html) {
	/* Actions */
	let config = App.modules.moderation.system.data;
	let ok = null, error = null;

	if (context.post.add) {
		let room = Text.toRoomid(context.post.room);
		try {
			check(room, "You must specify a room");
			check(!config.roomSettings[room], "Room already exists");
		} catch (err) {
			error = err.message;
		}

		if (!error) {
			config.roomSettings[room] = {};
			App.modules.moderation.system.db.write();
			App.logServerAction(context.user.id, "Moderation Settings: Add Room: " + room);
			ok = "Added room: " + room;
		}
	} else if (context.post.delroom) {
		let room = Text.toRoomid(context.post.room);
		try {
			check(room, "You must specify a room");
			check(config.roomSettings[room], "Room not found");
		} catch (err) {
			error = err.message;
		}

		if (!error) {
			delete config.roomSettings[room];
			App.modules.moderation.system.db.write();
			App.logServerAction(context.user.id, "Moderation Settings: Delete Room: " + room);
			ok = "Removed room: " + room;
		}
	} else if (context.post.edit) {
		let room = Text.toRoomid(context.post.room);
		let settings = {};
		for (let k in App.modules.moderation.system.modBot.filters) {
			settings[k] = !!context.post[k];
		}
		if (!room) {
			/* Default */
			config.settings = settings;
		} else {
			/* Specific Room */
			config.roomSettings[room] = settings;
		}
		App.modules.moderation.system.db.write();
		App.logServerAction(context.user.id, "Moderation Settings: Edit");
		ok = "Moderation settings saved";
	}

	/* Html */
	html += '<script type="text/javascript">function removeRoom(room) {var elem = document.getElementById(\'confirm-\' + room);' +
		'if (elem) {elem.innerHTML = \'<form style="display:inline;" id="confirm-delete-form" method="post" action="">' +
		'<input type="hidden" name="room" value="\' + room + \'" />Are you sure?&nbsp;' +
		'<input type="submit" name="delroom" value="Delete Configuration" /></form>\';}return false;}</script>';

	html += '<h3>Default Settings</h3>';
	html += '<form method="post" action="">';
	html += '<input type="hidden" name="room" value="" />';
	html += getSettingsForm('');
	html += '<p><input type="submit" name="edit" value="Save Changes" /></p>';
	html += '</form>';
	html += '<hr />';

	for (let room in config.roomSettings) {
		html += '<h3>Room: ' + room + '</h3>';
		html += '<form method="post" action="">';
		html += '<input type="hidden" name="room" value="' + room + '" />';
		html += getSettingsForm(room);
		html += '<p><input type="submit" name="edit" value="Save Changes" /></p>';
		html += '</form>';
		html += '<p><button onclick="removeRoom(\'' + room +
			'\');">Use Default Settings</button>&nbsp;<span id="confirm-' + room + '">&nbsp;</span></p>';
		html += '<hr />';
	}

	html += '<form method="post" action=""><input name="room" type="text" size="30" />&nbsp;&nbsp;' +
		'<input type="submit" name="add" value="Add Room" /></form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}
	context.endWithWebPage(html, {title: "Moderation Settings - Showdown ChatBot"});
}

function getRankSelect(name, rank) {
	if (!rank) rank = '';
	if (rank.length > 1 && App.config.parser[rank]) {
		rank = App.config.parser[rank];
	}
	let html = '';
	html += '<select name="' + name + '">';
	html += '<option value="user"' + (rank === 'user' ? ' selected="selected"' : '') + '>Regular Users</option>';
	html += '<option value="excepted"' + (rank === 'excepted' ? ' selected="selected"' : '') + '>Excepted Users</option>';
	for (let j = 0; j < App.config.parser.groups.length; j++) {
		html += '<option value="' + App.config.parser.groups[j] + '"' +
			(rank === App.config.parser.groups[j] ? ' selected="selected"' : '') + '>Group ' + App.config.parser.groups[j] + '</option>';
	}
	html += '</select>';
	return html;
}

function moderationExceptionHandler(context, html) {
	/* Actions */
	let config = App.modules.moderation.system.data;
	let ok = null, error = null;

	if (context.post.editdefault) {
		let rank = context.post.rank || "excepted";
		if (rank.length > 1 && App.config.parser[rank]) {
			rank = App.config.parser[rank];
		}
		if (rank === 'user' || rank === 'excepted' || App.config.parser.groups.indexOf(rank) >= 0) {
			config.modexception.global = rank;
			App.modules.moderation.system.db.write();
			App.logServerAction(context.user.id, "Moderation: Edit Mod-Exception");
			ok = "Moderation exception configuration saved";
		} else {
			error = "Invalid Rank";
		}
	} else if (context.post.delroom) {
		let room = Text.toRoomid(context.post.room);
		if (room && config.modexception.rooms[room]) {
			delete config.modexception.rooms[room];
			App.modules.moderation.system.db.write();
			App.logServerAction(context.user.id, "Moderation: Edit Mod-Exception");
			ok = "Moderation exception configuration saved";
		} else {
			error = "Invalid Room";
		}
	} else if (context.post.setroom) {
		let room = Text.toRoomid(context.post.room);
		if (room) {
			let rank = context.post.rank || "excepted";
			if (rank.length > 1 && App.config.parser[rank]) {
				rank = App.config.parser[rank];
			}
			if (rank === 'user' || rank === 'excepted' || App.config.parser.groups.indexOf(rank) >= 0) {
				config.modexception.rooms[room] = rank;
				App.modules.moderation.system.db.write();
				App.logServerAction(context.user.id, "Moderation: Edit Mod-Exception");
				ok = "Moderation exception configuration saved";
			} else {
				error = "Invalid Rank";
			}
		} else {
			error = "You must specify a room";
		}
	}

	/* Html */

	html += '<form method="post" action="">';
	html += '<strong>Default Moderation Exception</strong>:&nbsp;';
	html += getRankSelect('rank', config.modexception.global);
	html += '<p><input type="submit" name="editdefault" value="Save Changes" /></p>';
	html += '</form>';

	html += '<hr />';

	html += '<table border="1">';
	html += '<tr><td width="200"><div align="center"><strong>Room</strong></div></td>' +
		'<td width="250"><div align="center"><strong>Moderation Exception </strong></div></td>' +
		'<td width="150"><div align="center"><strong>Options</strong></div></td></tr>';
	for (let room in config.modexception.rooms) {
		html += '<tr>';
		html += '<td>' + room + '</td>';
		switch (config.modexception.rooms[room]) {
		case 'user':
			html += '<td>All Users</td>';
			break;
		case 'excepted':
			html += '<td>Excepted Users</td>';
			break;
		default:
			html += '<td>Group ' + Text.escapeHTML(config.modexception.rooms[room]) + '</td>';
			break;
		}
		html += '<td><div align="center"><form style="display:inline;" method="post" action="">' +
			'<input type="hidden" name="room" value="' + room +
			'" /><input type="submit" name="delroom" value="Delete" /></form></div></td>';
		html += '</tr>';
	}
	html += '</table>';

	html += '<hr />';

	html += '<form  method="post" action=""><table border="0"><tr><td><strong>Room</strong>: </td>' +
		'<td><input name="room" type="text" size="30" /></td></tr><tr><td><strong>Exception</strong>: </td>' +
		'<td>' + getRankSelect('rank') + '</td></tr></table>' +
		'<p><input type="submit" name="setroom" value="Set Moderation Exception" /></p></form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}
	context.endWithWebPage(html, {title: "Moderation Exception - Showdown ChatBot"});
}

function moderationRulesHandler(context, html) {
	/* Actions */
	let config = App.modules.moderation.system.data;
	let ok = null, error = null;

	if (context.post.setroom) {
		let room = Text.toRoomid(context.post.room);
		let link = (context.post.link || "").trim();
		if (room) {
			if (link) {
				config.rulesLink[room] = link;
				App.modules.moderation.system.db.write();
				App.logServerAction(context.user.id, "Moderation: Edit Rules-Link");
				ok = "Moderation rules link configuration saved";
			} else {
				error = "You must specify a rules link";
			}
		} else {
			error = "You must specify a room";
		}
	} else if (context.post.delroom) {
		let room = Text.toRoomid(context.post.room);
		if (room && config.rulesLink[room]) {
			delete config.rulesLink[room];
			App.modules.moderation.system.db.write();
			App.logServerAction(context.user.id, "Moderation: Edit Rules-Link");
			ok = "Moderation rules link configuration saved";
		} else {
			error = "Invalid Room";
		}
	}

	/* Html */
	html += '<table border="1">';
	html += '<tr><td width="200"><div align="center"><strong>Room</strong></div></td>' +
		'<td width="250"><div align="center"><strong>Moderation Exception </strong></div></td>' +
		'<td width="150"><div align="center"><strong>Options</strong></div></td></tr>';

	for (let room in config.rulesLink) {
		html += '<tr>';
		html += '<td>' + room + '</td>';
		html += '<td><a href="' + config.rulesLink[room] + '">' + Text.escapeHTML(config.rulesLink[room]) + '</a></td>';
		html += '<td><div align="center"><form style="display:inline;" method="post" action="">' +
			'<input type="hidden" name="room" value="' + room +
			'" /><input type="submit" name="delroom" value="Delete" /></form></div></td>';
		html += '</tr>';
	}

	html += '</table>';

	html += '<hr />';

	html += '<form  method="post" action=""><table border="0"><tr><td><strong>Room</strong>: </td>' +
		'<td><input name="room" type="text" size="30" /></td></tr><tr><td><strong>Rules Link</strong>: </td>' +
		'<td><input name="link" type="text" size="40" /></td></tr></table>' +
		'<p><input type="submit" name="setroom" value="Set Rules Link" /></p></form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}
	context.endWithWebPage(html, {title: "Moderation Rules Links Configuration - Showdown ChatBot"});
}

function moderationOtherHandler(context, html) {
	/* Actions */
	let config = App.modules.moderation.system.data;
	let ok = null, error = null;

	if (context.post.editservers) {
		let servers = (context.post.servers || "").split(',');
		let aux = [];
		for (let i = 0; i < servers.length; i++) {
			let server = Text.toId(servers[i]);
			if (server && aux.indexOf(server) < 0) {
				aux.push(server);
			}
		}
		config.serversWhitelist = aux;
		App.modules.moderation.system.db.write();
		App.logServerAction(context.user.id, "Moderation: Edit whitelisted servers");
		ok = "Moderation configuration saved";
	}

	/* Html */
	html += '<form method="post" action="">';
	html += '<strong>Whitelisted Servers</strong>:&nbsp;';
	html += '<input name="servers" type="text" size="50" value="' + config.serversWhitelist.join(', ') + '" />';
	html += '<p><input type="submit" name="editservers" value="Save Changes" /></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}
	context.endWithWebPage(html, {title: "Moderation - Showdown ChatBot"});
}
