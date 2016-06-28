/**
 * Server Handler: Blacklist
 */

'use strict';

const Text = Tools.get('text.js');

/* Permissions */

App.server.setPermission('blacklist', 'Permission for managing the blacklist');

/* Menu Options */

App.server.setMenuOption('blacklist', 'Blacklist', '/blacklist/', 'blacklist');

/* Handlers */

App.server.setHandler('blacklist', (context, parts) => {
	/* Permission check */
	if (!context.user || !context.user.can('blacklist')) {
		context.endWith403();
		return;
	}

	/* Actions */
	let ok = null, error = null;
	if (context.post.edit) {
		let room = Text.toRoomid(context.post.room);
		if (room) {
			let blacklist = {};
			let empty = true;
			let data = (context.post.blacklist || "").trim().split(',');
			for (let i = 0; i < data.length; i++) {
				let user = Text.toId(data[i]);
				if (!user || user.length > 19) continue;
				blacklist[user] = true;
				empty = false;
			}
			if (empty) {
				delete App.modules.blacklist.system.data[room];
			} else {
				App.modules.blacklist.system.data[room] = blacklist;
				let cmds = App.modules.blacklist.system.getInitCmds();
				if (cmds.length) {
					App.bot.send(cmds);
				}
			}
			App.modules.blacklist.system.db.write();
			App.logServerAction(context.user.id, "Edit Blacklist: " + room);
			ok = "Blacklist saved for room " + room;
		} else {
			error = "You must specify a room";
		}
	} else if (context.post.add) {
		let room = Text.toRoomid(context.post.room);
		if (room) {
			if (!App.modules.blacklist.system.data[room]) {
				App.modules.blacklist.system.data[room] = {};
				App.modules.blacklist.system.db.write();
				App.logServerAction(context.user.id, "Added blacklist: " + room);
				ok = "Added blacklist for room " + room;
			} else {
				error = "Room " + room + " already has a blacklist";
			}
		} else {
			error = "You must specify a room";
		}
	}

	/* Generate Html */
	let html = '';
	html += '<h2>Blacklist</h2>';

	let data = App.modules.blacklist.system.data;
	for (let room in data) {
		html += '<form method="post" action="">';
		html += '<input type="hidden" name="room" value="' + room + '" />';
		html += '<p><strong>Room:</strong> ' + room + '</p>';
		html += '<p><textarea name="blacklist" cols="120" rows="4">' + Object.keys(data[room]).join(', ') + '</textarea></p>';
		html += '<p><input type="submit" name="edit" value="Save Changes" /></p>';
		html += '</form>';
		html += '<hr />';
	}

	html += '<form method="post" action=""><input name="room" type="text" size="30" />&nbsp;&nbsp;' +
		'<input type="submit" name="add" value="Add Room" /></form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Blacklist - Showdown ChatBot"});
});
