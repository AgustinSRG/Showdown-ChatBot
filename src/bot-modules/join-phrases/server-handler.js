/**
 * Server Handler: Join-Phrases
 */

'use strict';

const Text = Tools.get('text.js');
const check = Tools.get('check.js');

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('joinphrases', 'Permission for managing Join-Phrases');

	/* Menu Options */
	App.server.setMenuOption('joinphrases', 'Join-Phrases', '/joinphrases/', 'joinphrases', -2);

	/* Handlers */
	App.server.setHandler('joinphrases', (context, parts) => {
		if (!context.user || !context.user.can('joinphrases')) {
			context.endWith403();
			return;
		}

		let html = '';

		if (parts[0] === 'room') {
			let room = Text.toRoomid(parts[1]);
			if (room) {
				return roomHandler(context, room, html);
			} else {
				context.endWith404();
				return;
			}
		}

		let ok = null, error = null;

		if (context.post.add) {
			let data = App.modules.joinphrases.system.config.rooms;
			let room = Text.toRoomid(context.post.room);
			try {
				check(room, 'You must specify a room');
				check(!data[room], 'Room <strong>' + room + '</strong> already exists in this list.');
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				data[room] = {};
				App.modules.joinphrases.system.db.write();
				App.logServerAction(context.user.id, "Add Join-phrases Room: " + room);
				ok = 'Room <strong>' + room + '</strong> added to the join-phrases feature.';
			}
		}

		html += '<div align="center"><h2>Join-Phrases</h2>';

		let opts = [];
		for (let room in App.modules.joinphrases.system.config.rooms) {
			opts.push('<a class="submenu-option" href="/joinphrases/room/' + room + '/">' + room + '</a>');
		}
		html += opts.join(' | ');
		html += '</div>';

		html += '<hr />';

		html += '<form method="post" action=""><input name="room" type="text" size="30" />' +
		'&nbsp;&nbsp;<input type="submit" name="add" value="Add Room" /></form>';

		if (error) {
			html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
		} else if (ok) {
			html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
		}

		context.endWithWebPage(html, {title: "Join-Phrases - Showdown ChatBot"});
	});

	function roomHandler(context, room, html) {
		let config = App.modules.joinphrases.system.config;
		let ok = null, error = null;

		if (context.post.add) {
			let user = Text.toId(context.post.user);
			let phrase = Text.trim(context.post.phrase);
			try {
				check(user && user.length < 20, "Invalid username");
				check(phrase, "Join phrase cannot be blank");
				check(phrase.length < 300, "Join phrase cannot be longer than 300 characters");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				if (!config.rooms[room]) {
					config.rooms[room] = {};
				}
				config.rooms[room][user] = phrase;
				App.modules.joinphrases.system.db.write();
				App.logServerAction(context.user.id, "Set Join-phrase. Room: " + room + ", User: " + user);
				ok = 'Join-Phrase successfully set for user <strong>' + user + '</strong>.';
			}
		} else if (context.post.remove) {
			let user = Text.toId(context.post.user);
			try {
				check(user, "Invalid username");
				check(config.rooms[room] && config.rooms[room][user], "User not found");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				delete config.rooms[room][user];
				if (Object.keys(config.rooms[room]).length === 0) {
					delete config.rooms[room];
				}
				App.modules.joinphrases.system.db.write();
				App.logServerAction(context.user.id, "Delete Join-phrase. Room: " + room + ", User: " + user);
				ok = 'Join-Phrase successfully deleted for user <strong>' + user + '</strong>.';
			}
		}

		html += '<div align="center"><h2>Join-Phrases</h2>';

		let opts = [];
		for (let k in config.rooms) {
			opts.push('<a class="submenu-option' + (room === k ? '-selected' : '') + '" href="/joinphrases/room/' + k + '/">' + k + '</a>');
		}
		html += opts.join(' | ');
		html += '</div>';

		html += '<hr />';

		html += '<h3>Join-phrases of ' + room + '</h3>';

		html += '<table border="1">';
		html += '<tr><td width="150"><div align="center"><strong>User</strong></div></td>' +
		'<td width="400"><div align="center"><strong>Phrase</strong></div></td>' +
		'<td width="100"><div align="center"><strong>Options</strong></div></td></tr>';
		if (config.rooms[room]) {
			for (let user in config.rooms[room]) {
				html += '<tr>';
				html += '<td>' + user + '</td>';
				html += '<td>' + Text.escapeHTML(config.rooms[room][user]) + '</td>';
				html += '<td><div align="center"><form style="display:inline;" method="post" action="">' +
			'<input type="hidden" name="user" value="' + user +
			'" /><input type="submit" name="remove" value="Delete" /></form></div></td>';
				html += '</tr>';
			}
		}
		html += '</table>';

		html += '<br /><hr /><br />';

		html += '<form method="post" action="">';
		html += '<p><strong>User</strong>: <input name="user" type="text" size="30" maxlength="19" /></p>';
		html += '<p><strong>Phrase</strong>: <input name="phrase" type="text" size="80" maxlength="300" /></p>';
		html += '<p><input type="submit" name="add" value="Add Join-Phrase" /></p>';
		html += '</form>';

		if (error) {
			html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
		} else if (ok) {
			html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
		}
		context.endWithWebPage(html, {title: "Join-Phrases - Showdown ChatBot"});
	}
};
