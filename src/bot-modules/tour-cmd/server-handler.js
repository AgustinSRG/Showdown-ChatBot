/**
 * Server Handler: Tour Command
 */

'use strict';

const Text = Tools.get('text.js');
const check = Tools.get('check.js');

const Config = App.config.modules.tourcmd;

/* Permissions */

App.server.setPermission('tourcmd', 'Permission for changin the tour command configuration');

/* Menu Options */

App.server.setMenuOption('tourcmd', 'Tour Cmd', '/tourcmd/', 'tourcmd');

/* Handlers */

App.server.setHandler('tourcmd', (context, parts) => {
	/* Permission check */
	if (!context.user || !context.user.can('tourcmd')) {
		context.endWith403();
		return;
	}

	/* Actions */
	let ok = null, error = null;
	if (context.post.edit) {
		let format = Text.toId(context.post.format);
		let type = Text.toId(context.post.type);
		let users = parseInt(context.post.users);
		let time = parseInt(context.post.time);
		let autodq = parseFloat(context.post.autodq);
		let scout = Text.toId(context.post.scout);
		let msg = (context.post.creationmsg || "").trim();
		let aliases = (context.post.aliases || "").split('\n');

		try {
			check(format, "Invalid format.");
			check(type in {'elimination': 1, 'roundrobin': 1}, "Invalid tournament type.");
			check(!isNaN(users) && users >= 0, "Invalid users limit.");
			check(!isNaN(time) && time >= 0, "Invalid signups time.");
			check(!isNaN(autodq) && autodq >= 0, "Invalid autodq time.");
			check(scout in {'yes': 1, 'no': 1}, "Invalid scout mode.");
			check(msg.length <= 300, "Messages cannot be longer than 300 characters.");
		} catch (err) {
			error = err.message;
		}

		if (!error) {
			Config.format = format;
			Config.type = type;
			Config.maxUsers = users;
			Config.time = time * 1000;
			Config.autodq = autodq;
			Config.scoutProtect = (scout === 'no');
			Config.createMessage = msg;
			let aux = {};
			for (let i = 0; i < aliases.length; i++) {
				let spl = aliases[i].split(',');
				let id = Text.toId(spl[0]);
				let id2 = Text.toId(spl[1]);
				if (id && id2) {
					aux[id] = id2;
				}
			}
			Config.aliases = aux;
			App.db.write();
			App.logServerAction(context.user.id, "Changed tour cmd configuration");
			ok = "Tournament command configuration saved.";
		}
	}

	/* Generate Html */
	let html = '';
	html += '<h2>Tournament Command</h2>';
	html += '<form method="post" action="">';
	html += '<table border="0">';
	html += '<tr><td><strong>Default Format</strong>: </td><td><input name="format" type="text" size="30" value="' +
		Config.format + '" /></td></tr>';
	html += '<tr><td><strong>Default Type</strong>: </td><td><select name="type">';
	html += '<option value="elimination"' + (Config.type === 'elimination' ? ' selected="selected"' : '') + '>Elimination</option>';
	html += '<option value="roundrobin"' + (Config.type === 'roundrobin' ? ' selected="selected"' : '') + '>Round Robin</option>';
	html += '</select></td></tr>';
	html += '<tr><td><strong>Users Limit (0 for no limit)</strong>: </td><td><input name="users" type="text" size="20" value="' +
		Config.maxUsers + '" /></td></tr>';
	html += '<tr><td><strong>Sign-ups Time (seconds)</strong>: </td><td><input name="time" type="text" size="20" value="' +
		Math.floor(Config.time / 1000) + '" /></td></tr>';
	html += '<tr><td><strong>Autodq (minutes)</strong>: </td><td><input name="autodq" type="text" size="20" value="' +
		Config.autodq + '" /></td></tr>';
	html += '<tr><td><strong>Scout</strong>: </td><td><select name="scout">';
	html += '<option value="yes" ' + (!Config.scoutProtect ? 'selected="selected"' : '') + '>Allow</option>';
	html += '<option value="no" ' + (Config.scoutProtect ? 'selected="selected"' : '') + '>Disallow</option>';
	html += '</select></td></tr>';
	html += '<tr><td><strong>Creation Message</strong>: </td><td><input name="creationmsg" type="text" size="60" maxlength="300" value="' +
		Config.createMessage + '" /></td></tr>';
	let aliases = [];
	for (let format in Config.aliases) {
		aliases.push(format + ', ' + Config.aliases[format]);
	}
	html += '<tr><td colspan="2"><strong>Aliases </strong>(<em>alias, format</em>)' +
		'<p><textarea name="aliases" cols="80" rows="4">' + aliases.join('\n') + '</textarea></p></td></tr>';
	html += '</table>';
	html += '<p><input type="submit" name="edit" value="Save Changes" /></p>';
	html += '</form>';
	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Tour Command - Showdown ChatBot"});
});
