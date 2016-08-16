/**
 * Server Handler: GitHub
 */

'use strict';

const Text = Tools.get('text.js');

/* Permissions */

App.server.setPermission('github', 'Permission for changing github hook configuration');

/* Menu Options */

App.server.setMenuOption('github', 'GitHub&nbsp;Hook', '/github/', 'github');

/* Handlers */

App.server.setHandler('github', (context, parts) => {
	/* Permission check */
	if (!context.user || !context.user.can('github')) {
		context.endWith403();
		return;
	}

	const config = App.config.modules.github;
	const mod = App.modules.github.system;

	/* Actions */
	let ok = null, error = null;

	if (context.post.edit) {
		let room = Text.toRoomid(context.post.room);
		let port = parseInt(context.post.port || 3420);
		let secret = context.post.secret || '';
		let enabled = !!context.post.enabled;
		let aux = (context.post.blacklist || '').split(',');
		let bl = {};
		for (let i = 0; i < aux.length; i++) {
			let user = aux[i].toLowerCase().trim();
			if (user) {
				bl[user] = true;
			}
		}

		if (isNaN(port)) {
			error = "Invalid port";
		} else {
			config.room = room;
			config.port = port;
			config.secret = secret;
			config.blacklist = bl;
			config.enabled = enabled;

			App.db.write();
			App.logServerAction(context.user.id, "Edit github-hook configuration");

			if (enabled) {
				mod.createWebHook();
			} else {
				mod.stopWebHook();
			}

			ok = "GitHub Hook configuration saved";
		}
	}

	/* Generate Html */
	let html = '';

	html += '<h3>GitHub Hook</h3>';
	html += '<form  method="post" action="">';
	html += '<p><strong>Dev Room</strong>:&nbsp;<input name="room" type="text" size="40" value="' + config.room + '" /></p>';
	html += '<p><strong>Web-Hook Port</strong>:&nbsp;<input name="port" type="text" size="20" value="' + config.port + '" /></p>';
	html += '<p><strong>Secret</strong>:&nbsp;<input name="secret" type="text" size="40" autocomplete="off" value="' + config.secret + '" /></p>';
	html += '<p><strong>Pull Request Blacklist</strong>:&nbsp;<input name="blacklist" type="text" size="70" autocomplete="off" value="' +
		Object.keys(config.blacklist).join(', ') + '" /> (Separated by commas)</p>';
	html += '<p><input type="checkbox" name="enabled" value="true"' + (config.enabled ? ' checked="checked"' : '') +
		' />&nbsp;Enable GitHub hook</p>';
	html += '<p><input type="submit" name="edit" value="Save Changes" /></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "GitHub Hook - Showdown ChatBot"});
});
