/**
 * Server Handler: Bot Configuration
 */

'use strict';

const check = Tools.get('check.js');

/* Permissions */

App.server.setPermission('bot', 'Permission for changing the bot configuration');

/* Menu Options */

App.server.setMenuOption('bot', 'Bot&nbsp;Configuration', '/bot/', 'bot', 1);

/* Handlers */

App.server.setHandler('bot', (context, parts) => {
	/* Permission Check */
	if (!context.user || !context.user.can('bot')) {
		context.endWith403();
		return;
	}

	/* Actions */
	let ok = null, error = null;
	if (context.post.restart) {
		/* Bot restart */
		if (App.restartBot()) {
			ok = "The bot was restarted.";
			App.logServerAction(context.user.id, 'Bot Restart');
		} else {
			if (!App.bot.server) {
				error = "The bot could not start because the Server was not defined.";
			} else {
				error = "Could not restart the bot because it was already restarting.";
			}
		}
	} else if (context.post.stop) {
		/* Bot Stop */
		if (App.stopBot()) {
			ok = "The bot process was stopped.";
			App.logServerAction(context.user.id, 'Bot Stop');
		} else {
			error = "The bot was already stopped.";
		}
	} else if (context.post.editbot) {
		/* Edit Bot configuration */
		let secRetry = parseInt(context.post.retry);
		let newPort = parseInt(context.post.port);

		/* Check */
		try {
			check(!isNaN(secRetry) && secRetry > 0, "Invalid time to retry the connection.");
			check(!isNaN(newPort), "Invalid Port");
		} catch (err) {
			error = err.message;
		}

		/* Save changes */
		if (!error) {
			App.config.bot.server = context.post.server || '';
			App.config.bot.port = context.post.port;
			App.config.bot.serverid = context.post.serverid || 'showdown';
			App.config.bot.retrydelay = secRetry * 1000;
			App.bot.server = App.config.bot.server;
			App.bot.port = App.config.bot.port;
			App.bot.loginUrl.serverId = App.config.bot.serverid;
			if (App.bot.errOptions) {
				App.bot.errOptions.retryDelay = App.config.bot.retrydelay;
			}
			App.db.write();
			App.logServerAction(context.user.id, 'Edit Bot configuration');
			ok = "Bot configuration changed sucessfully. Restart the bot to make the changes effective.";
		}
	}

	/* Generate HTML */
	let html = '';
	html += '<script type="text/javascript">function showRestartConfirm() {var elem = document.getElementById(\'confirm-restart\');' +
		'if (elem) {elem.innerHTML = \'<form style="display:inline;" method="post" action="">&nbsp;Are you sure?&nbsp;' +
		'<input type="submit" name="restart" value="Restart Bot" /></form>\';}}</script>';
	html += '<script type="text/javascript">function showStopConfirm() {var elem = document.getElementById(\'confirm-stop\');' +
		'if (elem) {elem.innerHTML = \'<form style="display:inline;" method="post" action="">&nbsp;Are you sure?&nbsp;' +
		'<input type="submit" name="stop" value="Stop Bot" /></form>\';}}</script>';

	html += '<table border="1">';
	html += '<tr><td colspan="2"><div align="center"><strong>Bot Status </strong></div></td></tr>';
	html += '<tr><td width="150"><strong>Connection</strong></td><td width="150">';
	if (App.bot.status.connected) {
		html += '<font color="green"><strong>CONNECTED</strong></font>';
	} else if (App.bot.connecting) {
		html += '<font color="orange"><strong>CONNECTING...</strong></font>';
	} else {
		html += '<font color="red"><strong>NOT CONNECTED</strong></font>';
	}
	html += '</td></tr>';
	html += '<tr><td><strong>Nickname</strong></td><td>' + (App.bot.getBotNick() || "-") + '</td></tr>';
	html += '<tr><td><strong>Rooms</strong></td><td>';
	let rooms = [];
	for (let r in App.bot.rooms) {
		if (App.bot.rooms[r].type === 'chat') {
			rooms.push(App.bot.rooms[r].id);
		}
	}
	html += rooms.join(', ');
	html += '</td></tr>';
	html += '<tr><td><strong>Battles</strong></td><td>';
	let battles = [];
	for (let r in App.bot.rooms) {
		if (App.bot.rooms[r].type === 'battle') {
			battles.push(App.bot.rooms[r].id);
		}
	}
	html += battles.join(', ');
	html += '</td></tr>';
	html += '</table>';
	html += '<p><a href=""><button>Refresh</button></a></p>';
	html += '<p><button onclick="showRestartConfirm();">Restart Bot</button><span id="confirm-restart">&nbsp;</span></p>';
	if (App.status !== 'stopped') {
		html += '<p><button onclick="showStopConfirm();">Stop Bot</button><span id="confirm-stop">&nbsp;</span></p>';
	}
	html += '<hr />';

	html += '<h3>Bot Configuration</h3>';
	html += '<form method="post" action="">';
	html += '<table border="0">';
	html += '<tr><td>Server: </td><td><label><input id="text-server" name="server" type="text" size="50" value="' +
		App.bot.server + '"/></label></td></tr>';
	html += '<tr><td>Port: </td><td><label><input id="text-port" name="port" type="text" size="50" value="' +
		App.bot.port + '"/></label></td></tr>';
	html += '<tr><td>Server-ID: </td><td><label><input id="text-serverid" name="serverid" type="text" size="50" value="' +
		App.bot.loginUrl.serverId + '"/></label></td></tr>';
	html += '<tr><td>Seconds to retry the connection: </td><td><label><input id="text-retry" name="retry" type="text" size="50" value="' +
		Math.floor(App.config.bot.retrydelay / 1000) + '"/></label></td></tr>';
	html += '</table>';
	html += '<p><label><input type="submit" name="editbot" value="Save Changes" /></label></p>';
	html += '</form>';
	html += '<p><button onclick="document.getElementById(\'text-server\').value = \'sim.psim.us\';' +
		'document.getElementById(\'text-port\').value = \'8000\'; document.getElementById(\'text-serverid\').value = \'showdown\';' +
		'document.getElementById(\'text-retry\').value = \'10\';">Set Default Values</button></p>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Bot Configuration - Showdown ChatBot"});
});
