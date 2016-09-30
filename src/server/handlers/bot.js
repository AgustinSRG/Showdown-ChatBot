/**
 * Server Handler: Bot Configuration
 * Allows administrator to configure the connection options
 * for Showdown-ChatBot: server, port, serverId and retyConnectionDelay
 */

'use strict';

const check = Tools.get('check.js');

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('bot', 'Permission for changing the bot configuration');

	/* Menu Options */
	App.server.setMenuOption('bot', 'Bot&nbsp;Configuration', '/bot/', 'bot', 1);

	/* Handlers */
	App.server.setHandler('bot', (context, parts) => {
		if (!context.user || !context.user.can('bot')) {
			context.endWith403();
			return;
		}

		if (context.get.getbotstatus) {
			let data = {};
			if (App.bot.status.connected) {
				data.con = '<font color="green"><strong>CONNECTED</strong></font>';
			} else if (App.bot.connecting) {
				data.con = '<font color="orange"><strong>CONNECTING...</strong></font>';
			} else {
				data.con = '<font color="red"><strong>NOT CONNECTED</strong></font>';
			}
			data.nick = (App.bot.getBotNick() || "-");
			data.rooms = [];
			for (let r in App.bot.rooms) {
				if (App.bot.rooms[r].type === 'chat') {
					data.rooms.push(App.bot.rooms[r].id);
				}
			}
			data.battles = [];
			for (let r in App.bot.rooms) {
				if (App.bot.rooms[r].type === 'battle') {
					data.battles.push(App.bot.rooms[r].id);
				}
			}
			return context.endWithText(JSON.stringify(data));
		}

		let ok = null, error = null;
		if (context.post.restart) {
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
			if (App.stopBot()) {
				ok = "The bot process was stopped.";
				App.logServerAction(context.user.id, 'Bot Stop');
			} else {
				error = "The bot was already stopped.";
			}
		} else if (context.post.editbot) {
			let secRetry = parseInt(context.post.retry);
			let newPort = parseInt(context.post.port);

			try {
				check(!isNaN(secRetry) && secRetry > 0, "Invalid time to retry the connection.");
				check(!isNaN(newPort), "Invalid Port");
			} catch (err) {
				error = err.message;
			}

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
				App.saveConfig();
				App.logServerAction(context.user.id, 'Edit Bot configuration');
				ok = "Bot configuration changed sucessfully. Restart the bot to make the changes effective.";
			}
		}

		let html = '';
		html += '<script type="text/javascript">';
		html += 'function escapeHtml(text) {return text.replace(/[\"&<>]/g,' +
		' function (a) {return { \'"\': \'&quot;\', \'&\': \'&amp;\', \'<\': \'&lt;\', \'>\': \'&gt;\' }[a];});}';
		html += 'var req = null;function updateBotStatus() {if (req) {try {req.abort()} catch (err) {} req = null;}' +
		'var rp = document.getElementById(\'refresh-progress\');rp.innerHTML = "&nbsp;";' +
		'req = $.get(\'/bot/?getbotstatus=\' + Date.now(), function(data) {try {data = JSON.parse(data);' +
		'document.getElementById(\'bot-connection\').innerHTML = data.con;' +
		'document.getElementById(\'bot-nick\').innerHTML = data.nick;' +
		'document.getElementById(\'bot-rooms\').innerHTML = escapeHtml(data.rooms.join(\', \'));' +
		'document.getElementById(\'bot-battles\').innerHTML = escapeHtml(data.battles.join(\', \'));' +
		'rp.innerHTML = \'&nbsp;\';} catch (err) {rp.innerHTML = \'<small><span class="error-msg">' +
		'Refresh failure</span></small>\';}}).fail(function () {rp.innerHTML = \'<small><span class="error-msg">' +
		'Refresh failure</span></small>\';});}';
		html += '</script>';
		html += '<script type="text/javascript">function showRestartConfirm() {var elem = document.getElementById(\'confirm-restart\');' +
		'if (elem) {elem.innerHTML = \'<form style="display:inline;" method="post" action="">&nbsp;Are you sure?&nbsp;' +
		'<input type="submit" name="restart" value="Restart Bot" /></form>\';}}</script>';
		html += '<script type="text/javascript">function showStopConfirm() {var elem = document.getElementById(\'confirm-stop\');' +
		'if (elem) {elem.innerHTML = \'<form style="display:inline;" method="post" action="">&nbsp;Are you sure?&nbsp;' +
		'<input type="submit" name="stop" value="Stop Bot" /></form>\';}}</script>';

		html += '<table border="0"><tr><td>';
		html += '<table border="1">';
		html += '<tr><td colspan="2"><div align="center"><strong>Bot Status </strong></div></td></tr>';
		html += '<tr><td width="150"><strong>Connection</strong></td><td width="150">';
		if (App.bot.status.connected) {
			html += '<span id="bot-connection"><font color="green"><strong>CONNECTED</strong></font></span>';
		} else if (App.bot.connecting) {
			html += '<span id="bot-connection"><font color="orange"><strong>CONNECTING...</strong></font></span>';
		} else {
			html += '<span id="bot-connection"><font color="red"><strong>NOT CONNECTED</strong></font></span>';
		}
		html += '</td></tr>';
		html += '<tr><td><strong>Nickname</strong></td><td><span id="bot-nick">' + (App.bot.getBotNick() || "-") + '</span></td></tr>';
		html += '<tr><td><strong>Rooms</strong></td><td><span id="bot-rooms">';
		let rooms = [];
		for (let r in App.bot.rooms) {
			if (App.bot.rooms[r].type === 'chat') {
				rooms.push(App.bot.rooms[r].id);
			}
		}
		html += rooms.join(', ');
		html += '</span></td></tr>';
		html += '<tr><td><strong>Battles</strong></td><td><span id="bot-battles">';
		let battles = [];
		for (let r in App.bot.rooms) {
			if (App.bot.rooms[r].type === 'battle') {
				battles.push(App.bot.rooms[r].id);
			}
		}
		html += battles.join(', ');
		html += '</span></td></tr>';
		html += '</table>';
		html += '</td><td>';
		html += '<p><button onclick="updateBotStatus();">Refresh</button>&nbsp;<span id="refresh-progress">&nbsp;</span></p>';
		html += '<p><button onclick="showRestartConfirm();">Restart Bot</button><span id="confirm-restart">&nbsp;</span></p>';
		if (App.status !== 'stopped') {
			html += '<p><button onclick="showStopConfirm();">Stop Bot</button><span id="confirm-stop">&nbsp;</span></p>';
		}
		html += '</td></tr></table>';
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

		context.endWithWebPage(html, {title: "Bot Configuration - Showdown ChatBot", scripts: ['/static/jquery-3.0.0.min.js']});
	});
};
