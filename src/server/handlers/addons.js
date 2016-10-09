/**
 * Server Handler: Add-Ons
 * This handler allows administrators to install,
 * edit and uninstall add-ons for Showdown-ChatBot
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');
const Text = Tools('text');
const check = Tools('check');
const Template = Tools('html-template');

const listTemplate = new Template(Path.resolve(__dirname, 'templates', 'addons-list.html'));
const addonItemTemplate = new Template(Path.resolve(__dirname, 'templates', 'addons-item.html'));
const addingTemplate = new Template(Path.resolve(__dirname, 'templates', 'addons-new.html'));
const editTemplate = new Template(Path.resolve(__dirname, 'templates', 'addons-edit.html'));

exports.setup = function (App) {
	if (App.env.staticmode) return;

	/* Menu Options */
	App.server.setMenuOption('addons', 'Add-ons', '/addons/', 'root', 2);

	/* Handlers */
	App.server.setHandler('addons', (context, parts) => {
		if (!context.user || !context.user.can('root')) {
			context.endWith403();
			return;
		}

		if (parts[0] === 'new') {
			newAddonHandler(context, parts);
			return;
		} else if (parts[0] === 'edit') {
			editAddonHandler(context, parts);
			return;
		}

		let ok = null, error = null;
		if (context.post.remove) {
			let addon = context.post.addon;
			if (addon && App.addons[addon]) {
				App.removeAddon(addon);
				try {
					FileSystem.unlinkSync(Path.resolve(App.addonsDir, addon));
				} catch (err) {
					App.reportCrash(err);
				}
				App.logServerAction(context.user.id, 'Add-on uninstalled: ' + addon + '.js');
				ok = "Addon " + addon + " deleted sucessfully";
			} else {
				error = "Invalid add-on";
			}
		}

		let htmlVars = {};
		htmlVars.addons_list = '';

		for (let file in App.addons) {
			htmlVars.addons_list += addonItemTemplate.make({
				file: file,
				desc: (App.addons[file].desc ? ('<p>' + Text.escapeHtml(App.addons[file].desc) + '</p>') : ""),
			});
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(listTemplate.make(htmlVars), {title: "Add-ons - Showdown ChatBot"});
	});

	function newAddonHandler(context, parts) {
		let ok = null, error = null;

		if (context.post.add) {
			let addon = Text.toId(context.post.addon);
			let content = (context.post.content || "").trim();
			try {
				check(addon, "You must specify an addon filename");
				check(content, "Addon content cannot be blank");
				check(!App.addons[addon + '.js'], "Addon " + addon + ".js already exists");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				FileSystem.writeFileSync(Path.resolve(App.addonsDir, addon + '.js'), content);
				if (!App.installAddon(addon + '.js')) {
					error = "Failed to install the add-on";
				} else {
					App.logServerAction(context.user.id, 'Add-on installed: ' + addon + '.js');
					context.response.writeHead(302, {'Location': '/addons/'});
					context.response.end();
					return;
				}
			}
		}

		let htmlVars = {};
		htmlVars.content = (context.post.content || '');
		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(addingTemplate.make(htmlVars), {title: "New Add-on - Showdown ChatBot"});
	}

	function editAddonHandler(context, parts) {
		let file = parts[1];
		if (!file) {
			return context.endWith404();
		}
		let path = Path.resolve(App.addonsDir, file);
		if (!FileSystem.existsSync(path) || !FileSystem.statSync(path).isFile()) {
			return context.endWith404();
		}

		let ok = null, error = null;

		if (context.post.edit) {
			let addon = file;
			let content = (context.post.content || "").trim();
			try {
				check(addon, "You must specify an addon filename");
				check(content, "Addon content cannot be blank");
				check(App.addons[addon], "Addon " + addon + " not found");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				App.removeAddon(addon);
				FileSystem.writeFileSync(Path.resolve(App.addonsDir, addon), content);
				if (!App.installAddon(addon)) {
					error = "Failed to re-install the add-on";
				} else {
					App.logServerAction(context.user.id, 'Add-on re-installed: ' + addon);
					ok = "Add-on re-installed sucessfully";
				}
			}
		}

		let content = FileSystem.readFileSync(path).toString();

		let htmlVars = {};
		htmlVars.content = content;
		htmlVars.file = file;
		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(editTemplate.make(htmlVars), {title: "Add-ons - Showdown ChatBot"});
	}
};
