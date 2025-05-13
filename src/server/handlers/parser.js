/**
 * Server Handler: Command Parser
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const SubMenu = Tools('submenu');
const Template = Tools('html-template');

const configTemplate = new Template(Path.resolve(__dirname, 'templates', 'parser-config.html'));
const aliasesTemplate = new Template(Path.resolve(__dirname, 'templates', 'parser-aliases.html'));
const permissionsTemplate = new Template(Path.resolve(__dirname, 'templates', 'parser-perm.html'));
const roomControlTemplate = new Template(Path.resolve(__dirname, 'templates', 'parser-controlrooms.html'));
const roomAliasesTemplate = new Template(Path.resolve(__dirname, 'templates', 'parser-roomalias.html'));
const abuseMonitorTemplate = new Template(Path.resolve(__dirname, 'templates', 'parser-monitor.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('parser', 'Permission for changing the command parser configuration');

	/* Menu Options */
	App.server.setMenuOption('parser', 'Command&nbsp;Parser', '/parser/', 'parser', 1);

	/* Handlers */
	App.server.setHandler('parser', (context, parts) => {
		if (!context.user || !context.user.can('parser')) {
			context.endWith403();
			return;
		}

		let submenu = new SubMenu("Command&nbsp;Parser", parts, context, [
			{ id: 'config', title: 'Configuration', url: '/parser/', handler: parserConfigurationHandler },
			{ id: 'aliases', title: 'Aliases', url: '/parser/aliases/', handler: parserAliasesHandler },
			{ id: 'permissions', title: 'Permissions', url: '/parser/permissions/', handler: parserPermissionsHandler },
			{ id: 'roomctrl', title: 'Control&nbsp;Rooms', url: '/parser/roomctrl/', handler: parserRoomControlHandler },
			{ id: 'roomalias', title: 'Rooms&nbsp;Aliases', url: '/parser/roomalias/', handler: parserRoomAliasHandler },
			{ id: 'monitor', title: 'Abuse&nbsp;Monitor', url: '/parser/monitor/', handler: parserAbuseMonitorHandler },
		], 'config');

		return submenu.run();
	});

	function parserConfigurationHandler(context, html) {
		let ok = null, error = null;
		if (context.post.edit) {
			let groups = (context.post.groups || "").split(',').map(Text.trim).filter(group => group);
			let defGroups = ['voice', 'driver', 'mod', 'bot', 'owner', 'admin'];
			for (let group of defGroups) {
				if (groups.indexOf(context.post[group]) < 0) {
					error = 'Group corresponding to defined group <strong>' + Text.escapeHTML(group) + '</strong> must be defined.';
					break;
				}
			}
			context.post.helpmsg = Text.toChatMessage(context.post.helpmsg);
			if (!error && context.post.helpmsg.length > 300) {
				error = "The help message must not be longer than 300 characters.";
			}
			if (!error) {
				App.config.parser.tokens = (context.post.tokens || "").split(' ').map(Text.toCmdTokenid).filter(id => id);
				App.config.parser.groups = groups;
				for (let group of defGroups) {
					App.config.parser[group] = context.post[group];
				}
				App.parser.data.helpmsg = context.post.helpmsg;
				App.parser.data.infocmds = context.post.infocmds;
				App.parser.data.antispam = !!context.post.antispam;
				App.parser.data.antirepeat = !!context.post.antirepeat;
				App.parser.data.antimixtoken = !!context.post.antimixtoken;
				App.parser.data.antimultitoken = !!context.post.antimultitoken;
				App.parser.data.pmTokens = (context.post.pmtokens || "").split(' ').map(Text.toCmdTokenid).filter(id => id);
				App.parser.data.sleep = Object.createFromKeys((context.post.sleep || "").split(',').map(Text.toRoomid).filter(room => room));
				App.parser.data.lockedUsers = Object.createFromKeys((context.post.locklist || "").split(',').map(Text.toId).filter(u => u));
				App.saveConfig();
				App.parser.saveData();
				ok = 'Command parser configuration edited successfully.';
				App.logServerAction(context.user.id, "Edit command-parser configuration");
			}
		}

		let htmlVars = Object.create(null);

		htmlVars.tokens = Text.escapeHTML(App.config.parser.tokens.join(' '));
		htmlVars.pmtokens = Text.escapeHTML(App.parser.data.pmTokens.join(' '));
		htmlVars.groups = Text.escapeHTML(App.config.parser.groups.join(', '));
		htmlVars.voice = Text.escapeHTML(App.config.parser.voice);
		htmlVars.driver = Text.escapeHTML(App.config.parser.driver);
		htmlVars.mod = Text.escapeHTML(App.config.parser.mod);
		htmlVars.bot = Text.escapeHTML(App.config.parser.bot);
		htmlVars.owner = Text.escapeHTML(App.config.parser.owner);
		htmlVars.admin = Text.escapeHTML(App.config.parser.admin);
		htmlVars.helpmsg = Text.escapeHTML(App.parser.data.helpmsg);
		htmlVars.infocmds = Text.escapeHTML(App.parser.data.infocmds || "");
		htmlVars.sleep = Text.escapeHTML(Object.keys(App.parser.data.sleep).join(', '));
		htmlVars.locklist = Text.escapeHTML(Object.keys(App.parser.data.lockedUsers).join(', '));
		htmlVars.antispam = (App.parser.data.antispam ? ' checked="checked"' : '');
		htmlVars.antirepeat = (App.parser.data.antirepeat ? ' checked="checked"' : '');
		htmlVars.antimixtoken = (App.parser.data.antimixtoken ? ' checked="checked"' : '');
		htmlVars.antimultitoken = (App.parser.data.antimultitoken ? ' checked="checked"' : '');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += configTemplate.make(htmlVars);
		context.endWithWebPage(html, { title: "Command Parser Configuration - Showdown ChatBot" });
	}

	function parserAliasesHandler(context, html) {
		let ok = null, error = null;
		if (context.post.set) {
			let alias = Text.toCmdid(context.post.alias);
			let cmd = Text.toCmdid(context.post.cmd);
			if (alias) {
				if (cmd) {
					if (App.parser.commandExists(cmd)) {
						App.parser.data.aliases[alias] = cmd;
						App.parser.saveData();
						App.logServerAction(context.user.id, "Set alias: " + alias + " to the command: " + cmd);
						ok = 'Command "' + Text.escapeHTML(alias) + '" is now alias of "' + Text.escapeHTML(cmd) +
							'" (Note: If the original command does not exists, the alias will be useless)';
					} else {
						error = "The command <strong>" + Text.escapeHTML(cmd) + "</strong> does not exists.";
					}
				} else {
					error = "You must specify a command";
				}
			} else {
				error = "You must specify an alias id.";
			}
		} else if (context.post.remove) {
			let alias = Text.toCmdid(context.post.alias);
			if (alias) {
				if (App.parser.data.aliases[alias]) {
					delete App.parser.data.aliases[alias];
					App.parser.saveData();
					App.logServerAction(context.user.id, "Delete alias: " + alias);
					ok = 'Alias <strong>' + Text.escapeHTML(alias) + '</strong> was deleted successfully.';
				} else {
					error = 'Alias <strong>' + Text.escapeHTML(alias) + '</strong> was not found.';
				}
			} else {
				error = "You must specify an alias id.";
			}
		}

		let htmlVars = Object.create(null);

		htmlVars.aliases = '';
		for (let alias in App.parser.data.aliases) {
			htmlVars.aliases += '<tr><td>' + Text.escapeHTML(alias) + '</td><td>' + Text.escapeHTML(App.parser.data.aliases[alias]) +
				'</td><td><div align="center"><form style="display:inline;" method="post" action="">' +
				'<input type="hidden" name="alias" value="' + Text.escapeHTML(alias) +
				'" /><input type="submit" name="remove" value="Remove Alias" /></form></div></td></tr>';
		}

		htmlVars.cmd_list = '';
		let cmds = App.parser.getCommadsArray().sort();
		for (let i = 0; i < cmds.length; i++) {
			htmlVars.cmd_list += '<option value="' + Text.escapeHTML(cmds[i]) + '">' + Text.escapeHTML(cmds[i]) + '</option>';
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += aliasesTemplate.make(htmlVars);
		context.endWithWebPage(html, { title: "Commands Aliases - Showdown ChatBot" });
	}

	function parserPermissionsHandler(context, html) {
		let ok = null, error = null;
		if (context.post.addroom) {
			let room = Text.toRoomid(context.post.room);
			if (!room || room === 'global-room') {
				error = 'You must specify a room.';
			} else {
				if (!App.parser.data.roompermissions[room]) {
					App.parser.data.roompermissions[room] = Object.create(null);
					App.parser.saveData();
					App.logServerAction(context.user.id, "Add custom perrmission room: " + room);
					ok = 'Room <strong>' + Text.escapeHTML(room) + '</strong> added to the custom permission configuration list.';
				} else {
					error = "Room <strong>" + Text.escapeHTML(room) + "</strong> already has custom configuration.";
				}
			}
		} else if (context.post.delroom) {
			let room = Text.toRoomid(context.post.room);
			if (!room) {
				error = 'You must specify a room.';
			} else {
				if (App.parser.data.roompermissions[room]) {
					delete App.parser.data.roompermissions[room];
					if (App.parser.data.roomTokensOverride[room]) {
						delete App.parser.data.roomTokensOverride[room];
					}
					App.parser.saveData();
					App.logServerAction(context.user.id, "Delete custom permission room: " + room);
					ok = 'Room <strong>' + Text.escapeHTML(room) + '</strong> removed from the custom permission configuration list.';
				} else {
					error = "Room <strong>" + Text.escapeHTML(room) + "</strong> not found.";
				}
			}
		} else if (context.post.editroom) {
			let room = Text.toRoomid(context.post.room);
			if (!room) {
				error = 'You must specify a room.';
			} else {
				let data;
				if (room === 'global-room') {
					data = App.parser.data.permissions;
				} else {
					if (!App.parser.data.roompermissions[room]) {
						App.parser.data.roompermissions[room] = Object.create(null);
					}
					data = App.parser.data.roompermissions[room];

					let roomTokensOverride = (context.post.tokens_override || "") + "";

					if (roomTokensOverride) {
						App.parser.data.roomTokensOverride[room] = roomTokensOverride;
					} else if (App.parser.data.roomTokensOverride[room]) {
						delete App.parser.data.roomTokensOverride[room];
					}
				}
				for (let i in App.parser.modPermissions) {
					let rank = context.post["perm-" + i];
					if (rank === 'user') {
						data[i] = 'user';
					} else if (App.config.parser.groups.indexOf(rank) >= 0) {
						data[i] = rank;
					} else {
						data[i] = 'excepted';
					}
				}
				App.parser.saveData();
				App.logServerAction(context.user.id, "Edit custom permission room: " + room);
				ok = 'Configuration for room <strong>' + Text.escapeHTML(room) + '</strong> was edited successfully.';
			}
		} else if (context.post.editexp) {
			let expcmds = [];
			let expusers = Object.createFromKeys((context.post.expusers || "").split(',').map(Text.toId).filter(u => u));
			let aux = (context.post.canexp || "").split('\n');
			for (let i = 0; i < aux.length; i++) {
				let line = aux[i].split(',');
				let perm = Text.toId(line[0]);
				let user = Text.toId(line[1]);
				let room = Text.toRoomid(line[2]);
				if (!perm || !user || !App.parser.modPermissions[perm]) continue;
				expcmds.push({ perm: perm, room: (room || null), user: user });
			}
			App.parser.data.exceptions = expusers;
			App.parser.data.canExceptions = expcmds;
			App.parser.saveData();
			App.logServerAction(context.user.id, "Edit Permission Exceptions");
			ok = 'Permission exceptions configuration edited successfully.';
		}

		let htmlVars = Object.create(null);

		htmlVars.expusers = Text.escapeHTML(Object.keys(App.parser.data.exceptions).join(', '));
		let exceptions = [];
		for (let i = 0; i < App.parser.data.canExceptions.length; i++) {
			exceptions.push(App.parser.data.canExceptions[i].perm + ", " +
				App.parser.data.canExceptions[i].user +
				(App.parser.data.canExceptions[i].room ? (", " + App.parser.data.canExceptions[i].room) : ""));
		}
		htmlVars.canexp = Text.escapeHTML(exceptions.join('\n'));

		htmlVars.global_chart = getPermissionChart('global-room', 'Global Configuration');
		htmlVars.rooms_charts = '';
		for (let r in App.parser.data.roompermissions) {
			htmlVars.rooms_charts += '<hr />';
			htmlVars.rooms_charts += getPermissionChart(r, 'Room: ' + r);
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += permissionsTemplate.make(htmlVars);
		context.endWithWebPage(html, { title: "Commands Permissions - Showdown ChatBot" });
	}

	function parserRoomControlHandler(context, html) {
		let ok = null, error = null;
		if (context.post.set) {
			let room = Text.toRoomid(context.post.room);
			let control = Text.toRoomid(context.post.control);
			if (room) {
				if (control) {
					App.parser.data.roomctrl[control] = room;
					App.parser.saveData();
					App.logServerAction(context.user.id, "Set control room: " + control + " for: " + room);
					ok = 'Control room "' + Text.escapeHTML(control) + '" was set for the room "' + Text.escapeHTML(room) + '.';
				} else {
					error = "You must specify a control room";
				}
			} else {
				error = "You must specify a target room.";
			}
		} else if (context.post.remove) {
			let control = Text.toRoomid(context.post.control);
			if (control) {
				if (App.parser.data.roomctrl[control]) {
					delete App.parser.data.roomctrl[control];
					App.parser.saveData();
					App.logServerAction(context.user.id, "Delete control room: " + control);
					ok = 'Control room <strong>' + Text.escapeHTML(control) + '</strong> was deleted successfully.';
				} else {
					error = 'Control room <strong>' + Text.escapeHTML(control) + '</strong> was not found.';
				}
			} else {
				error = "You must specify a control room.";
			}
		}

		let htmlVars = Object.create(null);

		htmlVars.rooms = '';
		for (let control in App.parser.data.roomctrl) {
			htmlVars.rooms += '<tr><td>' + Text.escapeHTML(control) + '</td><td>' + Text.escapeHTML(App.parser.data.roomctrl[control]) +
				'</td><td><div align="center"><form style="display:inline;" method="post" action=""><input type="hidden" name="control" value="' +
				control + '" /><input type="submit" name="remove" value="Remove Control Room" /></form></div></td></tr>';
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += roomControlTemplate.make(htmlVars);
		context.endWithWebPage(html, { title: "Control Rooms - Showdown ChatBot" });
	}

	function parserRoomAliasHandler(context, html) {
		let ok = null, error = null;
		if (context.post.set) {
			let room = Text.toRoomid(context.post.room);
			let alias = Text.toRoomid(context.post.alias);
			if (room) {
				if (alias) {
					App.parser.data.roomaliases[alias] = room;
					App.parser.saveData();
					App.logServerAction(context.user.id, "Set room alias: " + alias + " for: " + room);
					ok = 'Alias "' + Text.escapeHTML(alias) + '" was set for the room "' + Text.escapeHTML(room) + '.';
				} else {
					error = "You must specify an alias";
				}
			} else {
				error = "You must specify a target room.";
			}
		} else if (context.post.remove) {
			let alias = Text.toRoomid(context.post.alias);
			if (alias) {
				if (App.parser.data.roomaliases[alias]) {
					delete App.parser.data.roomaliases[alias];
					App.parser.saveData();
					App.logServerAction(context.user.id, "Delete room alias: " + alias);
					ok = 'Room alias <strong>' + Text.escapeHTML(alias) + '</strong> was deleted successfully.';
				} else {
					error = 'Room alias <strong>' + Text.escapeHTML(alias) + '</strong> was not found.';
				}
			} else {
				error = "You must specify an alias";
			}
		}

		let htmlVars = Object.create(null);

		htmlVars.rooms = '';
		for (let alias in App.parser.data.roomaliases) {
			htmlVars.rooms += '<tr><td>' + Text.escapeHTML(alias) + '</td><td>' + Text.escapeHTML(App.parser.data.roomaliases[alias]) +
				'</td><td><div align="center"><form style="display:inline;" method="post" action=""><input type="hidden" name="alias" value="' +
				Text.escapeHTML(alias) + '" /><input type="submit" name="remove" value="Remove Room Alias" /></form></div></td></tr>';
		}

		htmlVars.request_result = Text.escapeHTML(ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = Text.escapeHTML(ok ? ok : (error || ""));

		html += roomAliasesTemplate.make(htmlVars);
		context.endWithWebPage(html, { title: "Rooms Aliases - Showdown ChatBot" });
	}

	function parserAbuseMonitorHandler(context, html) {
		let ok = null, error = null;
		if (context.post.addlock) {
			let locked = Text.toId(context.post.locked);
			if (locked) {
				if (!App.parser.monitor.isLocked(locked)) {
					App.parser.monitor.lock(locked, "Locked via control panel");
					App.logServerAction(context.user.id, "PARSER LOCK: " + locked);
					ok = "User <strong>" + Text.escapeHTML(locked) + "<strong> was locked from using commands";
				} else {
					error = "Error: User already locked";
				}
			} else {
				error = "You must specify an user.";
			}
		} else if (context.post.unlock) {
			let locked = Text.toId(context.post.locked);
			if (locked) {
				if (App.parser.monitor.isLocked(locked)) {
					App.parser.monitor.unlock(locked);
					App.logServerAction(context.user.id, "PARSER UNLOCK: " + locked);
					ok = "User <strong>" + Text.escapeHTML(locked) + "<strong> was unlocked";
				} else {
					error = "Error: User not locked";
				}
			} else {
				error = "You must specify an user.";
			}
		}

		let htmlVars = Object.create(null);

		htmlVars.locklist = '';
		for (let locked in App.parser.monitor.locked) {
			htmlVars.locklist += '<tr><td>' + Text.escapeHTML(locked) + '</td>' + '<td><div align="center"><form style="display:inline;" method="post" action="">' +
				'<input type="hidden" name="locked" value="' + Text.escapeHTML(locked) +
				'" /><input type="submit" name="unlock" value="Unlock" /></form></div></td></tr>';
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += abuseMonitorTemplate.make(htmlVars);
		context.endWithWebPage(html, { title: "Control Rooms - Showdown ChatBot" });
	}

	/* Auxiliar Functions */
	function getPermissionChart(room, title) {
		let html = '';
		html += '<h3>' + Text.escapeHTML(title) + '</h3>';
		html += '<form method="post" action="">';
		html += '<input type="hidden" name="room" value="' + Text.escapeHTML(room) + '" />';

		if (room !== 'global-room') {
			html += '<p><strong>Command Tokens (override)</strong>:&nbsp;<input name="tokens_override" type="text" size="50" value="' + Text.escapeHTML(App.parser.data.roomTokensOverride[room] || '') + '" autocomplete="off" />&nbsp;(Separated by spaces)</p>';
		}

		html += '<table border="1">';
		html += '<tr><td width="200px"><div align="center"><strong>Permission</strong></div></td> ' +
			'<td width="200px"><div align="center"><strong>Min Rank Required </strong></div></td></tr>';
		for (let i in App.parser.modPermissions) {
			html += '<tr>';
			html += '<td>' + i + '</td>';
			let rank = App.parser.modPermissions[i].group ? App.parser.modPermissions[i].group : 'excepted';
			let permData;
			if (room === 'global-room') {
				permData = App.parser.data.permissions;
			} else {
				permData = App.parser.data.roompermissions[room] || {};
			}
			if (permData[i]) {
				rank = permData[i];
			} else if (App.parser.data.permissions[i]) {
				rank = App.parser.data.permissions[i];
			}
			if (rank.length > 1 && App.config.parser[rank]) {
				rank = App.config.parser[rank];
			}
			html += '<td>';
			html += '<select name="perm-' + Text.escapeHTML(i) + '">';
			html += '<option value="excepted"' + (rank === 'excepted' ? ' selected="selected"' : '') + '>Excepted Users</option>';
			html += '<option value="user"' + (rank === 'user' ? ' selected="selected"' : '') + '>Regular Users</option>';
			for (let j = 0; j < App.config.parser.groups.length; j++) {
				html += '<option value="' + Text.escapeHTML(App.config.parser.groups[j]) + '"' +
					(rank === App.config.parser.groups[j] ? ' selected="selected"' : '') + '>Group ' + Text.escapeHTML(App.config.parser.groups[j]) + '</option>';
			}
			html += '</select>';
			html += '</td>';
			html += '</tr>';
		}
		html += '</table>';
		html += '<p><label><input type="submit" name="editroom" value="Save Changes" /></label></p>';
		html += '</form>';
		if (room !== 'global-room') {
			html += '<p><button onclick="removeRoom(\'' + Text.escapeHTML(room) +
				'\');">Use Default Values</button>&nbsp;<span id="confirm-' + Text.escapeHTML(room) + '">&nbsp;</span></p>';
		}
		return html;
	}
};
