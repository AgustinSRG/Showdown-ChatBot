/**
 * Server Handler: Blacklist
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Template = Tools('html-template');

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

		let htmlVars = {};

		htmlVars.rooms = '';
		let data = App.modules.blacklist.system.data;
		for (let room in data) {
			htmlVars.rooms += roomTemplate.make({
				room: room,
				blacklist: Object.keys(data[room]).join(', '),
			});
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Blacklist - Showdown ChatBot"});
	});
};
