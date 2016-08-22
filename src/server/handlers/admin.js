/**
 * Server Handler: Administration Options
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');

const check = Tools.get('check.js');

/* Menu Options */

App.server.setMenuOption('admin', 'Admin', '/admin/', 'root');

/* Handlers */

App.server.setHandler('admin', (context, parts) => {
	/* Permission check */
	if (!context.user || !context.user.can('root')) {
		context.endWith403();
		return;
	}

	/* Actions */
	let ok = null, error = null;

	if (context.post.exit) {
		/* Exit process */
		App.logServerAction(context.user.id, 'Exit Process');
		let buf = '';
		buf += '<html><head><title>Process Exited</title></head><body><p>The application exits sucessfully.</p>' +
			'<a href=""><button>Refresh Page</button></a></body></html>';
		context.response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
		context.response.end(buf);
		console.log("Exit via server, By: " + context.user.id);
		process.exit(0);
		return;
	} else if (context.post.genssl) {
		/* Generate SSL certificate */
		try {
			const Pem = require('pem');
			Pem.createCertificate({}, (err, keys) => {
				if (err) {
					App.reportCrash(err);
				} else {
					FileSystem.writeFileSync(Path.resolve(App.confDir, 'ssl-key.pem'), keys.serviceKey);
					FileSystem.writeFileSync(Path.resolve(App.confDir, 'ssl-cert.pem'), keys.certificate);
				}
			});
			ok = "SSL Key and certificate sucessfully generated.";
			App.logServerAction(context.user.id, 'SSL certificate was generated.');
		} catch (err) {
			error = "Missing dependencies: pem. Try npm install pem.";
		}
	} else if (context.post.savechanges) {
		/* Save administration options */
		let newPort = parseInt(context.post.port);
		let newHttpsPort = parseInt(context.post.sslport);

		/* Check */
		try {
			check(!isNaN(newPort), "Invalid port.");
		} catch (err) {
			error = err.message;
		}

		/* Save changes */
		if (!error) {
			App.config.server.port = newPort;
			App.config.server.bindaddress = context.post.bindaddress || "";
			if (newHttpsPort) {
				App.config.server.httpsPort = newHttpsPort;
				App.config.server.https = true;
			} else {
				App.config.server.httpsPort = 5000;
				App.config.server.https = false;
			}
			App.config.server.url = context.post.appurl || "";
			App.config.apptitle = context.post.apptitle || "";
			App.config.debug = !!context.post.debugmode;
			App.config.useproxy = !!context.post.useproxy;
			App.db.write();
			ok = "Changes made successfuly.";
			App.logServerAction(context.user.id, 'Administration options were editted');
		}
	}

	/* Generate HTML */
	let html = '';
	html += '<script type="text/javascript">function confirmExit()' +
		'{var elem = document.getElementById(\'confirm-exit\');if (elem)' +
		'{elem.innerHTML = \'<form style="display:inline;" method="post" action="">' +
		'Are you sure?&nbsp;<input type="submit" name="exit" value="Confirm Exit" />' +
		'</form>\';}return false;}</script>';
	html += '<h2>Administration Options</h2>';
	html += '<p>Note: Changes here requires a restart to be effective.</p>';

	html += '<form method="post" action="">';
	html += '<table border="0">';
	html += '<tr><td><strong>Http Port</strong>: </td><td><input type="text" name="port" value="' +
		App.config.server.port + '" /></td></tr>';
	html += '<tr><td><strong>Https Port (optional)</strong>: </td><td><input type="text" name="sslport" value="' +
		(App.config.server.https ? App.config.server.httpsPort : "") + '" /></td></tr>';
	html += '<tr><td><strong>Bind Address</strong>: </td><td><input type="text" name="bindaddress" value="' +
		(App.config.server.bindaddress || '') + '" /></td></tr>';
	html += '<tr><td><strong>Current Server Url</strong>: </td><td><input type="text" name="appurl" value="' +
		(App.config.server.url || "") + '" /></td></tr>';
	html += '<tr><td><strong>Application Title</strong>: </td><td><input type="text" name="apptitle" value="' +
		(App.config.apptitle || 'Showdown ChatBot') + '" /></td></tr>';
	html += '</table>';
	html += '<p><label><input type="checkbox" name="debugmode" value="true" ' +
		(App.config.debug ? 'checked="checked"' : '') + ' /></label>&nbsp;Enable debug mode.</p>';
	html += '<p><label><input type="checkbox" name="useproxy" value="true" ' +
		(App.config.useproxy ? 'checked="checked"' : '') + ' /></label>&nbsp;Check this option if you are using a proxy for your application.</p>';
	html += '<p><input type="submit" name="savechanges" value="Save Changes" /></p>';
	html += '</form>';

	html += '<form method="post" action="">';
	html += '<p><input type="submit" name="genssl" value="Generate SSL Certificate" /></p>';
	html += '</form>';

	html += '<p><button onclick="confirmExit();">Exit Process</button>&nbsp;<span id="confirm-exit"></span></p>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Admin - Showdown ChatBot"});
});
