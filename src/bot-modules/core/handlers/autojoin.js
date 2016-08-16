/**
 * Server Handler: Bot Autojoin Configuration
 */

'use strict';

const Text = Tools.get('text.js');

/* Menu Options */

App.server.setMenuOption('autojoin', 'Bot&nbsp;AutoJoin', '/autojoin/', 'core');

/* Handlers */

App.server.setHandler('autojoin', (context, parts) => {
	/* Permission check */
	if (!context.user || !context.user.can('core')) {
		context.endWith403();
		return;
	}

	/* Actions */
	let ok = null, error = null;
	if (context.post.edit) {
		let rooms = [];
		let aux = (context.post.rooms || "").split(',');
		for (let i = 0; i < aux.length; i++) {
			let room = Text.toRoomid(aux[i]);
			if (room && rooms.indexOf(room) < 0) {
				rooms.push(room);
			}
		}
		let privaterooms = [];
		aux = (context.post.privaterooms || "").split(',');
		for (let i = 0; i < aux.length; i++) {
			let room = Text.toRoomid(aux[i]);
			if (room && privaterooms.indexOf(room) < 0) {
				privaterooms.push(room);
			}
		}
		App.config.modules.core.rooms = rooms;
		App.config.modules.core.privaterooms = privaterooms;
		App.config.modules.core.avatar = context.post.avatar || '';
		App.db.write();
		App.logServerAction(context.user.id, 'Edit Bot Autojoin details (Core Module)');
		ok = "Bot Auto-Join details have been set sucessfully. Restart the bot to make them effective.";
	}

	/* Generate HTML */
	let html = '';
	html += '<h2>Bot Auto-Join Configuration</h2>';
	html += '<form method="post" action="">';
	html += '<table border="0">';
	html += ' <tr><td><strong>Public Rooms</strong>:&nbsp;</td><td><label><input name="rooms" type="text" size="70" value="' +
		(App.config.modules.core.rooms || []).join(', ') + '" />&nbsp;(Separated by commas)</label></td></tr>';
	html += ' <tr><td><strong>Private Rooms</strong>:&nbsp;</td><td><label><input name="privaterooms" type="text" size="70" value="' +
		(App.config.modules.core.privaterooms || []).join(', ') + '" />&nbsp;(Separated by commas)</label></td></tr>';
	html += '<tr><td><strong>Avatar</strong>:&nbsp;</td><td><label><input name="avatar" type="text" size="20" value="' +
		(App.config.modules.core.avatar || '') + '" /></label></td></tr>';
	html += '</table>';
	html += '<p><label><input type="submit" name="edit" value="Save Changes" /></label></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "AutoJoin Configuration - Showdown ChatBot"});
});
