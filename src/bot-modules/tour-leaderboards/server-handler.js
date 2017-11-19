/**
 * Server Handler: Tour Leaderboards
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'template.html'));
const roomTemplate = new Template(Path.resolve(__dirname, 'template-room.html'));

exports.setup = function (App) {
	const Config = App.config.modules.tourleaderboards;

	/* Permissions */
	App.server.setPermission('tourleaderboards', 'Permission for changing tour leaderboards configuration');

	/* Menu Options */
	App.server.setMenuOption('tourleaderboards', 'Tour&nbsp;Leaderboards', '/tourleaderboards/', 'tourleaderboards', -1);

	/* Handlers */
	App.server.setHandler('tourtable', (context, parts) => {
		let room = Text.toRoomid((parts[0] || "").split('?')[0]);
		if (room) {
			let tableFile = Path.resolve(App.dataDir, 'tour-tables', room + '.html');
			context.endWithStaticFile(tableFile);
		} else {
			context.endWithError('403', 'Forbidden', 'You have not permission to access this path!');
		}
	});

	App.server.setHandler('tourleaderboards', (context, parts) => {
		if (!context.user || !context.user.can('tourleaderboards')) {
			context.endWith403();
			return;
		}

		let ok = null, error = null;
		if (context.post.add) {
			let room = Text.toRoomid(context.post.room);
			try {
				check(room, "You must specify a room");
				check(!Config[room], "Room already configured");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				let now = new Date();
				Config[room] = {
					onlyOfficial: true,
					winner: 5,
					finalist: 3,
					semifinalist: 1,
					battle: 0,
					useratio: true,
					cleanPoint: now.toString(),
				};
				App.db.write();
				App.logServerAction(context.user.id, "Leaderboards: Add Room: " + room);
				ok = "Leaderboards configuration saved";
			}
		} else if (context.post.delroom) {
			let room = Text.toRoomid(context.post.room);
			try {
				check(room, "You must specify a room");
				check(Config[room], "Room not found");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				delete Config[room];
				App.db.write();
				App.logServerAction(context.user.id, "Leaderboards: Delete Room: " + room);
				ok = "Leaderboards configuration saved";
			}
		} else if (context.post.clearroom) {
			let room = Text.toRoomid(context.post.room);
			try {
				check(room, "You must specify a room");
				check(Config[room], "Room not found");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				let now = new Date();
				App.modules.tourleaderboards.system.data[room] = {};
				Config[room].cleanPoint = now.toString();
				App.db.write();
				App.modules.tourleaderboards.system.db.write();
				App.logServerAction(context.user.id, "Leaderboards: Clear Room: " + room);
				ok = "Leaderboards data cleared for room " + room;
			}
		} else if (context.post.gentable) {
			let room = Text.toRoomid(context.post.room);
			try {
				check(room, "You must specify a room");
				check(Config[room], "Room not found");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				App.modules.tourleaderboards.system.generateTable(room);
				App.logServerAction(context.user.id, "Leaderboards: Generate Table: " + room);
				ok = "Leaderboards table generated for room " + room;
			}
		} else if (context.post.edit) {
			let room = Text.toRoomid(context.post.room);
			let winner = parseInt(context.post.winner);
			let finalist = parseInt(context.post.finalist);
			let semifinalist = parseInt(context.post.semifinalist);
			let battle = parseInt(context.post.battle);
			let official = !!context.post.onlyofficial;
			let useratio = !!context.post.useratio;
			try {
				check(room, "You must specify a room");
				check(Config[room], "Room not found");
				check(!isNaN(winner) && winner >= 0, "Invalid configuration");
				check(!isNaN(finalist) && finalist >= 0, "Invalid configuration");
				check(!isNaN(semifinalist) && semifinalist >= 0, "Invalid configuration");
				check(!isNaN(battle) && battle >= 0, "Invalid configuration");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				Config[room].onlyOfficial = official;
				Config[room].useratio = useratio;
				Config[room].winner = winner;
				Config[room].finalist = finalist;
				Config[room].semifinalist = semifinalist;
				Config[room].battle = battle;
				App.db.write();
				App.logServerAction(context.user.id, "Leaderboards: Edit configuration: " + room);
				ok = "Leaderboards configuration saved";
			}
		}

		let htmlVars = {};

		htmlVars.rooms = '';
		for (let room in Config) {
			htmlVars.rooms += roomTemplate.make({
				room: room,
				name: Text.escapeHTML(App.parser.getRoomTitle(room)),
				winner: Config[room].winner,
				finalist: Config[room].finalist,
				semifinalist: Config[room].semifinalist,
				battle: Config[room].battle,
				onlyofficial: (Config[room].onlyOfficial ? ' checked="checked"' : ''),
				useratio: (Config[room].useratio ? ' checked="checked"' : ''),
			});
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Tour Ledaerboards - Showdown ChatBot"});
	});
};
