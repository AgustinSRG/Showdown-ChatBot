/**
 * Server Handler: Bot Login Configuration
 */

'use strict';

const Text = Tools.get('text.js');
const check = Tools.get('check.js');

/* Menu Options */

App.server.setMenuOption('botlogin', 'Bot&nbsp;Login', '/botlogin/', 'core');

/* Handlers */

App.server.setHandler('botlogin', (context, parts) => {
	/* Permission Check */
	if (!context.user || !context.user.can('core')) {
		context.endWith403();
		return;
	}

	/* Actions */
	let ok = null, error = null;
	if (context.post.setlogin) {
		let nick = context.post.nick || '';
		let pass = context.post.pass || '';
		let pass2 = context.post.passconfirm || '';
		try {
			check(nick.length < 20, "Nick must not be longer than 19 characters");
			check(!nick || (/[a-zA-Z]/).test(nick), "The nick must contain at least one letter");
			check(pass === pass2, "The passwords do not match");
		} catch (err) {
			error = err.message;
		}
		if (!error) {
			App.config.modules.core.nick = nick;
			App.config.modules.core.pass = pass;
			App.db.write();
			App.logServerAction(context.user.id, 'Edit Bot Login details (Core Module)');
			ok = "Bot login details have been set sucessfully. Restart the bot to make them effective.";
		}
	}

	/* Generate HTML */
	let html = '';
	html += '<h3>Bot Login Credentials</h3>';
	html += '<table border="0">';
	html += '<tr><td><strong>Nick</strong>:</td><td>' + Text.escapeHTML(App.config.modules.core.nick || '-') + '</td></tr>';
	html += '<tr><td><strong>Password</strong>: </td><td>' + (App.config.modules.core.pass ? 'Yes' : 'No') + '</td></tr>';
	html += '</table>';
	html += '<br />';
	html += '<form method="post" action="">';
	html += '<table border="0">';
	html += '<tr><td>Bot Nickname: </td><td><label><input name="nick" type="text" size="30" maxlength="20" value="' +
		(context.post.nick || '') + '" /></label></td></tr>';
	html += '<tr><td>Password:</td><td><input name="pass" type="password" size="30" /></td></tr>';
	html += '<tr><td>Password (confirm):</td><td><input name="passconfirm" type="password" size="30" /></td></tr>';
	html += '</table>';
	html += '<p><label><input type="submit" name="setlogin" value="Set Credentials" /></label></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Bot Login - Showdown ChatBot"});
});
