/**
 * Server Handler: Add-Ons
 * This handler allows administrators to install,
 * edit and uninstall add-ons for Showdown-ChatBot
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const Template = Tools('html-template');

const listTemplate = new Template(Path.resolve(__dirname, 'templates', 'addons-list.html'));
const addonItemTemplate = new Template(Path.resolve(__dirname, 'templates', 'addons-item.html'));
const addingTemplate = new Template(Path.resolve(__dirname, 'templates', 'addons-new.html'));
const editTemplate = new Template(Path.resolve(__dirname, 'templates', 'addons-edit.html'));

// CodeMirror assets: structure CSS + local theme bridge
const CM_STYLES = [
	'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css',
	'/static/codemirror-theme.css',
];
const CM_SCRIPTS = [
	'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js',
	'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/matchbrackets.min.js',
	'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/closebrackets.min.js',
	'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js',
	'/static/addons-codemirror.js',
];

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
					App.dam.removeFile(addon);
				} catch (err) {
					App.reportCrash(err);
				}
				App.logServerAction(context.user.id, 'Add-on uninstalled: ' + addon);
				ok = "Addon " + Text.escapeHTML(addon) + " deleted successfully";
			} else {
				error = "Invalid add-on";
			}
		}

		let htmlVars = Object.create(null);
		htmlVars.addons_list = '';

		for (let file in App.addons) {
			htmlVars.addons_list += addonItemTemplate.make({
				file: Text.escapeHTML(file),
				desc: (App.addons[file].desc ? ('<p>' + Text.escapeHtml(App.addons[file].desc) + '</p>') : ""),
			});
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(listTemplate.make(htmlVars), { title: "Add-ons - Showdown ChatBot" });
	});

	function newAddonHandler(context, parts) {
		let ok = null, error = null;

		if (context.post.add) {
			let addon = Text.toAddOnId(context.post.addon);
			let file = App.addonsDir + '/' + addon + ".js";
			let content = (context.post.content || "").trim();
			try {
				check(addon, "You must specify an addon filename");
				check(addon.length <= 20, "Addon filename is too long");
				check(content, "Addon content cannot be blank");
				check(!App.addons[file], "Addon " + Text.escapeHTML(file) + " already exists");
			} catch (err) {
				error = err.message;
			}
			if (!App.jsInject) {
				error = "[Javascript injection is disabled]";
			}
			if (!error) {
				App.dam.setFileContent(file, content);
				if (!App.installAddon(file)) {
					error = "Failed to install the add-on";
				} else {
					App.logServerAction(context.user.id, 'Add-on installed: ' + file);
					context.response.writeHead(302, { 'Location': '/addons/' });
					context.response.end();
					return;
				}
			}
		}

		let htmlVars = Object.create(null);
		htmlVars.content = Text.escapeHTML(context.post.content || '');
		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(addingTemplate.make(htmlVars), {
			title: "New Add-on - Showdown ChatBot",
			scripts: CM_SCRIPTS,
			styles: CM_STYLES,
		});
	}

	function editAddonHandler(context, parts) {
		let file = parts[2];
		if (!file) {
			return context.endWith404();
		}

		let path = App.addonsDir + '/' + file;
		let addonContent = '';
		try {
			addonContent = App.dam.getFileContent(path);
		} catch (err) {
			return context.endWith404();
		}

		let ok = null, error = null;

		if (context.post.edit) {
			let addon = path;
			let content = (context.post.content || "").trim();
			try {
				check(addon, "You must specify an addon filename");
				check(content, "Addon content cannot be blank");
				check(App.addons[addon], "Addon " + Text.escapeHTML(addon) + " not found");
			} catch (err) {
				error = err.message;
			}
			if (!App.jsInject) {
				error = "[Javascript injection is disabled]";
			}
			if (!error) {
				App.removeAddon(addon);
				App.dam.setFileContent(addon, content);
				addonContent = content;
				if (!App.installAddon(addon)) {
					error = "Failed to re-install the add-on";
				} else {
					App.logServerAction(context.user.id, 'Add-on re-installed: ' + addon);
					ok = "Add-on re-installed successfully";
				}
			}
		}

		let htmlVars = Object.create(null);
		htmlVars.content = Text.escapeHTML(addonContent);
		htmlVars.file = Text.escapeHTML(path);
		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(editTemplate.make(htmlVars), {
			title: "Add-ons - Showdown ChatBot",
			scripts: CM_SCRIPTS,
			styles: CM_STYLES,
		});
	}
};