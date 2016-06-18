/**
 * Server Handler: ChatLogger Configuration
 */

'use strict';

const Text = Tools.get('text.js');

/* Permissions */

App.server.setPermission('chatlogger', 'Permission for changing the chat-logger configuration');

/* Menu Options */

App.server.setMenuOption('chatlogger', 'Chat-Logger', '/chatlogger/', 'chatlogger');

/* Handlers */

App.server.setHandler('chatlogger', (context, parts) => {
	/* Permission Check */
	if (!context.user || !context.user.can('chatlogger')) {
		context.endWith403();
		return;
	}

	/* Actions */
	let ok = null, error = null;
	if (context.post.save) {
		let maxold = parseInt(context.post.age);
		if (!isNaN(maxold) && maxold >= 0) {
			let rooms = {};
			let aux = (context.post.rooms || "").split(',');
			for (let i = 0; i < aux.length; i++) {
				let room = Text.toRoomid(aux[i]);
				if (!room) return;
				rooms[room] = true;
			}
			App.config.modules.chatlogger.rooms = rooms;
			App.config.modules.chatlogger.logpm = !!context.post.logpm;
			App.config.modules.chatlogger.maxold = maxold;
			App.db.write();
			App.logServerAction(context.user.id, 'Edit Chat-Logger Configuration (ChatLogger Module)');
			ok = "Chatloogger configuration saved.";
		} else {
			error = "Max age of logs must be a number equal or higher than 0.";
		}
	}

	/* Generate HTML */
	let html = '';
	html += '<h2>Chat-Logger Configuration</h2>';
	html += '<form method="post" action="">';
	html += '<table border="0">';
	html += '<tr><td><strong>Rooms To Log</strong>: </td><td><label><input name="rooms" type="text" size="70" value="' + Object.keys(App.config.modules.chatlogger.rooms).join(', ') + '" /> (Separated by commas) </label></td></tr>';
	html += '<tr><td colspan="2"><label><input type="checkbox" name="logpm" value="true" + ' + (App.config.modules.chatlogger.logpm ? ' checked="checked"' : '') + ' /><strong>Log Private Messages </strong></label></td></tr>';
	html += '<tr><td><strong>Max age of logs (days)</strong>: </td><td><input name="age" type="text" size="20" value="' + App.config.modules.chatlogger.maxold + '" /> (0 days to keep logs indefinitely) </td></tr>';
	html += '</table>';
	html += '<p><label><input type="submit" name="save" value="Save Changes" /></label></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Chat-Logger Configuration - Showdown ChatBot"});
});

