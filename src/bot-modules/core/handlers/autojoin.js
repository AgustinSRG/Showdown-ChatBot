/**
 * Server Handler: Bot Autojoin Configuration
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'templates', 'autojoin.html'));

function setup(App) {
	/* Menu Options */
	App.server.setMenuOption('autojoin', 'Rooms&nbsp;&amp;&nbsp;Avatar', '/autojoin/', 'core', 1);

	/* Handlers */
	App.server.setHandler('autojoin', (context, parts) => {
		if (!context.user || !context.user.can('core')) {
			context.endWith403();
			return;
		}

		let ok = null, error = null;
		if (context.post.edit) {
			let rooms = (context.post.rooms || "").split(',').map(Text.toRoomid).filter(room => room);
			let privaterooms = (context.post.privaterooms || "").split(',').map(Text.toRoomid).filter(room => room);
			App.config.modules.core.rooms = rooms;
			App.config.modules.core.privaterooms = privaterooms;
			App.config.modules.core.avatar = context.post.avatar || '';
			App.config.modules.core.joinofficial = !!context.post.joinofficial;
			App.config.modules.core.joinall = !!context.post.joinall;
			App.db.write();
			App.logServerAction(context.user.id, 'Edit Bot Autojoin details (Core Module)');
			ok = "Bot Auto-Join details have been set sucessfully. Restart the bot to make them effective.";
		}

		let htmlVars = {};

		htmlVars.rooms = (App.config.modules.core.rooms || []).join(', ');
		htmlVars.privaterooms = (App.config.modules.core.privaterooms || []).join(', ');
		htmlVars.avatar = (App.config.modules.core.avatar || '');

		htmlVars.joinofficial = App.config.modules.core.joinofficial ? 'checked="checked"' : '';
		htmlVars.joinall = App.config.modules.core.joinall ? 'checked="checked"' : '';

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Rooms and avatar - Showdown ChatBot"});
	});
}

exports.setup = setup;
