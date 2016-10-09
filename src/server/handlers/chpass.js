/**
 * Server Handler: Change Password
 * Allows users to change their password
 */

'use strict';

const Path = require('path');
const check = Tools('check');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'templates', 'chpass.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('chpass', 'Permission for changing the password of your own account');

	/* Handlers */
	App.server.setHandler('chpass', (context, parts) => {
		if (!context.user || !context.user.can('chpass')) {
			context.endWith403();
			return;
		}

		let error = null, ok = null;
		if (context.post.chpass) {
			let pass = context.post.password;
			let newPass = context.post.newpassword;
			let newPass2 = context.post.newpasswordconfirm;

			try {
				check(App.server.users[context.user.id], "You are not a registered user.");
				check(App.server.checkPassword(App.server.users[context.user.id].password, pass), "Invalid Password");
				check(newPass, "You must specify a password");
				check(newPass === newPass2, "The passwords do not match.");
			} catch (err) {
				error = err.message();
			}

			if (!error) {
				App.server.users[context.user.id].password = App.server.encryptPassword(newPass);
				App.server.userdb.write();
				ok = "Your password has been changed.";
				App.logServerAction(context.user.id, 'Change Password. IP: ' + context.ip);
			}
		}

		let htmlVars = {};
		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Change Password - Showdown ChatBot"});
	});
};
