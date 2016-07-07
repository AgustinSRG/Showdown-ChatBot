/**
 * Server Handler: Tour Command
 */

'use strict';

const Text = Tools.get('text.js');
const check = Tools.get('check.js');
const Teams = Tools.get('teams.js');

const Config = App.config.modules.battle;

/* Permissions */

App.server.setPermission('battle', 'Permission for changing battle bot configuration');
App.server.setPermission('teams', 'Permission for managing bot teams database');

/* Menu Options */

App.server.setMenuOption('battle', 'Battle Bot', '/battle/', 'battle');
App.server.setMenuOption('teams', 'Bot Teams', '/teams/', 'teams');

/* Handlers */

App.server.setHandler('battle', (context, parts) => {
	/* Permission check */
	if (!context.user || !context.user.can('battle')) {
		context.endWith403();
		return;
	}
	let mod = App.modules.battle.system;

	/* Actions */
	let ok = null, error = null;
	if (context.post.edit) {
		let maxBattles = parseInt(context.post.maxbattles);
		let ladderBattles = parseInt(context.post.maxladder);
		try {
			check(!isNaN(maxBattles) && maxBattles >= 0, "Invalid max battles value");
			check(!isNaN(ladderBattles) && ladderBattles > 0, "Invalid max ladder battles value");
		} catch (err) {
			error = err.message;
		}

		if (!error) {
			Config.maxBattles = maxBattles;
			Config.ladderBattles = ladderBattles;
			let joinTours = (context.post.jointours || "").split(',');
			let aux = {};
			for (let i = 0; i < joinTours.length; i++) {
				let room = Text.toRoomid(joinTours[i]);
				if (room) {
					aux[room] = true;
				}
			}
			Config.joinTours = aux;
			Config.initBattleMsg = (context.post.initmsg || "").split('\n');
			Config.winmsg = (context.post.winmsg || "").split('\n');
			Config.losemsg = (context.post.losemsg || "").split('\n');
			App.db.write();
			App.logServerAction(context.user.id, "Edit battle bot configuration");
			ok = 'Battle bot configuration saved';
		}
	} else if (context.post.startladder) {
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

	/* Generate Html */
	let html = '';

	html += '<h2>Battle Bot</h2>';

	html += '<form method="post" action="">';
	html += '<p><strong>Max number of battles of regular users</strong>:&nbsp;<input name="maxbattles" type="text" size="10" value="' +
		Config.maxBattles + '" /></p>';
	html += '<p><strong>Max number of ladder battles</strong>:&nbsp;<input name="maxladder" type="text" size="10" value="' +
		Config.ladderBattles + '" /></p>';
	html += '<p><strong>Rooms to join tournaments</strong>:&nbsp;<input name="jointours" type="text" size="50" value="' +
		Object.keys(Config.joinTours).join(', ') + '" /> (separated by commas)</p>';
	html += '<p><strong>Battle Initial Messages</strong>:</p><p><textarea name="initmsg" cols="60" rows="3">' +
		Config.initBattleMsg.join('\n') + '</textarea></p>';
	html += '<p><strong>Win Messages</strong>:</p><p><textarea name="winmsg" cols="60" rows="3">' +
		Config.winmsg.join('\n') + '</textarea></p>';
	html += '<p><strong>Lose Messages</strong>:</p><p><textarea name="losemsg" cols="60" rows="3">' +
		Config.losemsg.join('\n') + '</textarea></p>';
	html += '<p><input type="submit" name="edit" value="Save Changes" /></p>';
	html += '</form>';

	html += '<hr />';

	html += '<form method="post" action="">';
	if (mod.LadderManager.laddering) {
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
});

App.server.setHandler('teams', (context, parts) => {
	/* Permission check */
	if (!context.user || !context.user.can('teams')) {
		context.endWith403();
		return;
	}

	if (parts[0] === 'get') {
		return serveTeam(context, parts);
	}

	let mod = App.modules.battle.system;

	/* Actions */
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
		let format = Text.toId(context.post.format);
		let id = Text.toId(context.post.id);
		let packed = '';
		try {
			check(id, "You must specify an id");
			check(!mod.TeamBuilder.dynTeams[id], "Team already exists");
			check(exportable, "Team cannot be blank");
			check(format, "You must specify a format");
			check(App.bot.formats[format], "Invalid Format");
			let team = Teams.teamToJSON(exportable);
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

	/* Generate Html */
	let html = '';

	html += '<script type="text/javascript">function removeTeam(team) {var elem = document.getElementById(\'confirm-\' + team);' +
		'if (elem) {elem.innerHTML = \'<form style="display:inline;" method="post" action="">' +
		'<input type="hidden" name="id" value="\' + team + \'" />Are you sure?&nbsp;' +
		'<input type="submit" name="delteam" value="Delete Team" /></form>\';}return false;}</script>';

	html += '<h2>Bot Teams</h2>';

	let teams = mod.TeamBuilder.dynTeams;
	for (let id in teams) {
		html += '<table border="1">';
		html += '<tr><td width="150"><strong>Id</strong></td><td width="550">' + id + '</td></tr>';
		let formatName = teams[id].format;
		if (App.bot.formats[formatName]) formatName = App.bot.formats[formatName].name;
		html += '<tr><td><strong>Format</strong></td><td>' + Text.escapeHTML(formatName) + '</td></tr>';
		html += '<tr><td><strong>Pokemon</strong></td><td>' + Teams.teamOverview(teams[id].packed) + '</td></tr>';
		html += '<tr><td colspan="2"><a href="/teams/get/' + id + '/exportable/" target="_blank"><button>Get Exportable Team</button></a></td></tr>';
		html += '<tr><td colspan="2">';
		html += '<button onclick="removeTeam(\'' + id + '\');">Delete</button>&nbsp;<span id="confirm-' + id + '">&nbsp;</span>';
		html += '</td></tr>';
		html += '</table>';
		html += '<br /><br />';
	}

	html += '<hr />';

	html += '<form method="post" action="">';
	html += '<p><strong>Id</strong>:&nbsp;<input name="id" type="text" size="40" /></p>';
	html += '<p><strong>Format</strong>:&nbsp;' + getFormatsMenu() + '</p>';
	html += '<p><strong>Exportable</strong>:</p>';
	html += '<p><textarea name="exportable" cols="100" rows="5"></textarea></p>';
	html += '<p><input type="submit" name="add" value="Add New Team" /></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Bot Teams - Showdown ChatBot"});
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

function getFormatsMenu() {
	let formats = [];
	for (let f in App.bot.formats) {
		formats.push('<option value="' + f + '">' + App.bot.formats[f].name + '</option>');
	}
	if (formats.length > 0) {
		return ('<select name="format">' + formats.join() + '</select>');
	} else {
		return '<input name="format" type="text" size="40" value="" />';
	}
}

function serveTeam(context, parts) {
	let mod = App.modules.battle.system;
	let teams = mod.TeamBuilder.dynTeams;
	let team = Text.toId(parts[1]);
	if (team && teams[team]) {
		context.endWithText(Teams.exportTeam(teams[team].packed));
	} else {
		context.endWithError('404', 'File not found', 'The team you requested was not found!');
	}
}
