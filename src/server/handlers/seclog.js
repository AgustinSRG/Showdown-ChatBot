/**
 * Server Handler: Security Log
 */

'use strict';

const Path = require('path');

const check = Tools.get('check.js');

/* Permissions */

App.server.setPermission('seclog', 'Permission for accesing the security log and changing the logger configuration');

/* Menu Options */

App.server.setMenuOption('seclog', 'Security Log', '/seclog/', 'seclog');

/* Handlers */

function serveLog(context, file) {
	/* Permission check */
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

	/* Permission check */
	if (!context.user || !context.user.can('seclog')) {
		context.endWith403();
		return;
	}

	/* Actions */
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

	/* Generate HTML */
	let html = '';
	html += '<h3>Logger Configuration</h3>';
	html += '<form method="post" action=""><table border="0">';
	html += '<tr><td>Security logs max old (in days): </td><td><label><input type="text" name="oldsec" value="' +
		(App.config.logMaxOld || '0') + '" /></label></td></tr>';
	html += '</table>';
	html += '<p>Specify <em>0 days</em> to keep the logs indefinitely</p>';
	html += '<p><label><input type="submit" name="editlogconfig" value="Save Changes" /></label></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	html += '<hr />';
	html += '<h3>Security Log - Files</h3>';
	html += '<blockquote><table border="1">';
	html += '<tr><td width="200px"><div align="center"><strong>File</strong></div></td>' +
		'<td width="200px"><div align="center"><strong>Size</strong></div></td>' +
		'<td width="200px"><div align="center"><strong>Date</strong></div></td>' +
		'<td width="150px"><div align="center"><strong>Options</strong></div></td></tr>';
	let logs = App.logger.getFilesList();
	for (let i = 0; i < logs.length; i++) {
		html += '<tr><td>' + logs[i].file + '</td><td>' + logs[i].size + ' KB</td><td>' + logs[i].date +
			'</td><td><a href="/seclog/' + logs[i].file +
			'" target="_blank"><div align="center"><button>View Log</button></div></a></td></tr>';
	}
	html += '</table></blockquote>';

	context.endWithWebPage(html, {title: "Security Log - Showdown ChatBot"});
});
