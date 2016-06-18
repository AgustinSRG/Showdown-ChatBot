/**
 * Server Handler: Dev Tools
 */

'use strict';

const ServerGet = Tools.get('ps-cross-server.js');

/* Permissions */

App.server.setPermission('tools', 'Permission for using the develoment tools');

/* Menu Options */

App.server.setMenuOption('tools', 'Tools', '/tools/', 'tools');

/* Handlers */

App.server.setHandler('tools', (context, parts) => {
	/* Permission Check */
	if (!context.user || !context.user.can('tools')) {
		context.endWith403();
		return;
	}

	/* Generate HTML */
	let html = '';
	html += '<h2>Get-Server Tool</h2><form method="post" action=""><label><strong>Insert the client url</strong>: ' +
		'<input name="url" type="text" size="60" placeholder="example.psim.us" value="' + (context.post.url || '') +
		'" /></label><label>&nbsp;&nbsp;<input type="submit" name="getserver" value="Get Server" /></label></form>';
	if (context.post.getserver) {
		if (context.post.url) {
			/* Server-Get action */
			App.logServerAction(context.user.id, "Tool Server-Get used.");
			ServerGet.getShowdownServer(context.post.url, (err, data) => {
				if (err) {
					html += '<p style="padding:5px;"><span class="error-msg">Could not get the server configuration.</span></p>';
				} else {
					html += '<p style="padding:5px;"><strong>Server</strong>:&nbsp;' + data.host + '</p>';
					html += '<p style="padding:5px;"><strong>Port</strong>:&nbsp;' + data.port + '</p>';
					html += '<p style="padding:5px;"><strong>Server-ID</strong>:&nbsp;' + data.id + '</p>';
				}
				html += '<hr />';
				html += '<h2>Bot-Send Tool</h2><form  method="post" action=""><label><strong>Room</strong>:&nbsp;' +
					'<input type="text" name="room" /></label><p><label><strong>Message</strong>:<br /><br />' +
					'<textarea name="msg" cols="100" rows="4"></textarea></label></p>' +
					'<p><label><input type="submit" name="snd" value="Send Message" /></label></p></form>';
				context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot"});
			});
			return;
		} else {
			html += '<p style="padding:5px;"><span class="error-msg">You must specify an url.</span></p>';
		}
	}

	html += '<hr />';
	html += '<h2>Bot-Send Tool</h2><form  method="post" action=""><label><strong>Room</strong>:&nbsp;' +
		'<input type="text" name="room" /></label><p><label><strong>Message</strong>:<br /><br />' +
		'<textarea name="msg" cols="100" rows="4"></textarea></label></p>' +
		'<p><label><input type="submit" name="snd" value="Send Message" /></label></p></form>';

	if (context.post.snd) {
		/* Bot-Send action */
		if (context.post.msg) {
			if (App.bot.isConnected()) {
				App.bot.sendTo(context.post.room || "", context.post.msg.split('\n'));
				App.logServerAction(context.user.id, "Tool Bot-Send used. Room: " + (context.post.room || '-'));
				html += '<p style="padding:5px;"><span class="ok-msg">Message sucessfully sent.</span></p>';
			} else {
				html += '<p style="padding:5px;"><span class="error-msg">Error: The bot is not connected.</span></p>';
			}
		} else {
			html += '<p style="padding:5px;"><span class="error-msg">Cannot send a blank message.</span></p>';
		}
	}

	context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot"});
});
