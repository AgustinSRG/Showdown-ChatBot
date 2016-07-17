/**
 * Server Handler: Change Password
 */

'use strict';

const check = Tools.get('check.js');

/* Permissions */

App.server.setPermission('chpass', 'Permission for changing the password of the user account');

/* Handlers */

App.server.setHandler('chpass', (context, parts) => {
	/* Permission check */
	if (!context.user || !context.user.can('chpass')) {
		context.endWith403();
		return;
	}

	/* Actions */
	let error = null, ok = null;
	if (context.post.chpass) {
		let pass = context.post.password;
		let newPass = context.post.newpassword;
		let newPass2 = context.post.newpasswordconfirm;

		/* Check */
		try {
			check(App.server.users[context.user.id] && App.server.users[context.user.id].password === pass, "Wrong Password.");
			check(newPass, "You must specify a password");
			check(newPass === newPass2, "The passwords do not match.");
		} catch (err) {
			error = err.message();
		}

		/* Save Changes */
		if (!error) {
			App.server.users[context.user.id].password = newPass;
			App.server.userdb.write();
			ok = "Your password has been changed.";
			App.logServerAction(context.user.id, 'Change Password. IP: ' + context.ip);
		}
	}

	/* Generate HTML */
	let html = '';
	html += '<h2>Change password for your account</h2>';
	html += '<form id="chpass-form" name="chpass-form" method="post" action="">';
	html += '<table border="0">';
	html += '<tr><td style="padding:5px;">Current password: </td>';
	html += '<td><input type="password" name="password" /></td></tr>';
	html += '<tr><td style="padding:5px;">New password: </td>';
	html += '<td><input type="password" name="newpassword" /></td></tr>';
	html += '<tr><td style="padding:5px;">Confirm new password: </td>';
	html += '<td><input type="password" name="newpasswordconfirm" /></td></tr>';
	html += '</table><br />';
	html += ' <label style="padding:5px;">';
	html += ' <input type="submit" name="chpass" value="Change Password" />';
	html += ' </label>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Change Password - Showdown ChatBot"});
});
