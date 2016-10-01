/**
 * Server Handler: Modules
 * Allows administrators enable or disable bot modules
 */

'use strict';

const Path = require('path');
const Template = Tools.get('html-template.js');

const mainTemplate = new Template(Path.resolve(__dirname, 'templates', 'modules.html'));

exports.setup = function (App) {
	/* Menu Options */
	App.server.setMenuOption('modules', 'Modules', '/modules/', 'root', 2);

	/* Handlers */
	App.server.setHandler('modules', (context, parts) => {
		if (!context.user || !context.user.can('root')) {
			context.endWith403();
			return;
		}

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

		let htmlVars = {};

		htmlVars.modules = '<table border="0">';
		for (let id in App.modules) {
			htmlVars.modules += '<tr>';
			htmlVars.modules += '<td><strong>' + App.modules[id].name + '</strong>&nbsp;</td>';
			htmlVars.modules += '<td><select name="' + id + '">';
			htmlVars.modules += '<option value="e"' + (App.config.loadmodules[id] !== false ? ' selected="selected"' : '') + '>Enabled</option>';
			htmlVars.modules += '<option value="d"' + (App.config.loadmodules[id] === false ? ' selected="selected"' : '') + '>Disabled</option>';
			htmlVars.modules += '</select></td>';
			htmlVars.modules += '</tr>';
		}
		htmlVars.modules += '</table>';

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Modules - Showdown ChatBot"});
	});
};
