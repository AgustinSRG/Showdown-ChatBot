/**
 * Server Handler: GitHub
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'template.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('github', 'Permission for changing github hook configuration');

	/* Menu Options */
	App.server.setMenuOption('github', 'GitHub&nbsp;Dev&nbsp;Bot', '/github/', 'github', -2);

	/* Handlers */
	App.server.setHandler('github', (context, parts) => {
		if (!context.user || !context.user.can('github')) {
			context.endWith403();
			return;
		}

		const config = App.config.modules.github;
		const mod = App.modules.github.system;

		let ok = null, error = null;
		if (context.post.edit) {
			let room = Text.toRoomid(context.post.room);
			let port = parseInt(context.post.port || 3420);
			let secret = context.post.secret || '';
			let enabled = !!context.post.enabled;
			let bl = Object.createFromKeys((context.post.blacklist || '').split(',').map(Text.trim).filter(u => u));

			if (isNaN(port)) {
				error = "Invalid port";
			} else {
				config.room = room;
				config.port = port;
				config.secret = secret;
				config.blacklist = bl;
				config.enabled = enabled;

				App.saveConfig();
				App.logServerAction(context.user.id, "Edit github-hook configuration");

				if (enabled) {
					mod.createWebHook();
				} else {
					mod.stopWebHook();
				}

				ok = "GitHub Hook configuration saved";
			}
		}

		let htmlVars = {};

		htmlVars.room = config.room;
		htmlVars.port = config.port;
		htmlVars.secret = config.secret;
		htmlVars.bl = Object.keys(config.blacklist).join(', ');
		htmlVars.enabled = (config.enabled ? ' checked="checked"' : '');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "GitHub Hook - Showdown ChatBot"});
	});
};
