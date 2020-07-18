/**
 * Server Handler: Logs Viewer
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const FileSystem = require('fs');

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('logs', 'Permission for viewing chat logs');

	/* Menu Options */
	App.server.setMenuOption('logs', 'Logs', '/logs/', 'logs', 0);

	/* Handlers */
	App.server.setHandler('logs', (context, parts) => {
		if (!context.user || !context.user.can('logs')) {
			context.endWith403();
			return;
		}
		if (parts[0] === 'raw') {
			return serveRawLog(context, parts);
		} else if (parts[0] === 'html') {
			return serveHtmlLog(context, parts);
		}
		let html = '';
		html += '<div align="center"><h2>Chat Logs</h2>';

		/* Menu */
		let opts = [];
		for (let room in App.config.modules.chatlogger.rooms) {
			opts.push('<a class="submenu-option' + (parts[1] === room ? '-selected' : '') + '" href="/logs/room/' + room + '/">' + room + '</a>');
		}
		if (App.config.modules.chatlogger.logpm) {
			opts.push('<a class="submenu-option' + (parts[0] === 'pm' ? '-selected' : '') + '" href="/logs/pm/">private-message</a>');
		}
		if (App.config.modules.chatlogger.logGroupChats) {
			opts.push('<a class="submenu-option' + (parts[0] === 'groupchat' ? '-selected' : '') + '" href="/logs/groupchat/">groupchats</a>');
		}
		html += opts.join(' | ');
		html += '</div>';

		/* Room Logs List */
		let mod = App.modules.chatlogger.system;
		mod.refreshLoggers();
		if (parts[0] === 'room') {
			let room = (parts[1] || "");
			if (App.modules.chatlogger.system.loggers[room]) {
				html += getLogsList(App.modules.chatlogger.system.loggers[room], room);
			} else {
				context.endWith404();
				return;
			}
		} else if (parts[0] === 'pm') {
			if (App.modules.chatlogger.system.pmLogger) {
				html += getLogsList(App.modules.chatlogger.system.pmLogger, 'private-message');
			} else {
				context.endWith404();
				return;
			}
		} else if (parts[0] === 'groupchat') {
			if (App.modules.chatlogger.system.groupchatsLogger) {
				html += getLogsList(App.modules.chatlogger.system.groupchatsLogger, 'groupchats');
			} else {
				context.endWith404();
				return;
			}
		}
		context.endWithWebPage(html, {title: "Chat Logs - Showdown ChatBot"});
	});

	function serveRawLog(context, parts) {
		let room = Text.toRoomid(parts[1]);
		let file = (parts[2] || "").split('?')[0];
		let path;
		if (room === 'private-message') {
			path = Path.resolve(App.logsDir, 'pm', file);
		} else if (room === 'groupchats') {
			path = Path.resolve(App.logsDir, 'groupchat', file);
		} else {
			path = Path.resolve(App.logsDir, 'rooms', room, file);
		}
		context.endWithStaticFile(path);
	}

	function serveHtmlLog(context, parts) {
		let html = FileSystem.readFileSync(Path.resolve(__dirname, '../log-parser.html')).toString();
		let room = Text.toRoomid(parts[1]);
		let file = parts[2] || "";
		html = html.replace('#TITLE#', file + ' - Showdown ChatBot Logs');
		html = html.replace('#LOGURL#', '/logs/raw/' + room + '/' + file);
		context.endWithHtml(html);
	}

	/* Auxiliar Functions */
	function getLogsList(logger, room) {
		let html = '';
		html += '<hr />';
		html += '<h3>Logs Files - Room: ' + room + '</h3>';
		html += '<blockquote><table border="1">';
		html += '<tr><td width="200px"><div align="center"><strong>File</strong></div></td>' +
		'<td width="200px"><div align="center"><strong>Size</strong></div></td>' +
		'<td width="200px"><div align="center"><strong>Date</strong></div></td>' +
		'<td width="250px"><div align="center"><strong>Options</strong></div></td></tr>';
		let logs = logger.getFilesList();
		for (let i = 0; i < logs.length; i++) {
			html += '<tr><td>' + logs[i].file + '</td><td>' + logs[i].size + ' KB</td><td>' + logs[i].date +
			'</td><td><div align="center"><a href="/logs/raw/' + room + '/' + logs[i].file +
			'" target="_blank"><button>View Log</button></a>&nbsp;&nbsp;' +
			'<a href="/logs/html/' + room + '/' + logs[i].file +
			'/get" target="_blank"><button>View HTML</button></a></div></td></tr>';
		}
		html += '</table></blockquote>';
		return html;
	}
};
