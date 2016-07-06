/**
 * Server Handler: Auto-Invite
 */

'use strict';

const Text = Tools.get('text.js');

/* Permissions */

App.server.setPermission('autoinvite', 'Permission for changing the auto-invite configuration');

/* Menu Options */

App.server.setMenuOption('autoinvite', 'Auto-Invite', '/autoinvite/', 'autoinvite');

/* Handlers */

App.server.setHandler('autoinvite', (context, parts) => {
	/* Permission check */
	if (!context.user || !context.user.can('autoinvite')) {
		context.endWith403();
		return;
	}

	/* Actions */
	let ok = null, error = null;

	if (context.post.edit) {
		let room = Text.toRoomid(context.post.room);
		let publicRoom = Text.toRoomid(context.post.public);
		let rank = context.post.rank || "excepted";
		if (rank.length > 1 && App.config.parser[rank]) {
			rank = App.config.parser[rank];
		}
		if (rank === 'user' || rank === 'excepted' || App.config.parser.groups.indexOf(rank) >= 0) {
			App.config.modules.autoinvite.room = room;
			App.config.modules.autoinvite.public = publicRoom;
			App.config.modules.autoinvite.rank = rank;
			App.db.write();
			App.modules.autoinvite.system.roomAuth = {};
			App.modules.autoinvite.system.roomAuthChanged = true;
			App.logServerAction(context.user.id, "Edit autoinvite configuration");
			ok = "Auto-Invite configuration saved";
		} else {
			error = "Invalid Rank";
		}
	}

	/* Generate Html */
	let html = '';
	html += '<h2>Auto-Invite Configuration</h2>';
	html += '<form method="post" action="">';
	html += '<table border="0">';
	html += '<tr><td><strong>Private Room</strong>:&nbsp;</td><td><input name="room" type="text" size="40" value="' +
		(App.config.modules.autoinvite.room || "") + '" /></td></tr>';
	html += '<tr><td><strong>Public Room</strong>:&nbsp;</td><td><input name="public" type="text" size="40" value="' +
		(App.config.modules.autoinvite.public || "") + '" /></td></tr>';
	html += '<tr><td><strong>Rank</strong>:&nbsp;</td><td>' +
		getRankSelect('rank', App.config.modules.autoinvite.rank) + '</td></tr>';
	html += '</table>';
	html += '<p><input type="submit" name="edit" value="Save Changes" /></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "AutoInvite - Showdown ChatBot"});
});

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
