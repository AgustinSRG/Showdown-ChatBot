/**
 * Server Handler: Bot Login Configuration
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'templates', 'login.html'));

function setup(App) {
	/* Menu Options */
	App.server.setMenuOption('botlogin', 'Bot&nbsp;Login', '/botlogin/', 'core', 1);

	/* Handlers */
	App.server.setHandler('botlogin', (context, parts) => {
		if (!context.user || !context.user.can('core')) {
			context.endWith403();
			return;
		}

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

		let htmlVars = {};

		htmlVars.nick = Text.escapeHTML(App.config.modules.core.nick || '-');
		htmlVars.pass = (App.config.modules.core.pass ? 'Yes' : 'No');
		htmlVars.nick_fail = (context.post.nick || '');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Bot Login - Showdown ChatBot"});
	});
}

exports.setup = setup;
