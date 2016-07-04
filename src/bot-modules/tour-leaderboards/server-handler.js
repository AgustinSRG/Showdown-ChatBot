/**
 * Server Handler: Tour Leaderboards
 */

'use strict';

const Path = require('path');

const Text = Tools.get('text.js');
const check = Tools.get('check.js');

const Config = App.config.modules.tourleaderboards;

/* Permissions */

App.server.setPermission('tourleaderboards', 'Permission for changing tour leaderboards configuration');

/* Menu Options */

App.server.setMenuOption('tourleaderboards', 'Tour Leaderboards', '/tourleaderboards/', 'tourleaderboards');

/* Handlers */

App.server.setHandler('tourtable', (context, parts) => {
	let room = Text.toRoomid((parts[0] || "").split('?')[0]);
	if (room) {
		let tableFile = Path.resolve(App.dataDir, 'tour-tables', room + '.html');
		context.endWithStaticFile(tableFile);
	} else {
		context.endWithError('403', 'Forbidden', 'You have not permission to access this path!');
	}
});

App.server.setHandler('tourleaderboards', (context, parts) => {
	/* Permission check */
	if (!context.user || !context.user.can('tourleaderboards')) {
		context.endWith403();
		return;
	}

	/* Actions */
	let ok = null, error = null;

	if (context.post.add) {
		let room = Text.toRoomid(context.post.room);
		try {
			check(room, "You must specify a room");
			check(!Config[room], "Room already configured");
		} catch (err) {
			error = err.message;
		}

		if (!error) {
			let now = new Date();
			Config[room] = {
				onlyOfficial: true,
				winner: 5,
				finalist: 3,
				semifinalist: 1,
				battle: 0,
				cleanPoint: now.toString(),
			};
			App.db.write();
			App.logServerAction(context.user.id, "Leaderboards: Add Room: " + room);
			ok = "Leaderboards configuration saved";
		}
	} else if (context.post.delroom) {
		let room = Text.toRoomid(context.post.room);
		try {
			check(room, "You must specify a room");
			check(Config[room], "Room not found");
		} catch (err) {
			error = err.message;
		}

		if (!error) {
			delete Config[room];
			App.db.write();
			App.logServerAction(context.user.id, "Leaderboards: Delete Room: " + room);
			ok = "Leaderboards configuration saved";
		}
	} else if (context.post.clearroom) {
		let room = Text.toRoomid(context.post.room);
		try {
			check(room, "You must specify a room");
			check(Config[room], "Room not found");
		} catch (err) {
			error = err.message;
		}

		if (!error) {
			let now = new Date();
			App.modules.tourleaderboards.system.data[room] = {};
			Config[room].cleanPoint = now.toString();
			App.db.write();
			App.modules.tourleaderboards.system.db.write();
			App.logServerAction(context.user.id, "Leaderboards: Clear Room: " + room);
			ok = "Leaderboards data cleared for room " + room;
		}
	} else if (context.post.gentable) {
		let room = Text.toRoomid(context.post.room);
		try {
			check(room, "You must specify a room");
			check(Config[room], "Room not found");
		} catch (err) {
			error = err.message;
		}

		if (!error) {
			App.modules.tourleaderboards.system.generateTable(room);
			App.logServerAction(context.user.id, "Leaderboards: Generate Table: " + room);
			ok = "Leaderboards table generated for room " + room;
		}
	} else if (context.post.edit) {
		let room = Text.toRoomid(context.post.room);
		let winner = parseInt(context.post.winner);
		let finalist = parseInt(context.post.finalist);
		let semifinalist = parseInt(context.post.semifinalist);
		let battle = parseInt(context.post.battle);
		let official = !!context.post.onlyofficial;
		try {
			check(room, "You must specify a room");
			check(Config[room], "Room not found");
			check(!isNaN(winner) && winner >= 0, "Invalid configuration");
			check(!isNaN(finalist) && finalist >= 0, "Invalid configuration");
			check(!isNaN(semifinalist) && semifinalist >= 0, "Invalid configuration");
			check(!isNaN(battle) && battle >= 0, "Invalid configuration");
		} catch (err) {
			error = err.message;
		}

		if (!error) {
			Config[room].onlyOfficial = official;
			Config[room].winner = winner;
			Config[room].finalist = finalist;
			Config[room].semifinalist = semifinalist;
			Config[room].battle = battle;
			App.db.write();
			App.logServerAction(context.user.id, "Leaderboards: Edit configuration: " + room);
			ok = "Leaderboards configuration saved";
		}
	}

	/* Generate Html */
	let html = '';

	html += '<script type="text/javascript">function removeRoom(room) {var elem = document.getElementById(\'confirm-del-\' + room);' +
		'if (elem) {elem.innerHTML = \'<form style="display:inline;" id="confirm-delete-form" method="post" action="">' +
		'<input type="hidden" name="room" value="\' + room + \'" />Are you sure?&nbsp;' +
		'<input type="submit" name="delroom" value="Delete Configuration" /></form>\';}return false;}</script>';
	html += '<script type="text/javascript">function clearRoom(room) {var elem = document.getElementById(\'confirm-clear-\' + room);' +
		'if (elem) {elem.innerHTML = \'<form style="display:inline;" id="confirm-delete-form" method="post" action="">' +
		'<input type="hidden" name="room" value="\' + room + \'" />Are you sure?&nbsp;' +
		'<input type="submit" name="clearroom" value="Clear" /></form>\';}return false;}</script>';

	html += '<h2>Leaderboards Configuration</h2>';

	for (let room in Config) {
		html += '<h3>Room: ' + room + '</h3>';
		html += '<p><a href="/tourtable/' + room + '/get" target="_blank">View Leaderboards Table</a></p>';
		html += '<form method="post" action="">';
		html += '<input type="hidden" name="room" value="' + room + '" />';
		html += '<table border="0">';
		html += '<tr><td>Points for winner: </td><td><input name="winner" type="text" size="10" value="' +
			Config[room].winner + '" /></td></tr><tr>';
		html += '<tr><td>Points for finalist: </td><td><input name="finalist" type="text" size="10" value="' +
			Config[room].finalist + '" /></td></tr><tr>';
		html += '<tr><td>Points for semi-finalist: </td><td><input name="semifinalist" type="text" size="10" value="' +
			Config[room].semifinalist + '" /></td></tr><tr>';
		html += '<tr><td>Points per battle: </td><td><input name="battle" type="text" size="10" value="' +
			Config[room].battle + '" /></td></tr><tr>';
		html += '<tr><td colspan="2"><input name="onlyofficial" type="checkbox" value="true"' +
			(Config[room].onlyOfficial ? ' checked="checked"' : '') + ' />&nbsp;Count only official tournaments</td></tr>';
		html += '</table>';
		html += '<p><input type="submit" name="edit" value="Save Changes" /></p>';
		html += '</form>';
		html += '<form method="post" action="">';
		html += '<input type="hidden" name="room" value="' + room + '" />';
		html += '<p><input type="submit" name="gentable" value="Generate Table" /></p>';
		html += '</form>';
		html += '<p><button onclick="clearRoom(\'' + room +
			'\');">Clear Leaderboards</button>&nbsp;<span id="confirm-clear-' + room + '">&nbsp;</span></p>';
		html += '<p><button onclick="removeRoom(\'' + room +
			'\');">Delete Configuration</button>&nbsp;<span id="confirm-del-' + room + '">&nbsp;</span></p>';
		html += '<hr />';
	}

	html += '<form method="post" action=""><input name="room" type="text" size="30" />&nbsp;&nbsp;' +
		'<input type="submit" name="add" value="Add Room" /></form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Tour Ledaerboards - Showdown ChatBot"});
});
