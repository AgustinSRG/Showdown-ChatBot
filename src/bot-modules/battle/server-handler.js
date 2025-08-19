/**
 * Server Handler: Tour Command
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const SubMenu = Tools('submenu');
const Template = Tools('html-template');

const configTemplate = new Template(Path.resolve(__dirname, 'templates', 'config.html'));
const teamsMainTemplate = new Template(Path.resolve(__dirname, 'templates', 'teams-main.html'));
const teamsItemTemplate = new Template(Path.resolve(__dirname, 'templates', 'teams-item.html'));

exports.setup = function (App) {
	const Config = App.config.modules.battle;

	/* Permissions */
	App.server.setPermission('battle', 'Permission for changing battle bot configuration');
	App.server.setPermission('teams', 'Permission for managing bot teams database');

	/* Menu Options */
	App.server.setMenuOption('battle', 'Battle&nbsp;Bot', '/battle/', 'battle', -1);
	App.server.setMenuOption('teams', 'Battle&nbsp;Teams', '/teams/', 'teams', -1);

	/* Handlers */
	App.server.setHandler('battle', (context, parts) => {
		if (!context.user || !context.user.can('battle')) {
			context.endWith403();
			return;
		}

		let submenu = new SubMenu("Battle&nbsp;Bot", parts, context, [
			{ id: 'config', title: 'Configuration', url: '/battle/', handler: battleConfigurationHandler },
			{ id: 'algo', title: 'Battle&nbsp;Algorithms', url: '/battle/algo/', handler: battleAlgorithmsHandler },
			{ id: 'chall', title: 'Challenge', url: '/battle/chall/', handler: battleChallengeHandler },
			{ id: 'ladder', title: 'Ladder', url: '/battle/ladder/', handler: battleLadderHandler },
		], 'config');

		return submenu.run();
	});

	function battleConfigurationHandler(context, html) {
		let ok = null, error = null;
		if (context.post.edit) {
			let maxBattles = parseInt(context.post.maxbattles);
			let ladderBattles = parseInt(context.post.maxladder);
			let maxTurns = parseInt(context.post.maxturns);
			try {
				check(!isNaN(maxBattles) && maxBattles >= 0, "Invalid max battles value");
				check(!isNaN(ladderBattles) && ladderBattles > 0, "Invalid max ladder battles value");
				check(!isNaN(maxTurns) && maxTurns >= 0, "Invalid max turns value");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				Config.maxBattles = maxBattles;
				Config.ignoreAbandonedbattles = !context.post.joinabandoned;
				Config.turnTimerOn = !!context.post.timeron;
				Config.maxTurns = maxTurns;
				Config.ladderBattles = ladderBattles;
				let joinTours = (context.post.jointours || "").split(',');
				let aux = Object.create(null);
				for (let i = 0; i < joinTours.length; i++) {
					let room = Text.toRoomid(joinTours[i]);
					if (room) {
						aux[room] = true;
					}
				}
				let msgFilter = function (msg) {
					return (msg.trim().length > 0);
				};
				Config.joinTours = aux;
				Config.initBattleMsg = (context.post.initmsg || "").split('\n').filter(msgFilter);
				Config.winmsg = (context.post.winmsg || "").split('\n').filter(msgFilter);
				Config.losemsg = (context.post.losemsg || "").split('\n').filter(msgFilter);

				Config.otherMessages["crit-self"] = (context.post.critmsg || "").split('\n').filter(msgFilter);
				Config.otherMessages["crit-foe"] = (context.post.critfoemsg || "").split('\n').filter(msgFilter);

				Config.otherMessages["miss-self"] = (context.post.missmsg || "").split('\n').filter(msgFilter);
				Config.otherMessages["miss-foe"] = (context.post.missfoemsg || "").split('\n').filter(msgFilter);

				Config.otherMessages["faint-self"] = (context.post.faintmsg || "").split('\n').filter(msgFilter);
				Config.otherMessages["faint-foe"] = (context.post.faintfoemsg || "").split('\n').filter(msgFilter);

				App.db.write();
				App.logServerAction(context.user.id, "Edit battle bot configuration");
				ok = 'Battle bot configuration saved';
			}
		}

		let htmlVars = Object.create(null);

		htmlVars.maxbattles = Text.escapeHTML(Config.maxBattles);
		htmlVars.maxladder = Text.escapeHTML(Config.ladderBattles);
		htmlVars.maxturns = Text.escapeHTML(Config.maxTurns || 0);
		htmlVars.jointours = Object.keys(Config.joinTours).join(', ');
		htmlVars.join_abandoned = (!Config.ignoreAbandonedbattles ? "checked=\"checked\"" : "");
		htmlVars.timer_on = (Config.turnTimerOn === false ? "" : "checked=\"checked\"");
		htmlVars.initmsg = Text.escapeHTML(Config.initBattleMsg.join('\n'));
		htmlVars.winmsg = Text.escapeHTML(Config.winmsg.join('\n'));
		htmlVars.losemsg = Text.escapeHTML(Config.losemsg.join('\n'));

		htmlVars.critmsg = Text.escapeHTML((Config.otherMessages["crit-self"] || []).join('\n'));
		htmlVars.critfoemsg = Text.escapeHTML((Config.otherMessages["crit-foe"] || []).join('\n'));

		htmlVars.missmsg = Text.escapeHTML((Config.otherMessages["miss-self"] || []).join('\n'));
		htmlVars.missfoemsg = Text.escapeHTML((Config.otherMessages["miss-foe"] || []).join('\n'));

		htmlVars.faintmsg = Text.escapeHTML((Config.otherMessages["faint-self"] || []).join('\n'));
		htmlVars.faintfoemsg = Text.escapeHTML((Config.otherMessages["faint-foe"] || []).join('\n'));

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += configTemplate.make(htmlVars);
		context.endWithWebPage(html, { title: "Battle Bot - Showdown ChatBot" });
	}

	function battleAlgorithmsHandler(context, html) {
		let ok = null, error = null;

		if (context.post.edit) {
			let newData = Object.create(null);
			for (let f in App.bot.formats) {
				let chosen = context.post[f];
				if (chosen && chosen !== "default") {
					newData[f] = chosen;
				}
			}

			if (!error) {
				Config.battlemods = newData;
				App.db.write();
				App.logServerAction(context.user.id, "Edit battle algorithms configuration");
				ok = 'Battle algorithms configuration saved';
			}
		}

		html += '<form method="post" action=""><table>';
		html += '<tr><td width="300"><div align="center"><strong>Format</strong></div></td>' +
			'<td width="200"><div align="center"><strong>Battle Algorithm</strong></div></td></tr>';
		for (let f in App.bot.formats) {
			html += '<tr>';
			html += '<td>' + Text.escapeHTML(App.bot.formats[f].name) + '</td>';
			html += '<td>' + getAlgoMenu(f, Config.battlemods[f]) + '</td>';
			html += '</tr>';
		}
		html += '</table>';

		html += '<p><input type="submit" name="edit" value="Save Changes" /></p></form>';

		if (error) {
			html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
		} else if (ok) {
			html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
		}

		context.endWithWebPage(html, { title: "Battle Algorithm - Showdown ChatBot" });
	}

	function battleChallengeHandler(context, html) {
		let mod = App.modules.battle.system;
		let ok = null, error = null;
		if (context.post.sendchall) {
			let user = Text.toId(context.post.showdownname);
			let format = Text.toId(context.post.format);
			let team = Text.toId(context.post.team);
			try {
				check(!mod.ChallManager.challenges || !mod.ChallManager.challenges.challengeTo, "There is a pending challenge request");
				check(user, "You must specify an user to send the challenge");
				check(App.bot.formats[format] && App.bot.formats[format].chall, "Format " + Text.escapeHTML(format) + " is not available for challenges");
				check(team || !App.bot.formats[format].team || mod.TeamBuilder.hasTeam(format), "No teams available for " + Text.escapeHTML(format));
				check(!team || mod.TeamBuilder.dynTeams[team], "Team " + Text.escapeHTML(team) + " not found");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				let cmds = [];
				if (team) {
					cmds.push('|/utm ' + mod.TeamBuilder.dynTeams[team].packed);
				} else {
					let randTeam = mod.TeamBuilder.getTeam(format);
					if (randTeam) {
						cmds.push('|/utm ' + randTeam);
					} else {
						cmds.push('|/utm null');
					}
				}
				cmds.push('|/challenge ' + user + ", " + format);
				App.bot.send(cmds);
				App.logServerAction(context.user.id, "Send Challenge: " + user + " | " + format + " | " + (team || "-"));
				ok = "Challenge request sent to " + Text.escapeHTML(user);
			}
		} else if (context.post.cancelchall) {
			if (mod.ChallManager.challenges && mod.ChallManager.challenges.challengeTo) {
				App.bot.send('|/cancelchallenge ' + mod.ChallManager.challenges.challengeTo.to);
				App.logServerAction(context.user.id, "Cancel Challenge");
				ok = 'Challenge Canceled';
			} else {
				error = "No challenges found.";
			}
		}

		html += '<form method="post" action="">';
		if (mod.ChallManager.challenges && mod.ChallManager.challenges.challengeTo && !context.post.cancelchall) {
			let format = mod.ChallManager.challenges.challengeTo.format;
			if (App.bot.formats[format]) format = App.bot.formats[format].name;
			html += '<p><strong>Challenging ' + mod.ChallManager.challenges.challengeTo.to + ' in format ' + format + '</strong></p>';
			html += '<p><input type="submit" name="cancelchall" value="Cancel Challenge" /></p>';
		} else {
			html += '<p><strong>User</strong>:&nbsp;<input name="showdownname" type="text" style="width: 100%; max-width: 30ch;" value="" /></p>';
			html += '<p><strong>Format</strong>:&nbsp;' + getLadderFormatsMenu() + '</p>';
			html += '<p><strong>Team</strong>:&nbsp;' + getTeamsMenu() + '</p>';
			html += '<p><input type="submit" name="sendchall" value="Send Challenge" /></p>';
		}
		html += '</form>';

		if (error) {
			html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
		} else if (ok) {
			html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
		}

		context.endWithWebPage(html, { title: "Battle Bot - Showdown ChatBot" });
	}

	function battleLadderHandler(context, html) {
		let mod = App.modules.battle.system;
		let ok = null, error = null;
		if (context.post.startladder) {
			let formats = (context.post.formats || "").split(",").map(Text.toId).filter(f => !!f);
			try {
				check(formats.length > 0, "You must specify at least one format");

				const formatSet = new Set();

				for (let format of formats) {
					check(!formatSet.has(format), "Repeated Format: " + Text.escapeHTML(format));
					check(App.bot.formats[format] && App.bot.formats[format].ladder, "Invalid Format: " + Text.escapeHTML(format));
					check(!App.bot.formats[format].team || mod.TeamBuilder.hasTeam(format), "No available teams for " + Text.escapeHTML(format));
					formatSet.add(format);
				}
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				Config.laddering = formats;
				App.db.write();

				mod.LadderManager.update();
				App.logServerAction(context.user.id, "Start Laddering. Formats: " + formats.join(", "));
				ok = 'Laddering in formats: ' + formats.map(format => Text.escapeHTML(App.bot.formats[format].name)).join(", ");
			}
		} else if (context.post.stopladder) {
			Config.laddering = [];
			App.db.write();
			mod.LadderManager.update();
			App.logServerAction(context.user.id, "Stop Laddering");
			ok = 'Stopped laddering';
		}

		html += '<script>';
		html += 'function addFormatToList() {';
		html += 'var formatToAdd = document.getElementById("format-to-add").value || "";';
		html += 'if (!formatToAdd) {return;}';
		html += 'var formats = (document.getElementById("ladder-list-formats").value || "").split(",").map(f => f.toLowerCase().replace(/[^a-z0-9]/g, "")).filter(f => !!f);';
		html += 'if (formats.includes(formatToAdd)) {return;}';
		html += 'formats.push(formatToAdd);';
		html += 'document.getElementById("ladder-list-formats").value = formats.join(", ");';
		html += '}';
		html += '</script>';

		html += '<form method="post" action="">';
		if (Config.laddering && Config.laddering.length > 0) {
			let formats = Config.laddering || [];
			html += '<p><strong>Laddering in formats: ' + formats.map(format => Text.escapeHTML(App.bot.formats[format] ? App.bot.formats[format].name : format)).join(", ") + '</strong></p>';
			html += '<p><input type="submit" name="stopladder" value="Stop Laddering" /></p>';
		} else {
			html += '<p><strong>Formats</strong>:&nbsp;<input id="ladder-list-formats" name="formats" type="text" style="width: 100%; max-width: 60ch;" /> (Separated by commas)</p>';
			html += '<p>' + getLadderFormatsMenu() + '&nbsp;<button type="button" onclick="addFormatToList()">Add format</button></p>';
			html += '<p><input type="submit" name="startladder" value="Start Laddering" /></p>';
		}
		html += '</form>';

		if (error) {
			html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
		} else if (ok) {
			html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
		}

		context.endWithWebPage(html, { title: "Battle Bot - Showdown ChatBot" });
	}

	App.server.setHandler('teams', (context, parts) => {
		if (!context.user || !context.user.can('teams')) {
			context.endWith403();
			return;
		}

		if (parts[0] === 'get') {
			return serveTeam(context, parts);
		}

		let mod = App.modules.battle.system;
		const Teams = mod.TeamBuilder.tools;

		let ok = null, error = null;
		if (context.post.delteam) {
			let id = Text.toId(context.post.id);
			if (id && mod.TeamBuilder.dynTeams[id]) {
				delete mod.TeamBuilder.dynTeams[id];
				mod.TeamBuilder.saveTeams();
				mod.TeamBuilder.mergeTeams();
				App.logServerAction(context.user.id, "Delete Team: " + id);
				ok = 'Team <strong>' + Text.escapeHTML(id) + '</strong> deleted successfully';
			} else {
				error = "Team not found";
			}
		} else if (context.post.add) {
			let exportable = (context.post.exportable || "");
			//console.log("EXPORTABLE = " + exportable);
			let format = Text.toId(context.post.format);
			let name = (context.post.id || "") + "";
			let id = Text.toId(context.post.id);
			let packed = '';
			try {
				check(id, "You must specify an id");
				check(exportable, "Team cannot be blank");
				check(format, "You must specify a format");
				check(Object.keys(App.bot.formats).length === 0 || App.bot.formats[format], "Invalid Format");
				let team = Teams.teamToJSON(exportable);
				//console.log("JSON = " + JSON.stringify(team));
				packed = Teams.packTeam(team);
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				mod.TeamBuilder.dynTeams[id] = {
					name: name,
					format: format,
					packed: packed,
				};
				mod.TeamBuilder.saveTeams();
				mod.TeamBuilder.mergeTeams();
				App.logServerAction(context.user.id, "Add Team: " + id);
				ok = 'Team <strong>' + Text.escapeHTML(id) + '</strong> added successfully';
			}
		}

		let htmlVars = Object.create(null);

		htmlVars.exportable = Text.escapeHTML(context.post.exportable || "");
		htmlVars.formats = getFormatsMenu(Text.toId(context.get.format));

		let submenu = [];
		let formats = Object.create(null);
		let selectedFormat = Text.toId(context.get.format);
		submenu.push('<a class="submenu-option' + (!selectedFormat ? '-selected' : '') + '" href="./">All&nbsp;Teams</a>');
		htmlVars.teams = '';
		let teams = mod.TeamBuilder.dynTeams;
		for (let id of Object.keys(teams)) {
			let formatName = teams[id].format;
			if (App.bot.formats[formatName]) formatName = App.bot.formats[formatName].name;
			if (!formats[teams[id].format]) {
				formats[teams[id].format] = true;
			}
			if (selectedFormat && selectedFormat !== teams[id].format) continue;
			htmlVars.teams += teamsItemTemplate.make({
				id: Text.escapeHTML(id),
				name: Text.escapeHTML(teams[id].name || id),
				format: Text.escapeHTML(formatName),
				pokemon: Text.escapeHTML(Teams.teamOverview(teams[id].packed)),
			});
		}

		const sortedFormats = Object.keys(formats).sort();

		for (let format of sortedFormats) {
			let formatName = format;
			if (App.bot.formats[formatName]) formatName = App.bot.formats[formatName].name;
			submenu.push('<a class="submenu-option' + (selectedFormat === format ? '-selected' : '') +
				'" href="./?format=' + format + '">' + formatName + '</a>');
		}

		if (!htmlVars.teams) {
			htmlVars.teams = "<p><i>(No battle teams)</i></p>";
		}

		htmlVars.menu = submenu.join('&nbsp;| ');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(teamsMainTemplate.make(htmlVars), { title: "Bot Teams - Showdown ChatBot" });
	});

	/* Auxiliar functions */
	function getLadderFormatsMenu() {
		let formats = [];
		for (let f in App.bot.formats) {
			if (!App.bot.formats[f].ladder) continue;
			formats.push('<option value="' + f + '">' + App.bot.formats[f].name + '</option>');
		}
		if (formats.length > 0) {
			return ('<select id="format-to-add" name="format">' + formats.join() + '</select>');
		} else {
			return '<input name="format" type="text" style="width: 100%; max-width: 40ch;" value="" />';
		}
	}

	function getFormatsMenu(selected) {
		const formats = [];
		const sortedFormatsList = Object.keys(App.bot.formats).sort();
		for (let f of sortedFormatsList) {
			formats.push('<option value="' + f + '"' + (selected === f ? 'selected="selected"' : '') +
				'>' + App.bot.formats[f].name + '</option>');
		}
		if (formats.length > 0) {
			return ('<select name="format">' + formats.join() + '</select>');
		} else {
			return '<input name="format" type="text" style="width: 100%; max-width: 40ch;" value="' + (selected || "") + '" />';
		}
	}

	function getAlgoMenu(format, selected) {
		let opts = {
			"default": "Use Default",
			"random": "Random Decision",
			"randommove": "Random moves, no unnecessary switches",
			"randommovenodyna": "Random moves, no unnecessary switches, no dynamax",
			"randomsw": "Random switches, no unnecessary moves",
			"ingame-nostatus": "Go for the highest damage / No swithes (Standard)",
			"singles-eff": "Improvement with status moves and switches (only for singles)",
			"free-for-all-simple": "Free-for-all (Go for the highest damage)",
			"free-for-all-complex": "Free-for-all (Pseudorandom)",
			"multi-simple": "Multiples (Go for the highest damage)",
		};
		let tags = [];
		for (let opt in opts) {
			tags.push('<option value="' + opt + '"' + (selected === opt ? 'selected="selected"' : '') +
				'>' + opts[opt] + '</option>');
		}
		return ('<select name="' + format + '">' + tags.join() + '</select>');
	}

	function getTeamsMenu() {
		let teams = App.modules.battle.system.TeamBuilder.dynTeams;
		let teamOptions = [];
		teamOptions.push('<option value="">Random Team</option>');
		for (let id in teams) {
			let formatName = teams[id].format;
			if (App.bot.formats[formatName]) formatName = App.bot.formats[formatName].name;
			teamOptions.push('<option value="' + id + '">' + id + ' - ' + formatName + '</option>');
		}
		if (teamOptions.length > 0) {
			return ('<select name="team">' + teamOptions.join() + '</select>');
		} else {
			return '<i>No available Teams</i>';
		}
	}

	function serveTeam(context, parts) {
		let mod = App.modules.battle.system;
		const Teams = mod.TeamBuilder.tools;
		let teams = mod.TeamBuilder.dynTeams;
		let team = Text.toId(parts[1]);
		if (team && teams[team]) {
			context.endWithText(Teams.exportTeam(teams[team].packed));
		} else {
			context.endWithError('404', 'File not found', 'The team you requested was not found!');
		}
	}
};
