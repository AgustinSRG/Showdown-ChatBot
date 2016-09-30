/**
 * Server Handler: Add-Ons
 * This handler allows administrators to install,
 * edit and uninstall add-ons for Showdown-ChatBot
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');
const Text = Tools.get('text.js');
const check = Tools.get('check.js');

exports.setup = function (App) {
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

		let html = '';

		html += '<h2>Add-ons</h2>';
		html += '<script type="text/javascript">function removeAddon(addon) {var elem = document.getElementById(\'confirm-\' + addon);' +
		'if (elem) {elem.innerHTML = \'<form style="display:inline;" id="confirm-delete-form" method="post" action="">' +
		'<input type="hidden" name="addon" value="\' + addon + \'" />Are you sure?&nbsp;' +
		'<input type="submit" name="remove" value="Delete" /></form>\';}return false;}</script>';

		for (let file in App.addons) {
			html += '<p><strong>Add-on | File: ' + file + '</strong></p>';
			if (typeof App.addons[file].desc === 'string') {
				html += '<p>' + Text.escapeHtml(App.addons[file].desc) + '</p>';
			}
			html += '<p><a href="/addons/edit/' + file + '/set/"><button>Edit Add-on</button></a></p>';
			html += '<p><button onclick="removeAddon(\'' + file +
			'\');">Delete Add-on</button>&nbsp;<span id="confirm-' + file + '">&nbsp;</span></p>';
			html += '<hr />';
		}

		html += '<p><strong>Note:</strong> Addons can cause several damage to your bot. Only install them if you know they are safe.</p>';
		html += '<a href="/addons/new/"><button>Install New Add-on</button></a>';

		if (error) {
			html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
		} else if (ok) {
			html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
		}

		context.endWithWebPage(html, {title: "Add-ons - Showdown ChatBot"});
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

		let html = '';
		html += '<p><a href="/addons/">Back to Add-ons list</a></p>';
		html += '<form method="post" action="">';
		html += '<p><strong>File (without ext):</strong>&nbsp;<input name="addon" type="text" size="30" /></p>';
		html += '<p>Copy in the following textarea the full script file.</p>';
		html += '<p><textarea name="content" cols="140" rows="20">' + (context.post.content || '') + '</textarea></p>';
		html += '<p><input type="submit" name="add" value="Install Add-on" /></p>';
		html += '</form>';

		if (error) {
			html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
		} else if (ok) {
			html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
		}

		context.endWithWebPage(html, {title: "New Add-on - Showdown ChatBot"});
	}

	function editAddonHandler(context, parts) {
		let html = '';
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

		html += '<p><a href="/addons/">Back to Add-ons list</a></p>';
		html += '<form method="post" action="">';
		html += '<input type="hidden" name="addon" value="' + file + '" />';
		html += '<p><strong>File: ' + file + '</strong></p>';
		html += '<p><textarea name="content" cols="140" rows="20">' + content + '</textarea></p>';
		html += '<p><input type="submit" name="edit" value="Save Changes" /></p>';
		html += '</form>';

		if (error) {
			html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
		} else if (ok) {
			html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
		}

		context.endWithWebPage(html, {title: "Add-ons - Showdown ChatBot"});
	}

	if (global.ShellOptions && global.ShellOptions.staticmode) {
		App.server.removeMenuOption('addons');
		App.server.removeHandler('addons');
	}
};
