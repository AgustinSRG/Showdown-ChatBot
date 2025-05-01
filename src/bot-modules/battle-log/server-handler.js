/**
 * Server Handler: Battle log
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'template.html'));
const replayTemplate = new Template(Path.resolve(__dirname, 'template-replay.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('battlelog', 'Permission for accesing battle logs');

	/* Menu Options */
	App.server.setMenuOption('battlelog', 'Battle&nbsp;Logs', '/battlelog/', 'battlelog', -1);

	/* Handlers */
	function serveLog(context, file) {
		if (!context.user || !context.user.can('battlelog')) {
			context.endWithError('403', 'Forbidden', 'You have not permission to access this path!');
			return;
		}
		context.endWithStaticFile(Path.resolve(App.modules.battlelog.system.path, file));
	}

	function serveReplay(context, file) {
		if (!context.user || !context.user.can('battlelog')) {
			context.endWith403();
			return;
		}

		if (!file) {
			context.endWithError('404', 'Not found', 'Not found');
			return;
		}

		context.endWithWebPage(replayTemplate.make({
			battle_id: Text.toRoomid(file),
		}), { title: "Battle Replay - Showdown ChatBot" });
	}

	/* Handlers */
	App.server.setHandler('battlelog', (context, parts) => {
		if (parts[0]) {
			const logFile = parts[0].split('?')[0] + "";

			if (logFile.endsWith(".log")) {
				return serveLog(context, logFile); /* Serve log file */
			} else {
				return serveReplay(context, logFile); /* Serve log file */
			}
		}

		if (!context.user || !context.user.can('battlelog')) {
			context.endWith403();
			return;
		}

		const Config = App.config.modules.battlelog;

		let ok = null, error = null;
		if (context.post.editlogconfig) {
			let maxbattles = parseInt(context.post.maxbattles);
			let joinLobbyBattles = !!context.post.joinlobbybattles;
			let joinTournamentBattlesRooms = (context.post.jointourbattles || "").split(",").map(Text.toRoomid).filter(r => !!r);
			let joinAllTournamentBattles = !!context.post.jointourbattlesall;
			try {
				check(!isNaN(maxbattles) && maxbattles >= 0, "Max number of battles must be a number greater than or equal 0.");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				Config.maxbattles = maxbattles;
				Config.joinLobbyBattles = joinLobbyBattles;
				Config.joinTournamentBattlesRooms = joinTournamentBattlesRooms;
				Config.joinAllTournamentBattles = joinAllTournamentBattles;
				App.db.write();
				App.logServerAction(context.user.id, "Set Battle Logger configuration.");
				ok = "Changes made successfully.";
			}
		}

		let htmlVars = Object.create(null);
		htmlVars.maxbattles = Text.escapeHTML(Config.maxbattles || '0');
		htmlVars.join_lobby_battles = (Config.joinLobbyBattles ? "checked=\"checked\"" : "");
		htmlVars.join_tour_battles = Text.escapeHTML((Config.joinTournamentBattlesRooms || []).join(","));
		htmlVars.join_tour_battles_all = (Config.joinAllTournamentBattles ? "checked=\"checked\"" : "");

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		htmlVars.log_files = '';
		let logs = App.modules.battlelog.system.getFiles();
		for (let i = 0; i < logs.length; i++) {
			htmlVars.log_files += '<tr>';
			htmlVars.log_files += '<td>' + Text.escapeHTML(logs[i].file) + '</td>';
			htmlVars.log_files += '<td style="text-align: center; white-space: nowrap;"><a href="/battlelog/' + Text.escapeHTML(logs[i].file) +
				'" target="_blank" rel="noopener noreferrer"><button>Log</button></a>&nbsp;|&nbsp;<a href="/battlelog/' + Text.escapeHTML((logs[i].file + "").split(".")[0]) +
				'" target="_blank" rel="noopener noreferrer"><button>Replay</button></a>&nbsp;|&nbsp;<a href="' + Text.escapeHTML(logs[i].psim) +
				'" target="_blank" rel="noopener noreferrer"><button>Recreate</button></a></td>';
			htmlVars.log_files += '<td>' + Text.escapeHTML(logs[i].title) + '</td>';
			htmlVars.log_files += '<td>' + Text.escapeHTML(logs[i].date) + '</td>';
			htmlVars.log_files += '<td>' + Text.escapeHTML(logs[i].size) + ' KB</td>';
			htmlVars.log_files += '<td>' + Text.escapeHTML(logs[i].state || "-") + '</td>';

			htmlVars.log_files += '</tr>';
		}

		context.endWithWebPage(mainTemplate.make(htmlVars), { title: "Battle Log - Showdown ChatBot" });
	});
};
