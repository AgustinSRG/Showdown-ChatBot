/**
 * Server Handler: Battle log
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'template.html'));

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

	/* Handlers */
	App.server.setHandler('battlelog', (context, parts) => {
		if (parts[0]) {
			return serveLog(context, parts[0].split('?')[0]); /* Serve log file */
		}

		if (!context.user || !context.user.can('battlelog')) {
			context.endWith403();
			return;
		}

		let ok = null, error = null;
		if (context.post.editlogconfig) {
			let maxbattles = parseInt(context.post.maxbattles);
			try {
				check(!isNaN(maxbattles) && maxbattles >= 0, "Max number of battles must be a number greater than or equal 0.");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				App.config.modules.battlelog.maxbattles = maxbattles;
				App.db.write();
				App.logServerAction(context.user.id, "Set Battle Logger configuration.");
				ok = "Changes made sucessfully.";
			}
		}

		let htmlVars = {};
		htmlVars.maxbattles = (App.config.modules.battlelog.maxbattles || '0');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		htmlVars.log_files = '';
		let logs = App.modules.battlelog.system.getFiles();
		for (let i = 0; i < logs.length; i++) {
			htmlVars.log_files += '<tr><td>' + logs[i].file + '</td><td>' + logs[i].size + ' KB</td><td>' + logs[i].date +
			'</td><td>' + Text.escapeHTML(logs[i].title) + '</td><td style="text-align: center; white-space: nowrap;"><a href="/battlelog/' + logs[i].file +
			'" target="_blank"><button>View Log</button></a>&nbsp;|&nbsp;<a href="' + logs[i].psim +
			'" target="_blank"><button>Recreate battle</button></a></td></tr>';
		}

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Battle Log - Showdown ChatBot"});
	});
};
