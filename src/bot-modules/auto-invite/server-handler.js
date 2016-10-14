/**
 * Server Handler: Auto-Invite
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'template.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('autoinvite', 'Permission for changing the auto-invite configuration');

	/* Menu Options */
	App.server.setMenuOption('autoinvite', 'Auto-Invite', '/autoinvite/', 'autoinvite', -2);

	/* Handlers */
	App.server.setHandler('autoinvite', (context, parts) => {
		if (!context.user || !context.user.can('autoinvite')) {
			context.endWith403();
			return;
		}

		let ok = null, error = null;
		if (context.post.edit) {
			let room = Text.toRoomid(context.post.room);
			let publicRoom = Text.toRoomid(context.post.public);
			let rank = context.post.rank || "voice";
			if (rank.length > 1 && App.config.parser[rank]) {
				rank = App.config.parser[rank];
			}
			if (App.config.parser.groups.indexOf(rank) >= 0) {
				App.config.modules.autoinvite.room = room;
				App.config.modules.autoinvite.public = publicRoom;
				App.config.modules.autoinvite.rank = rank;
				App.saveConfig();
				App.modules.autoinvite.system.roomAuth = {};
				App.modules.autoinvite.system.roomAuthChanged = true;
				App.logServerAction(context.user.id, "Edit autoinvite configuration");
				ok = "Auto-Invite configuration saved";
			} else {
				error = "Invalid Rank";
			}
		}

		let htmlVars = {};
		htmlVars.room = (App.config.modules.autoinvite.room || "");
		htmlVars.publicroom = (App.config.modules.autoinvite.public || "");
		htmlVars.rank = getRankSelect('rank', App.config.modules.autoinvite.rank);

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "AutoInvite - Showdown ChatBot"});
	});

	/* Auxiliar Functions */
	function getRankSelect(name, rank) {
		if (!rank) rank = '';
		if (rank.length > 1 && App.config.parser[rank]) {
			rank = App.config.parser[rank];
		}
		let html = '';
		html += '<select name="' + name + '">';
		for (let j = 0; j < App.config.parser.groups.length; j++) {
			html += '<option value="' + App.config.parser.groups[j] + '"' +
			(rank === App.config.parser.groups[j] ? ' selected="selected"' : '') + '>Group ' + App.config.parser.groups[j] + '</option>';
		}
		html += '</select>';
		return html;
	}
};
