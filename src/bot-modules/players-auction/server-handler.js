/**
 * Server Handler: Players Auction
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
	App.server.setPermission('auction', 'Permission for changing auction configuration');

	/* Menu Options */
	App.server.setMenuOption('auction', 'Players&nbsp;Auction', '/auction/', 'auction', -2);

	/* Handlers */
	App.server.setHandler('auction', (context, parts) => {
		if (!context.user || !context.user.can('auction')) {
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

		let Mod = App.modules.playersauction.system;
		let ok = null, error = null;

		if (context.post.add) {
			let room = Text.toRoomid(context.post.room);
			try {
				check(room, 'You must specify a room');
				check(!Mod.rooms[room], 'Room <strong>' + room + '</strong> already exists in this list.');
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				Mod.createAuction(room);
				Mod.saveData();
				App.logServerAction(context.user.id, "Add Players-Auction Room: " + room);
				ok = 'Room <strong>' + room + '</strong> added to the players-auction feature.';
			}
		} else if (context.post.remove) {
			let room = Text.toRoomid(context.post.room);
			try {
				check(room, 'You must specify a room');
				check(Mod.rooms[room], 'Room <strong>' + room + '</strong> does not exists in this list.');
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				Mod.removeAuction(room);
				Mod.saveData();
				App.logServerAction(context.user.id, "Remove Players-Auction Room: " + room);
				ok = 'Room <strong>' + room + '</strong> removed from players-auction feature.';
			}
		}

		let htmlVars = {};

		let opts = [];
		for (let room in Mod.rooms) {
			opts.push('<a class="submenu-option" href="/auction/room/' + room + '/">' + room + '</a>');
		}
		htmlVars.submenu = opts.join(' | ');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Players Auction - Showdown ChatBot"});
	});

	function roomHandler(context, room) {
		let Mod = App.modules.playersauction.system;
		let ok = null, error = null;

		if (!Mod.rooms[room]) {
			context.endWith404();
			return;
		}

		if (context.post.edit) {
			let data = {};
			try {
				data = JSON.parse(context.post.content);
				check(typeof data === "object", 'Root must be object');
				check(typeof data.players === "object", 'Players must be object');
				check(typeof data.teams === "object", 'Teams must be object');
			} catch (err) {
				error = "Invalid Data. " + err.message;
			}
			if (!error) {
				Mod.removeAuction(room);
				Mod.data[room] = data;
				Mod.createAuction(room);
				Mod.saveData();
				App.logServerAction(context.user.id, "Edit Players-Auction Room: " + room);
				ok = 'Players-Auction data modified sucessfully.';
			}
		}

		let htmlVars = {};

		let opts = [];
		for (let k in Mod.rooms) {
			opts.push('<a class="submenu-option' + (room === k ? '-selected' : '') + '" href="/auction/room/' + k + '/">' + k + '</a>');
		}
		htmlVars.submenu = opts.join(' | ');

		htmlVars.content = JSON.stringify(JSON.stringify(Mod.rooms[room].data));
		htmlVars.room = room;
		htmlVars.name = Text.escapeHTML(App.parser.getRoomTitle(room));

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(roomTemplate.make(htmlVars), {title: "Players Auction - Showdown ChatBot"});
	}
};
