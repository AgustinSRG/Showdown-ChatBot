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
			{id: 'config', title: 'Configuration', url: '/battle/', handler: battleConfigurationHandler},
			{id: 'algo', title: 'Battle&nbsp;Algorithms', url: '/battle/algo/', handler: battleAlgorithmsHandler},
			{id: 'chall', title: 'Challenge', url: '/battle/chall/', handler: battleChallengeHandler},
			{id: 'ladder', title: 'Ladder', url: '/battle/ladder/', handler: battleLadderHandler},
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
				Config.maxTurns = maxTurns;
				Config.ladderBattles = ladderBattles;
				let joinTours = (context.post.jointours || "").split(',');
				let aux = {};
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
				App.db.write();
				App.logServerAction(context.user.id, "Edit battle bot configuration");
				ok = 'Battle bot configuration saved';
			}
		}

		let htmlVars = {};

		htmlVars.maxbattles = Config.maxBattles;
		htmlVars.maxladder = Config.ladderBattles;
		htmlVars.maxturns = Config.maxTurns || 0;
		htmlVars.jointours = Object.keys(Config.joinTours).join(', ');
		htmlVars.join_abandoned = (!Config.ignoreAbandonedbattles ? "checked=\"checked\"" : "");
		htmlVars.initmsg = Config.initBattleMsg.join('\n');
		htmlVars.winmsg = Config.winmsg.join('\n');
		htmlVars.losemsg = Config.losemsg.join('\n');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += configTemplate.make(htmlVars);
		context.endWithWebPage(html, {title: "Battle Bot - Showdown ChatBot"});
	}

	function battleAlgorithmsHandler(context, html) {
		let ok = null, error = null;

		if (context.post.edit) {
			let newData = {};
			for (let f in App.bot.formats) {
				let chosen = context.post[f];
				if (chosen && chosen !== "default") {
					try {
						check(chosen in {"random": 1, "randommove": 1, "randomsw": 1, "ingame-nostatus": 1, "singles-eff": 1, "randommovenodyna": 1},
							"Invalid algorithm: " + chosen);
					} catch (err) {
						error = err.message;
						break;
					}
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

		context.endWithWebPage(html, {title: "Battle Algorithm - Showdown ChatBot"});
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
				check(App.bot.formats[format] && App.bot.formats[format].chall, "Format " + format + " is not available for challenges");
				check(team || !App.bot.formats[format].team || mod.TeamBuilder.hasTeam(format), "No teams available for " + format);
				check(!team || mod.TeamBuilder.dynTeams[team], "Team " + team + " not found");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				let cmds = [];
				if (team) {
					cmds.push('|/useteam ' + mod.TeamBuilder.dynTeams[team].packed);
				} else {
					let randTeam = mod.TeamBuilder.getTeam(format);
					if (randTeam) {
						cmds.push('|/useteam ' + randTeam);
					}
				}
				cmds.push('|/challenge ' + user + ", " + format);
				App.bot.send(cmds);
				App.logServerAction(context.user.id, "Send Challenge: " + user + " | " + format + " | " + (team || "-"));
				ok = "Challenge request sent to " + user;
			}
		} else if (context.post.cancelchall) {
			if (mod.ChallManager.challenges && mod.ChallManager.challenges.challengeTo) {
				App.bot.send('|/cancelchallenge ' + mod.ChallManager.challenges.challengeTo.to);
				App.logServerAction(context.user.id, "Cancel Callenge");
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
			html += '<p><strong>User</strong>:&nbsp;<input name="showdownname" type="text" size="30" value="" /></p>';
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

		context.endWithWebPage(html, {title: "Battle Bot - Showdown ChatBot"});
	}

	function battleLadderHandler(context, html) {
		let mod = App.modules.battle.system;
		let ok = null, error = null;
		if (context.post.startladder) {
			let seconds = parseInt(context.post.interval);
			let format = Text.toId(context.post.format);
			try {
				check(!mod.LadderManager.laddering, "Already laddering");
				check(format, "You must specify a format");
				check(App.bot.formats[format] && App.bot.formats[format].ladder, "Invalid Format");
				check(!App.bot.formats[format].team || mod.TeamBuilder.hasTeam(format), "No available teams for " + format);
				check(!isNaN(seconds) && seconds > 0, "Invalid interval");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				mod.LadderManager.start(format, seconds * 1000);
				App.logServerAction(context.user.id, "Start Laddering. Format: " + format + ", interval: " + seconds);
				ok = 'Laddering in format: ' + App.bot.formats[format].name;
			}
		} else if (context.post.stopladder) {
			try {
				check(mod.LadderManager.laddering, "Not laddering");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				mod.LadderManager.stop();
				App.logServerAction(context.user.id, "Stop Laddering");
				ok = 'Stopped laddering';
			}
		}

		html += '<form method="post" action="">';
		if (mod.LadderManager.laddering) {
			let format = mod.LadderManager.format;
			if (App.bot.formats[format]) format = App.bot.formats[format].name;
			html += '<p><strong>Laddering in format ' + format + '</strong></p>';
			html += '<p><input type="submit" name="stopladder" value="Stop Laddering" /></p>';
		} else {
			html += '<p><strong>Format</strong>:&nbsp;' + getLadderFormatsMenu() + '</p>';
			html += '<p><strong>Search Interval (seconds)</strong>:&nbsp;' +
			'<input name="interval" type="text" size="10" value="10" /></p>';
			html += '<p><input type="submit" name="startladder" value="Start Laddering" /></p>';
		}
		html += '</form>';

		if (error) {
			html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
		} else if (ok) {
			html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
		}

		context.endWithWebPage(html, {title: "Battle Bot - Showdown ChatBot"});
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
				ok = 'Team <strong>' + id + '</strong> deleted sucessfully';
			} else {
				error = "Team not found";
			}
		} else if (context.post.add) {
			let exportable = (context.post.exportable || "");
			//console.log("EXPORTABLE = " + exportable);
			let format = Text.toId(context.post.format);
			let id = Text.toId(context.post.id);
			let packed = '';
			try {
				check(id, "You must specify an id");
				check(!mod.TeamBuilder.dynTeams[id], "Team already exists");
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
					format: format,
					packed: packed,
				};
				mod.TeamBuilder.saveTeams();
				mod.TeamBuilder.mergeTeams();
				App.logServerAction(context.user.id, "Add Team: " + id);
				ok = 'Team <strong>' + id + '</strong> added sucessfully';
			}
		}

		let htmlVars = {};

		htmlVars.exportable = (context.post.exportable || "");
		htmlVars.formats = getFormatsMenu(Text.toId(context.get.format));

		let submenu = [];
		let formats = {};
		let selectedFormat = Text.toId(context.get.format);
		submenu.push('<a class="submenu-option' + (!selectedFormat ? '-selected' : '') + '" href="./">All&nbsp;Teams</a>');
		htmlVars.teams = '';
		let teams = mod.TeamBuilder.dynTeams;
		for (let id in teams) {
			let formatName = teams[id].format;
			if (App.bot.formats[formatName]) formatName = App.bot.formats[formatName].name;
			if (!formats[teams[id].format]) {
				formats[teams[id].format] = true;
				submenu.push('<a class="submenu-option' + (selectedFormat === teams[id].format ? '-selected' : '') +
				'" href="./?format=' + teams[id].format + '">' + formatName + '</a>');
			}
			if (selectedFormat && selectedFormat !== teams[id].format) continue;
			htmlVars.teams += teamsItemTemplate.make({
				id: id,
				format: Text.escapeHTML(formatName),
				pokemon: Teams.teamOverview(teams[id].packed),
			});
		}

		if (!htmlVars.teams) {
			htmlVars.teams = "<p><i>(No battle teams)</i></p>";
		}

		htmlVars.menu = submenu.join('&nbsp;| ');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(teamsMainTemplate.make(htmlVars), {title: "Bot Teams - Showdown ChatBot"});
	});

	/* Auxiliar functions */
	function getLadderFormatsMenu() {
		let formats = [];
		for (let f in App.bot.formats) {
			if (!App.bot.formats[f].ladder) continue;
			formats.push('<option value="' + f + '">' + App.bot.formats[f].name + '</option>');
		}
		if (formats.length > 0) {
			return ('<select name="format">' + formats.join() + '</select>');
		} else {
			return '<input name="format" type="text" size="40" value="" />';
		}
	}

	function getFormatsMenu(selected) {
		let formats = [];
		for (let f in App.bot.formats) {
			formats.push('<option value="' + f + '"' + (selected === f ? 'selected="selected"' : '') +
				'>' + App.bot.formats[f].name + '</option>');
		}
		if (formats.length > 0) {
			return ('<select name="format">' + formats.join() + '</select>');
		} else {
			return '<input name="format" type="text" size="40" value="' + (selected || "") + '" />';
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
