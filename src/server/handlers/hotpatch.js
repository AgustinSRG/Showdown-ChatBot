/**
 * Server Handler: Hotpatch
 */

'use strict';

const Path = require('path');

/* Menu Options */

App.server.setMenuOption('hotpatch', 'Hotpatch', '/hotpatch/', 'root');

/* Handlers */

App.server.setHandler('hotpatch', (context, parts) => {
	/* Permission check */
	if (!context.user || !context.user.can('root')) {
		context.endWith403();
		return;
	}

	/* Actions */
	let ok = null, error = null;
	let html = '';
	if (context.post.hotpatch) {
		try {
			App.hotpatchCommands(Path.resolve(__dirname, '../../bot-modules/'));
			App.logServerAction(context.user.id, 'Hotpatch Commands.');
			ok = "Commands hotpatched";
		} catch (err) {
			error = "Error: " + err.code + " - " + err.message;
		}
	} else if (context.post.reloaddata) {
		App.data.downloadAll();
		App.logServerAction(context.user.id, 'Reload Data.');
		ok = "Downloading data. It will be realoaded in a few seconds.";
	}

	/* Generate HTML */
	html += '<h2>Hotpatch Commands</h2>';
	html += '<p>This is a develoment tool used to reaload the commands without restart the application. ' +
		'Note: If you are not a developer, just restart the application intead of using this tool.</p>';
	html += '<form method="post" action="">';
	html += '<p><label><input type="submit" name="hotpatch" value="Hotpatch Commands" /></label></p>';
	html += '</form>';

	html += '<hr />';

	html += '<h2>Reload Data</h2>';
	html += '<p>Data is reloaded every time the bot connects to the server, but you can manually reaload it with this option.</p>';
	html += '<form method="post" action="">';
	html += '<p><label><input type="submit" name="reloaddata" value="Reload Data" /></label></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Hotpatch - Showdown ChatBot"});
});
