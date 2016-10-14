/**
 * Server Handler: Moderation
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const SubMenu = Tools('submenu');
const Template = Tools('html-template');

const configTemplate = new Template(Path.resolve(__dirname, 'templates', 'config.html'));
const settingsTemplate = new Template(Path.resolve(__dirname, 'templates', 'settings.html'));
const exceptionTemplate = new Template(Path.resolve(__dirname, 'templates', 'exception.html'));
const rulesTemplate = new Template(Path.resolve(__dirname, 'templates', 'rules.html'));
const otherTemplate = new Template(Path.resolve(__dirname, 'templates', 'other.html'));

exports.setup = function (App) {
	/* Menu Options */
	App.server.setMenuOption('moderation', 'Moderation', '/moderation/', 'moderation', 0);

	/* Handlers */
	App.server.setHandler('moderation', (context, parts) => {
		if (!context.user || !context.user.can('moderation')) {
			context.endWith403();
			return;
		}

		let submenu = new SubMenu("Moderation", parts, context, [
			{id: 'config', title: 'Configuration', url: '/moderation/', handler: moderationConfigHandler},
			{id: 'settings', title: 'Settings', url: '/moderation/settings/', handler: moderationSettingsHandler},
			{id: 'exception', title: 'Moderation&nbsp;Exception', url: '/moderation/exception/', handler: moderationExceptionHandler},
			{id: 'rules', title: 'Rules&nbsp;link', url: '/moderation/rules/', handler: moderationRulesHandler},
			{id: 'other', title: 'Other', url: '/moderation/other/', handler: moderationOtherHandler},
		], 'config');

		return submenu.run();
	});

	function moderationConfigHandler(context, html) {
		let config = App.modules.moderation.system.data;
		let ok = null, error = null;
		if (context.post.savepuns) {
			let puns = (context.post.punishments || "").split(',');
			let aux = [];
			for (let i = 0; i < puns.length; i++) {
				let pun = Text.toId(puns[i]);
				if (pun) {
					aux.push(pun);
				}
			}
			if (aux.length) {
				config.punishments = aux;
				App.modules.moderation.system.db.write();
				App.logServerAction(context.user.id, "Moderation: Edit Punishments");
				ok = "Punishments saved";
			} else {
				error = "You must specify at least one punishment";
			}
		} else if (context.post.editval) {
			let values = {};
			for (let k in App.modules.moderation.system.modBot.filters) {
				let pun = context.post[k];
				if (pun && config.punishments.indexOf(pun) >= 0) {
					values[k] = config.punishments.indexOf(pun) + 1;
				}
			}
			config.values = values;
			App.modules.moderation.system.db.write();
			App.logServerAction(context.user.id, "Moderation: Edit Moderation values");
			ok = "Moderation values saved";
		}

		let htmlVars = {};
		htmlVars.punishments = config.punishments.join(', ');

		htmlVars.rooms = '';
		for (let k in App.modules.moderation.system.modBot.filters) {
			let val = config.values[k] || 0;
			htmlVars.rooms += '<tr><td>' + k + '</td>';
			htmlVars.rooms += '<td><select name="' + k + '">';
			let punishments = config.punishments;
			for (let i = 0; i < punishments.length; i++) {
				htmlVars.rooms += '<option value="' + punishments[i] + '"' + (val === (i + 1) ? ' selected="selected"' : '') +
				' >' + punishments[i] + '</option>';
			}
			htmlVars.rooms += '<option value=""' + (val === 0 ? ' selected="selected"' : '') + ' >Default</option>';
			htmlVars.rooms += '</select></td></tr>';
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += configTemplate.make(htmlVars);
		context.endWithWebPage(html, {title: "Moderation Configuration - Showdown ChatBot"});
	}

	function getSettingsForm(room) {
		let opts = [];
		for (let k in App.modules.moderation.system.modBot.filters) {
			if (App.modules.moderation.system.modBot.modEnabled(k, room)) {
				opts.push('<input name="' + k + '" type="checkbox" value="true" checked="checked" />&nbsp;' + k);
			} else {
				opts.push('<input name="' + k + '" type="checkbox" value="true" />&nbsp;' + k);
			}
		}
		return '<p>' + opts.join(' | ') + '</p>';
	}

	function moderationSettingsHandler(context, html) {
		let config = App.modules.moderation.system.data;
		let ok = null, error = null;

		if (context.post.add) {
			let room = Text.toRoomid(context.post.room);
			try {
				check(room, "You must specify a room");
				check(!config.roomSettings[room], "Room already exists");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				config.roomSettings[room] = {};
				App.modules.moderation.system.db.write();
				App.logServerAction(context.user.id, "Moderation Settings: Add Room: " + room);
				ok = "Added room: " + room;
			}
		} else if (context.post.delroom) {
			let room = Text.toRoomid(context.post.room);
			try {
				check(room, "You must specify a room");
				check(config.roomSettings[room], "Room not found");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				delete config.roomSettings[room];
				App.modules.moderation.system.db.write();
				App.logServerAction(context.user.id, "Moderation Settings: Delete Room: " + room);
				ok = "Removed room: " + room;
			}
		} else if (context.post.edit) {
			let room = Text.toRoomid(context.post.room);
			let settings = {};
			for (let k in App.modules.moderation.system.modBot.filters) {
				settings[k] = !!context.post[k];
			}
			if (!room) {
				config.settings = settings; /* Default */
			} else {
				config.roomSettings[room] = settings; /* Specific Room */
			}
			App.modules.moderation.system.db.write();
			App.logServerAction(context.user.id, "Moderation Settings: Edit");
			ok = "Moderation settings saved";
		}

		let htmlVars = {};

		htmlVars.global = getSettingsForm('');
		htmlVars.rooms = '';
		for (let room in config.roomSettings) {
			htmlVars.rooms += '<h3>Room: ' + room + '</h3>';
			htmlVars.rooms += '<form method="post" action="">';
			htmlVars.rooms += '<input type="hidden" name="room" value="' + room + '" />';
			htmlVars.rooms += getSettingsForm(room);
			htmlVars.rooms += '<p><input type="submit" name="edit" value="Save Changes" /></p>';
			htmlVars.rooms += '</form>';
			htmlVars.rooms += '<p><button onclick="removeRoom(\'' + room +
			'\');">Use Default Settings</button>&nbsp;<span id="confirm-' + room + '">&nbsp;</span></p>';
			htmlVars.rooms += '<hr />';
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += settingsTemplate.make(htmlVars);
		context.endWithWebPage(html, {title: "Moderation Settings - Showdown ChatBot"});
	}

	function getRankSelect(name, rank) {
		if (!rank) rank = '';
		if (rank.length > 1 && App.config.parser[rank]) {
			rank = App.config.parser[rank];
		}
		let html = '';
		html += '<select name="' + name + '">';
		html += '<option value="user"' + (rank === 'user' ? ' selected="selected"' : '') + '>Regular Users</option>';
		html += '<option value="excepted"' + (rank === 'excepted' ? ' selected="selected"' : '') + '>Excepted Users</option>';
		for (let j = 0; j < App.config.parser.groups.length; j++) {
			html += '<option value="' + App.config.parser.groups[j] + '"' +
			(rank === App.config.parser.groups[j] ? ' selected="selected"' : '') + '>Group ' + App.config.parser.groups[j] + '</option>';
		}
		html += '</select>';
		return html;
	}

	function moderationExceptionHandler(context, html) {
		let config = App.modules.moderation.system.data;
		let ok = null, error = null;

		if (context.post.editdefault) {
			let rank = context.post.rank || "excepted";
			if (rank.length > 1 && App.config.parser[rank]) {
				rank = App.config.parser[rank];
			}
			if (rank === 'user' || rank === 'excepted' || App.config.parser.groups.indexOf(rank) >= 0) {
				config.modexception.global = rank;
				App.modules.moderation.system.db.write();
				App.logServerAction(context.user.id, "Moderation: Edit Mod-Exception");
				ok = "Moderation exception configuration saved";
			} else {
				error = "Invalid Rank";
			}
		} else if (context.post.delroom) {
			let room = Text.toRoomid(context.post.room);
			if (room && config.modexception.rooms[room]) {
				delete config.modexception.rooms[room];
				App.modules.moderation.system.db.write();
				App.logServerAction(context.user.id, "Moderation: Edit Mod-Exception");
				ok = "Moderation exception configuration saved";
			} else {
				error = "Invalid Room";
			}
		} else if (context.post.setroom) {
			let room = Text.toRoomid(context.post.room);
			if (room) {
				let rank = context.post.rank || "excepted";
				if (rank.length > 1 && App.config.parser[rank]) {
					rank = App.config.parser[rank];
				}
				if (rank === 'user' || rank === 'excepted' || App.config.parser.groups.indexOf(rank) >= 0) {
					config.modexception.rooms[room] = rank;
					App.modules.moderation.system.db.write();
					App.logServerAction(context.user.id, "Moderation: Edit Mod-Exception");
					ok = "Moderation exception configuration saved";
				} else {
					error = "Invalid Rank";
				}
			} else {
				error = "You must specify a room";
			}
		}

		let htmlVars = {};

		htmlVars.dme = getRankSelect('rank', config.modexception.global);
		htmlVars.rooms = '';
		for (let room in config.modexception.rooms) {
			htmlVars.rooms += '<tr><td>' + room + '</td>';
			switch (config.modexception.rooms[room]) {
			case 'user':
				htmlVars.rooms += '<td>All Users</td>';
				break;
			case 'excepted':
				htmlVars.rooms += '<td>Excepted Users</td>';
				break;
			default:
				htmlVars.rooms += '<td>Group ' + Text.escapeHTML(config.modexception.rooms[room]) + '</td>';
				break;
			}
			htmlVars.rooms += '<td><div align="center"><form style="display:inline;" method="post" action="">' +
			'<input type="hidden" name="room" value="' + room +
			'" /><input type="submit" name="delroom" value="Delete" /></form></div></td></tr>';
		}

		htmlVars.ranks = getRankSelect('rank');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += exceptionTemplate.make(htmlVars);
		context.endWithWebPage(html, {title: "Moderation Exception - Showdown ChatBot"});
	}

	function moderationRulesHandler(context, html) {
		let config = App.modules.moderation.system.data;
		let ok = null, error = null;

		if (context.post.setroom) {
			let room = Text.toRoomid(context.post.room);
			let link = (context.post.link || "").trim();
			if (room) {
				if (link) {
					config.rulesLink[room] = link;
					App.modules.moderation.system.db.write();
					App.logServerAction(context.user.id, "Moderation: Edit Rules-Link");
					ok = "Moderation rules link configuration saved";
				} else {
					error = "You must specify a rules link";
				}
			} else {
				error = "You must specify a room";
			}
		} else if (context.post.delroom) {
			let room = Text.toRoomid(context.post.room);
			if (room && config.rulesLink[room]) {
				delete config.rulesLink[room];
				App.modules.moderation.system.db.write();
				App.logServerAction(context.user.id, "Moderation: Edit Rules-Link");
				ok = "Moderation rules link configuration saved";
			} else {
				error = "Invalid Room";
			}
		}

		let htmlVars = {};

		htmlVars.rooms = '';
		for (let room in config.rulesLink) {
			htmlVars.rooms += '<tr><td>' + room + '</td>';
			htmlVars.rooms += '<td><a href="' + config.rulesLink[room] + '">' + Text.escapeHTML(config.rulesLink[room]) + '</a></td>';
			htmlVars.rooms += '<td><div align="center"><form style="display:inline;" method="post" action="">' +
			'<input type="hidden" name="room" value="' + room +
			'" /><input type="submit" name="delroom" value="Delete" /></form></div></td></tr>';
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += rulesTemplate.make(htmlVars);
		context.endWithWebPage(html, {title: "Moderation Rules Links Configuration - Showdown ChatBot"});
	}

	function moderationOtherHandler(context, html) {
		let config = App.modules.moderation.system.data;
		let ok = null, error = null;

		if (context.post.editservers) {
			let servers = (context.post.servers || "").split(',');
			let aux = [];
			for (let i = 0; i < servers.length; i++) {
				let server = Text.toId(servers[i]);
				if (server && aux.indexOf(server) < 0) {
					aux.push(server);
				}
			}
			config.serversWhitelist = aux;
			App.modules.moderation.system.db.write();
			App.logServerAction(context.user.id, "Moderation: Edit whitelisted servers");
			ok = "Moderation configuration saved";
		}

		let htmlVars = {};

		htmlVars.wservers = config.serversWhitelist.join(', ');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += otherTemplate.make(htmlVars);
		context.endWithWebPage(html, {title: "Moderation - Showdown ChatBot"});
	}
};
