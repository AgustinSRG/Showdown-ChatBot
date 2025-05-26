/**
 * Server Handler: Blacklist
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Template = Tools('html-template');
const check = Tools('check');

const mainTemplate = new Template(Path.resolve(__dirname, 'template-main.html'));
const roomTemplate = new Template(Path.resolve(__dirname, 'template-room.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('blacklist', 'Permission for managing the blacklist');

	/* Menu Options */
	App.server.setMenuOption('blacklist', 'Blacklist', '/blacklist/', 'blacklist', 0);

	/* Handlers */
	App.server.setHandler('blacklist', (context, parts) => {
		if (!context.user || !context.user.can('blacklist')) {
			context.endWith403();
			return;
		}

		let ok = null, error = null;
		if (context.post.edit) {
			let room = Text.toRoomid(context.post.room);
			if (room) {
				let blacklist = Object.create(null);
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
				ok = "Blacklist saved for room " + Text.escapeHTML(room);
			} else {
				error = "You must specify a room";
			}
		} else if (context.post.add) {
			let room = Text.toRoomid(context.post.room);
			if (room) {
				if (!App.modules.blacklist.system.data[room]) {
					App.modules.blacklist.system.data[room] = Object.create(null);
					App.modules.blacklist.system.db.write();
					App.logServerAction(context.user.id, "Added blacklist: " + room);
					ok = "Added blacklist for room " + Text.escapeHTML(room);
				} else {
					error = "Room " + Text.escapeHTML(room) + " already has a blacklist";
				}
			} else {
				error = "You must specify a room";
			}
		} else if (context.post.del) {
			let data = App.modules.blacklist.system.data;
			let room = Text.toRoomid(context.post.room);
			try {
				check(room, 'You must specify a room');
				check(data[room], 'Room <strong>' + Text.escapeHTML(room) + '</strong> does not exist.');
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				delete data[room];
				App.modules.blacklist.system.db.write();
				App.logServerAction(context.user.id, "Removed Blacklist. Room: " + room);
				ok = 'Room <strong>' + Text.escapeHTML(room) + '</strong> removed from the blacklist feature.';
			}
		}

		let htmlVars = Object.create(null);

		htmlVars.rooms = '';
		let data = App.modules.blacklist.system.data;
		for (let room in data) {
			htmlVars.rooms += roomTemplate.make({
				room: Text.escapeHTML(room),
				blacklist: Text.escapeHTML(Object.keys(data[room]).join(', ')),
			});
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), { title: "Blacklist - Showdown ChatBot" });
	});
};
