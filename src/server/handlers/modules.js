/**
 * Server Handler: Modules
 * Allows administrators enable or disable bot modules
 */

'use strict';

const Path = require('path');
const SubMenu = Tools('submenu');
const Template = Tools('html-template');
const Text = Tools('text');

const mainTemplate = new Template(Path.resolve(__dirname, 'templates', 'modules.html'));
const menuTemplate = new Template(Path.resolve(__dirname, 'templates', 'modules-menu.html'));

exports.setup = function (App) {
	/* Menu Options */
	App.server.setMenuOption('modules', 'Modules', '/modules/', 'root', 2);

	/* Handlers */
	App.server.setHandler('modules', (context, parts) => {
		if (!context.user || !context.user.can('root')) {
			context.endWith403();
			return;
		}

		let submenu = new SubMenu("Modules", parts, context, [
			{ id: 'config', title: 'Configuration', url: '/modules/', handler: configurationHandler },
			{ id: 'menu', title: 'Menu&nbsp;Ordering', url: '/modules/menu/', handler: menuHandler },
		], 'config');

		return submenu.run();
	});

	function configurationHandler(context, html) {
		let error = null, ok = null;
		if (context.post.savechanges) {
			for (let id in App.modules) {
				if (context.post[id] === 'd') {
					App.config.loadmodules[id] = false;
				} else {
					App.config.loadmodules[id] = true;
				}
			}

			App.saveConfig(function () {
				App.logServerAction(context.user.id, 'Modules configuration was edited');

				try {
					App.userdata.write(); /* Sync user-data */
				} catch (err) {
					App.reportCrash(err);
				}

				// Exit process

				let buf = '';
				buf += '<html><head><title>Process Exited</title><link rel="stylesheet" href="/static/style.css" /></head><body><p>The application exits successfully.</p>' +
					'<a href=""><button>Refresh Page</button></a></body></html>';
				context.response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
				context.response.end(buf);
				console.log("Exit via server, By: " + context.user.id);
				process.exit(0);
			});
			return;
		}

		let htmlVars = Object.create(null);

		htmlVars.modules = '<table border="0">';
		for (let id in App.modules) {
			htmlVars.modules += '<tr>';
			htmlVars.modules += '<td><strong>' + Text.escapeHTML(App.modules[id].name) + '</strong>&nbsp;</td>';
			htmlVars.modules += '<td><select name="' + Text.escapeHTML(id) + '">';
			htmlVars.modules += '<option value="e"' + (App.config.loadmodules[id] !== false ? ' selected="selected"' : '') + '>Enabled</option>';
			htmlVars.modules += '<option value="d"' + (App.config.loadmodules[id] === false ? ' selected="selected"' : '') + '>Disabled</option>';
			htmlVars.modules += '</select></td>';
			htmlVars.modules += '</tr>';
		}
		htmlVars.modules += '</table>';

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += mainTemplate.make(htmlVars);
		context.endWithWebPage(html, { title: "Modules - Showdown ChatBot" });
	}

	function menuHandler(context, html) {
		let error = null, ok = null;
		if (context.post.savechanges) {
			let menuOrder = Object.create(null);
			for (let opt in App.server.menu) {
				let level = parseInt(context.post[opt]);
				if (isNaN(level)) continue;
				menuOrder[opt] = level;
			}
			App.config.menuOrder = menuOrder;
			App.saveConfig();
			ok = "Control panel menu configuration saved successfully.";
			App.logServerAction(context.user.id, 'Control panel menu configuration was edited');
		}
		let htmlVars = Object.create(null);

		htmlVars.opts = '<table border="0">';
		for (let opt in App.server.menu) {
			let level = App.server.menu[opt].level || 0;
			if (App.config.menuOrder[opt] !== undefined) {
				level = App.config.menuOrder[opt];
			}
			htmlVars.opts += '<tr>';
			htmlVars.opts += '<td><strong>' + App.server.menu[opt].name + '</strong></td>';
			htmlVars.opts += '<td><input name="' + Text.escapeHTML(opt) + '" type="text" value="' +
				Text.escapeHTML(level) + '" size="15" placeholder="default" autocomplete="off" /></td>';
			htmlVars.opts += '<tr>';
			htmlVars.opts += '</tr>';
		}
		htmlVars.opts += '</table>';

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += menuTemplate.make(htmlVars);
		context.endWithWebPage(html, { title: "Menu Ordering - Showdown ChatBot" });
	}
};
