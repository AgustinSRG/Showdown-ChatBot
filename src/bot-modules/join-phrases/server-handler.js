/**
 * Server Handler: Join-Phrases
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'template-main.html'));
const roomTemplate = new Template(Path.resolve(__dirname, 'template-room.html'));

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

		if (parts[0] === 'room') {
			let room = Text.toRoomid(parts[1]);
			if (room) {
				return roomHandler(context, room);
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

		let htmlVars = {};

		let opts = [];
		for (let room in App.modules.joinphrases.system.config.rooms) {
			opts.push('<a class="submenu-option" href="/joinphrases/room/' + room + '/">' + room + '</a>');
		}
		htmlVars.submenu = opts.join(' | ');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Join-Phrases - Showdown ChatBot"});
	});

	function roomHandler(context, room) {
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

		let htmlVars = {};

		htmlVars.room = room;
		htmlVars.name = Text.escapeHTML(App.parser.getRoomTitle(room));

		let opts = [];
		for (let k in config.rooms) {
			opts.push('<a class="submenu-option' + (room === k ? '-selected' : '') + '" href="/joinphrases/room/' + k + '/">' + k + '</a>');
		}
		htmlVars.submenu = opts.join(' | ');

		htmlVars.phrases = '';
		if (config.rooms[room]) {
			for (let user in config.rooms[room]) {
				htmlVars.phrases += '<tr>';
				htmlVars.phrases += '<td>' + user + '</td>';
				htmlVars.phrases += '<td>' + Text.escapeHTML(config.rooms[room][user]) + '</td>';
				htmlVars.phrases += '<td><div align="center"><form style="display:inline;" method="post" action="">' +
					'<input type="hidden" name="user" value="' + user +
					'" /><input type="submit" name="remove" value="Delete" /></form></div></td>';
				htmlVars.phrases += '</tr>';
			}
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(roomTemplate.make(htmlVars), {title: "Join-Phrases - Showdown ChatBot"});
	}
};
