/**
 * Server Handler: Tour Leaderboards
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'template.html'));
const tableTemplate = new Template(Path.resolve(__dirname, 'template-table.html'));

exports.setup = function (App) {
	const Config = App.config.modules.tourldbcustom;

	/* Permissions */
	App.server.setPermission('tourldbcustom', 'Permission for changing custom tour leaderboards configuration');

	/* Menu Options */
	App.server.setMenuOption('tourldbcustom', 'Tour&nbsp;Leaderboards&nbsp;(Custom)', '/tourldbcustom/', 'tourldbcustom', -1);

	/* Handlers */
	App.server.setHandler('tourtablecustom', (context, parts) => {
		let leaderboardsId = Text.toId((parts[0] || "").split('?')[0]);
		if (leaderboardsId) {
			let tableFile = Path.resolve(App.dataDir, 'tour-tables-custom', leaderboardsId + '.html');
			context.endWithStaticFile(tableFile);
		} else {
			context.endWithError('403', 'Forbidden', 'You have not permission to access this path!');
		}
	});

	App.server.setHandler('tourldbcustom', (context, parts) => {
		if (!context.user || !context.user.can('tourldbcustom')) {
			context.endWith403();
			return;
		}

		let ok = null, error = null;
		if (context.post.add) {
			let leaderboardsId = Text.toId(context.post.name);
			try {
				check(leaderboardsId, "You must specify a leaderboards ID");
				check(!Config[leaderboardsId], "Leaderboards ID already configured");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				let now = new Date();
				Config[leaderboardsId] = {
					name: ("" + context.post.name).trim(),
					winner: 5,
					finalist: 3,
					semifinalist: 1,
					cleanPoint: now.toString(),
				};
				App.db.write();
				App.logServerAction(context.user.id, "Leaderboard custom: Add table: " + leaderboardsId);
				ok = "Leaderboards configuration saved";
			}
		} else if (context.post.del) {
			let leaderboardsId = Text.toId(context.post.name);
			try {
				check(leaderboardsId, "You must specify a leaderboards ID");
				check(Config[leaderboardsId], "Leaderboards ID not found");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				delete Config[leaderboardsId];
				App.db.write();
				App.logServerAction(context.user.id, "Leaderboards custom: Delete table: " + leaderboardsId);
				ok = "Leaderboards configuration saved";
			}
		} else if (context.post.clear) {
			let leaderboardsId = Text.toId(context.post.name);
			try {
				check(leaderboardsId, "You must specify a leaderboards ID");
				check(Config[leaderboardsId], "Leaderboards ID not found");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				let now = new Date();
				App.modules.tourldbcustom.system.data[leaderboardsId] = Object.create(null);
				Config[leaderboardsId].cleanPoint = now.toString();
				App.db.write();
				App.modules.tourldbcustom.system.db.write();
				App.modules.tourldbcustom.system.generateTable(leaderboardsId);
				App.logServerAction(context.user.id, "Leaderboards custom: Clear: " + leaderboardsId);
				ok = "Leaderboards data cleared for " + Text.escapeHTML(leaderboardsId);
			}
		} else if (context.post.gentable) {
			let leaderboardsId = Text.toId(context.post.name);
			try {
				check(leaderboardsId, "You must specify a leaderboards ID");
				check(Config[leaderboardsId], "Leaderboards ID not found");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				App.modules.tourldbcustom.system.generateTable(leaderboardsId);
				App.logServerAction(context.user.id, "Leaderboards custom: Generate Table: " + leaderboardsId);
				ok = "Leaderboards table generated for " + Text.escapeHTML(leaderboardsId);
			}
		} else if (context.post.restoredata) {
			let leaderboardsId = Text.toId(context.post.name);
			let restoredData;
			try {
				check(leaderboardsId, "You must specify a leaderboards ID");
				check(Config[leaderboardsId], "Leaderboards ID not found");

				restoredData = JSON.parseNoPrototype(context.post.dtrestored + "");

				check(typeof restoredData === "object" && !!restoredData, "Invalid data provided");
			} catch (err) {
				error = Text.escapeHTML(err.message);
			}

			if (!error) {
				if (!App.modules.tourldbcustom.system.data[leaderboardsId]) {
					App.modules.tourldbcustom.system.data[leaderboardsId] = Object.create(null);
				}

				for (let uid of Object.keys(restoredData)) {
					let userData = restoredData[uid];
					if (!userData || !Array.isArray(userData)) continue;
					uid = Text.toId(uid);
					App.modules.tourldbcustom.system.data[leaderboardsId][uid] = [
						userData[0] + "",
						parseInt(userData[1]) || 0,
						parseInt(userData[2]) || 0,
						parseInt(userData[3]) || 0,
						parseInt(userData[4]) || 0,
						parseInt(userData[5]) || 0,
					];
				}
				App.modules.tourldbcustom.system.db.write();
				App.modules.tourldbcustom.system.generateTable(leaderboardsId);
				App.logServerAction(context.user.id, "Leaderboards custom: Restore data: " + leaderboardsId);
				ok = "Leaderboards data restored for " + Text.escapeHTML(leaderboardsId);
			}
		} else if (context.post.edit) {
			let leaderboardsId = Text.toId(context.post.name);

			let newName = (context.post.newname + "").trim();
			let newId = Text.toId(newName);

			let winner = parseInt(context.post.winner);
			let finalist = parseInt(context.post.finalist);
			let semifinalist = parseInt(context.post.semifinalist);

			let room = Text.toRoomid(context.post.room);

			let customTitle = ((context.post.ctitle || "") + "").trim();
			let description = ((context.post.description || "") + "").trim();

			let aliases = ((context.post.aliases || "") + "").trim();
			let banned = ((context.post.banned || "") + "").trim();

			let automated = !!context.post.automated;
			let silent = !!context.post.silent;

			try {
				check(leaderboardsId, "You must specify a leaderboards ID");
				check(Config[leaderboardsId], "Leaderboards ID not found");
				check(newId, "You must specify a name");

				check(newId === leaderboardsId || !Config[newId], "Invalid new name");
				check(!isNaN(winner) && winner >= 0, "Invalid configuration");
				check(!isNaN(finalist) && finalist >= 0, "Invalid configuration");
				check(!isNaN(semifinalist) && semifinalist >= 0, "Invalid configuration");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				Config[leaderboardsId].name = newName;
				Config[leaderboardsId].room = room;
				Config[leaderboardsId].winner = winner;
				Config[leaderboardsId].finalist = finalist;
				Config[leaderboardsId].semifinalist = semifinalist;
				Config[leaderboardsId].customTitle = customTitle;
				Config[leaderboardsId].description = description;
				Config[leaderboardsId].aliases = aliases;
				Config[leaderboardsId].banned = banned;
				Config[leaderboardsId].automated = automated;
				Config[leaderboardsId].silent = silent;

				if (newId !== leaderboardsId) {
					Config[newId] = Config[leaderboardsId];
					delete Config[leaderboardsId];
					App.modules.tourldbcustom.system.data[newId] = App.modules.tourldbcustom.system.data[leaderboardsId];
					delete App.modules.tourldbcustom.system.data[leaderboardsId];
					App.modules.tourldbcustom.system.db.write();
					App.modules.tourldbcustom.system.generateTable(newId);
					App.logServerAction(context.user.id, "Leaderboards custom: Renamed: " + leaderboardsId + " to " + newId);
				}

				App.db.write();
				App.logServerAction(context.user.id, "Leaderboards custom: Edit configuration: " + newId);
				ok = "Leaderboards configuration saved";
			}
		}

		let htmlVars = Object.create(null);

		htmlVars.tables = '';
		for (let leaderboardsId in Config) {
			htmlVars.tables += tableTemplate.make({
				id: Text.escapeHTML(leaderboardsId),
				name: Text.escapeHTML(Config[leaderboardsId].name || leaderboardsId),
				room: Text.escapeHTML(Config[leaderboardsId].room || ""),
				winner: Text.escapeHTML(Config[leaderboardsId].winner),
				finalist: Text.escapeHTML(Config[leaderboardsId].finalist),
				semifinalist: Text.escapeHTML(Config[leaderboardsId].semifinalist),
				ctitle: Text.escapeHTML(Config[leaderboardsId].customTitle || ""),
				description: Text.escapeHTML(Config[leaderboardsId].description || ""),
				aliases: Text.escapeHTML(Config[leaderboardsId].aliases || ""),
				banned: Text.escapeHTML(Config[leaderboardsId].banned || ""),
				automated: (Config[leaderboardsId].automated ? 'checked="checked"' : ''),
				silent: (Config[leaderboardsId].silent ? 'checked="checked"' : ''),
			});
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), { title: "Tour Leaderboards (Custom) - Showdown ChatBot" });
	});
};
