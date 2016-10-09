/**
 * Server Handler: Security Log
 */

'use strict';

const Path = require('path');
const check = Tools('check');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'templates', 'seclog.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('seclog', 'Permission for accesing the security log and changing the logger configuration');

	/* Menu Options */
	App.server.setMenuOption('seclog', 'Security&nbsp;Log', '/seclog/', 'seclog', 2);

	/* Handlers */
	function serveLog(context, file) {
		if (!context.user || !context.user.can('seclog')) {
			context.endWithError('403', 'Forbidden', 'You have not permission to access this path!');
			return;
		}
		context.endWithStaticFile(Path.resolve(App.logger.path, file));
	}

	App.server.setHandler('seclog', (context, parts) => {
		if (parts[0]) {
			return serveLog(context, parts[0].split('?')[0]); /* Serve log file */
		}

		if (!context.user || !context.user.can('seclog')) {
			context.endWith403();
			return;
		}

		let ok = null, error = null;
		if (context.post.editlogconfig) {
			let duration = parseInt(context.post.oldsec);
			try {
				check(!isNaN(duration) && duration >= 0, "Security logs max old specified must be a number greater than or equal 0.");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				App.config.logMaxOld = duration;
				App.db.write();
				App.logServerAction(context.user.id, "Set Logger configuration.");
				ok = "Changes made sucessfully. Restart the application to make them effective.";
			}
		}

		let htmlVars = {};
		htmlVars.oldsec = (App.config.logMaxOld || '0');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		htmlVars.log_files = '';
		let logs = App.logger.getFilesList();
		for (let i = 0; i < logs.length; i++) {
			htmlVars.log_files += '<tr><td>' + logs[i].file + '</td><td>' + logs[i].size + ' KB</td><td>' + logs[i].date +
			'</td><td><a href="/seclog/' + logs[i].file +
			'" target="_blank"><div align="center"><button>View Log</button></div></a></td></tr>';
		}

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Security Log - Showdown ChatBot"});
	});
};
