/**
 * Server Handler: Pokemon
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'template.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('pokemon', 'Permission for changing the pokemon module configuration');

	/* Menu Options */
	App.server.setMenuOption('pokemon', 'Pokemon', '/pokemon/', 'pokemon', -2);

	/* Handlers */
	App.server.setHandler('pokemon', (context, parts) => {
		if (!context.user || !context.user.can('pokemon')) {
			context.endWith403();
			return;
		}

		let Config = App.config.modules.pokemon;
		if (!Config.roomtier) {
			Config.roomtier = {};
		}

		let ok = null, error = null;
		if (context.post.save) {
			let format = Text.toId(context.post.format);
			if (format) {
				Config.gtier = format;
				App.saveConfig();
				App.logServerAction(context.user.id, "Edit pokemon configuration");
				ok = "Pokemon configuration saved";
			} else {
				error = "You must specify a format";
			}
		} else if (context.post.savelink) {
			let link = Text.trim(context.post.usagelink);
			if (link) {
				Config.usagelink = link;
				App.saveConfig();
				App.data.cache.uncacheAll('smogon-usage');
				App.logServerAction(context.user.id, "Edit pokemon configuration (usage link)");
				ok = "Pokemon configuration saved";
			} else {
				error = "You must specify a link";
			}
		} else if (context.post.setroom) {
			let format = Text.toId(context.post.format);
			let room = Text.toRoomid(context.post.room);
			if (format) {
				if (room) {
					Config.roomtier[room] = format;
					App.saveConfig();
					App.logServerAction(context.user.id, "Edit pokemon configuration");
					ok = "Pokemon configuration saved";
				} else {
					error = "You must specify a room";
				}
			} else {
				error = "You must specify a format";
			}
		} else if (context.post.deleteroom) {
			let room = Text.toRoomid(context.post.room);
			if (room) {
				if (Config.roomtier[room]) {
					delete Config.roomtier[room];
					App.saveConfig();
					App.logServerAction(context.user.id, "Edit pokemon configuration");
					ok = "Pokemon configuration saved";
				} else {
					error = "Room not found.";
				}
			} else {
				error = "You must specify a room";
			}
		}

		let htmlVars = {};
		htmlVars.usage_link = Config.usagelink || "";
		htmlVars.def_format = (Config.gtier || "");
		htmlVars.rooms = '';

		for (let room in Config.roomtier) {
			htmlVars.rooms += '<tr><td>' + room + '</td><td>' + Config.roomtier[room] +
				'</td><td><div align="center"><form method="post" action="" style="display:inline;"><input type="hidden" name="room" value="' +
				room + '" /><label><input type="submit" name="deleteroom" value="Delete" /></label></form></div></td></tr>';
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Pokemon - Showdown ChatBot"});
	});
};
