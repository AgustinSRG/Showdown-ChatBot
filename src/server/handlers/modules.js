/**
 * Server Handler: Modules
 */

'use strict';

/* Menu Options */

App.server.setMenuOption('modules', 'Modules', '/modules/', 'root');

/* Handlers */

App.server.setHandler('modules', (context, parts) => {
	/* Permission check */
	if (!context.user || !context.user.can('root')) {
		context.endWith403();
		return;
	}

	/* Actions */
	let error = null, ok = null;
	if (context.post.savechanges) {
		for (let id in App.modules) {
			if (context.post[id] === 'd') {
				App.config.loadmodules[id] = false;
			} else {
				App.config.loadmodules[id] = true;
			}
		}
		App.saveConfig();
		ok = "Modules configuration saved sucessfully.";
		App.logServerAction(context.user.id, 'Modules configuration was editted');
	}

	/* Generate HTML */
	let html = '';

	html += '<h2>Bot Modules</h2>';
	html += '<p>Note: Changes here requires a restart to be effective.</p>';
	html += '<form method="post" action="">';
	html += '<table border="0">';
	for (let id in App.modules) {
		html += '<tr>';
		html += '<td><strong>' + App.modules[id].name + '</strong>&nbsp;</td>';
		html += '<td><select name="' + id + '">';
		html += '<option value="e"' + (App.config.loadmodules[id] !== false ? ' selected="selected"' : '') + '>Enabled</option>';
		html += '<option value="d"' + (App.config.loadmodules[id] === false ? ' selected="selected"' : '') + '>Disabled</option>';
		html += '</select></td>';
		html += '</tr>';
	}
	html += '</table>';
	html += '<p><input type="submit" name="savechanges" value="Save Changes" /></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Modules - Showdown ChatBot"});
});
