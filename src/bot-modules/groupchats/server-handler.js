/**
 * Server Handler: Groupchats
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
	App.server.setPermission('groupchats', 'Permission for configuring automated groupchats');

	/* Menu Options */
	App.server.setMenuOption('groupchats', 'Groupchats', '/groupchats/', 'groupchats', -2);

	/* Handlers */
	App.server.setHandler('groupchats', (context, parts) => {
		if (!context.user || !context.user.can('groupchats')) {
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
			let data = App.modules.groupchats.system.config;
			let room = Text.toRoomid(context.post.room);
			try {
				check(room, 'You must specify a room');
				check(!data[room], 'Groupchat <strong>' + room + '</strong> already exists in this list.');
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				data[room] = {
					private: !!context.post.private,
					name: Text.trim(context.post.room).replace(/[\,]/g, ""),
					intro: "",
					users: {},
					authfrom: "",
				};
				App.modules.groupchats.system.saveData();
				App.modules.groupchats.system.cacheRooms();
				App.modules.groupchats.system.tick();
				App.logServerAction(context.user.id, "Add groupchat: " + room);
				ok = 'Groupchat <strong>' + room + '</strong> added to the groupchats feature.';
			}
		} else if (context.post.remove) {
			let data = App.modules.groupchats.system.config;
			let room = Text.toRoomid(context.post.room);
			try {
				check(room, 'You must specify a room');
				check(data[room], 'Groupchat <strong>' + room + '</strong> does not exists in this list.');
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				App.modules.groupchats.system.leave(room);
				delete data[room];
				App.modules.groupchats.system.saveData();
				App.modules.groupchats.system.cacheRooms();
				App.modules.groupchats.system.tick();
				App.logServerAction(context.user.id, "Delete groupchat: " + room);
				ok = 'Groupchat <strong>' + room + '</strong> removed sucessfully.';
			}
		}

		let htmlVars = {};

		let opts = [];
		for (let room in App.modules.groupchats.system.config) {
			opts.push('<a class="submenu-option" href="/groupchats/room/' + room + '/">' +
					  Text.escapeHTML(App.modules.groupchats.system.config[room].name) + '</a>');
		}
		htmlVars.submenu = opts.join(' | ');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Groupchats - Showdown ChatBot"});
	});

	function roomHandler(context, room) {
		let config = App.modules.groupchats.system.config;
		let ok = null, error = null;
		if (!config[room]) {
			context.endWith404();
			return;
		}

		if (context.post.edit) {
			let data = App.modules.groupchats.system.config;
			let name = Text.trim(context.post.room).replace(/[\,]/g, "");
			let isPrivate = !!context.post.private;
			let authfrom = Text.toRoomid(context.post.authfrom);
			try {
				check(name && Text.toId(name), 'You must specify a valid name');
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				data[room].name = name;
				data[room].private = isPrivate;
				data[room].authfrom = authfrom;
				App.modules.groupchats.system.saveData();
				App.modules.groupchats.system.cacheRooms();
				App.modules.groupchats.system.tick();
				App.logServerAction(context.user.id, "Edit groupchat: " + room);
				ok = 'Changes saved sucessfully.';
			}
		} else if (context.post.modintro) {
			let data = App.modules.groupchats.system.config;
			let intro = Text.trim(context.post.intro);
			data[room].intro = intro;
			App.modules.groupchats.system.saveData();
			App.modules.groupchats.system.setRoomIntro(room);
			App.logServerAction(context.user.id, "Edit groupchat (roomintro): " + room);
			ok = 'Changes saved sucessfully.';
		} else if (context.post.setauth) {
			let data = App.modules.groupchats.system.config;
			let user = Text.toId(context.post.user);
			let group = Text.toId(context.post.group);
			try {
				check(user && user.length < 20, 'You must specify a valid username');
				check(group && (group in {"none": 1, "voice": 1, "driver": 1, "mod": 1}), 'You must specify a valid group');
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				if (group === "none") {
					delete data[room].users[user];
					group = "deauth";
				} else {
					data[room].users[user] = group;
				}
				App.modules.groupchats.system.saveData();
				App.modules.groupchats.system.setAuth(room, user, group);
				App.logServerAction(context.user.id, "Edit groupchat (auth): " + room + " / " + user + " / " + group);
				ok = 'Changes saved sucessfully.';
			}
		}

		let htmlVars = {};

		htmlVars.room = room;
		htmlVars.name = Text.escapeHTML(config[room].name);
		htmlVars.private = config[room].private ? 'checked="checked"' : '';
		htmlVars.authfrom = config[room].authfrom || "";

		htmlVars.intro = JSON.stringify(config[room].intro);

		let opts = [];
		for (let room in App.modules.groupchats.system.config) {
			opts.push('<a class="submenu-option" href="/groupchats/room/' + room + '/">' +
					  Text.escapeHTML(App.modules.groupchats.system.config[room].name) + '</a>');
		}
		htmlVars.submenu = opts.join(' | ');

		htmlVars.users = '';

		for (let user in config[room].users) {
			htmlVars.users += '<tr>';
			htmlVars.users += '<td>' + Text.escapeHTML(user) + '</td>';
			htmlVars.users += '<td>' + Text.escapeHTML(config[room].users[user]) + '</td>';
			htmlVars.users += '</tr>';
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(roomTemplate.make(htmlVars), {title: "Groupchats - Showdown ChatBot"});
	}
};
