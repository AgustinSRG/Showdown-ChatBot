/**
 * Team management commands
 *
 * addteam: Adds a team
 * deleteteam: Deletes a team
 * getteam: Gets a team (by name)
 * listteams: List teams of a format
 * listallteams: List all teams
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Chat = Tools('chat');
const HtmlMaker = Tools('html-maker');
const HTTPS = require('https');

const Lang_File = Path.resolve(__dirname, 'commands-teams.translations');

function parseAliases(format, App) {
	if (!format) return '';
	format = Text.toId(format);
	if (App.bot.formats[format]) return format;
	for (let gen = 9; gen > 0; gen--) {
		if (App.bot.formats["gen" + gen + format]) return "gen" + gen + format;
	}
	try {
		let psAliases = App.data.getAliases();
		if (psAliases[format]) format = Text.toId(psAliases[format]);
	} catch (e) { }
	if (App.bot.formats[format]) return format;
	return Text.toFormatStandard(format);
}

function wget(url, callback) {
	HTTPS.get(url, response => {
		if (response.statusCode !== 200) {
			if (response.statusCode === 404) {
				return callback(null, new Error("404 - Not found"));
			} else {
				return callback(null, new Error("" + response.statusCode));
			}
		}
		let data = '';
		response.on('data', chunk => {
			data += chunk;
		});
		response.on('end', () => {
			callback(data);
		});
		response.on('error', err => {
			callback(null, err);
		});
	}).on('error', err => {
		callback(null, err);
	});
}

function parseTeamLinkPokePast(link) {
	let linkRegex = /^https:\/\/pokepast\.es\/([a-f0-9]+)/;
	let linkRes = linkRegex.exec(link);

	if (!linkRes) {
		return null;
	}

	return {
		service: "pokepast",
		id: linkRes[1],
	};
}

function parseTeamLinkPokemonShowdown(link) {
	let linkRegex1 = /^https:\/\/psim\.us\/t\/([0-9]+)/;

	let linkRes = linkRegex1.exec(link);

	if (!linkRes) {
		let linkRegex2 = /^https:\/\/teams\.pokemonshowdown\.com\/view\/([0-9]+)/;

		linkRes = linkRegex2.exec(link);

		if (!linkRes) {
			return null;
		}
	}

	return {
		service: "psim",
		id: linkRes[1],
	};
}

function parseTeamLink(link) {
	const parseFuncs = [
		parseTeamLinkPokePast,
		parseTeamLinkPokemonShowdown,
	];

	for (const fn of parseFuncs) {
		const parsed = fn(link);
		if (parsed) {
			return parsed;
		}
	}

	return null;
}

const INVALID_TEAM_FORMAT_ERROR_MESSAGE = "Invalid team format";

function fetchTeamPokePast(Teams, teamId, callback) {
	wget("https://pokepast.es/" + encodeURIComponent(teamId) + "/raw", function (data, err) {
		if (err) {
			return callback(null, err);
		}

		let packed;

		try {
			let team = Teams.teamToJSON(data);
			packed = Teams.packTeam(team);
		} catch (ex) {
			return callback(null, new Error(INVALID_TEAM_FORMAT_ERROR_MESSAGE));
		}

		return callback(packed);
	});
}

function fetchTeamPokemonShowdown(Teams, teamId, callback) {
	wget("https://teams.pokemonshowdown.com/api/getteam?teamid=" + encodeURIComponent(teamId) + "&full=1", function (data, err) {
		if (err) {
			return callback(null, err);
		}

		let packed;

		try {
			let team = JSON.parse(data.substring(1).trim()).team;
			if (!team) {
				return callback(null, new Error("Team not found"));
			}
			team = Teams.fastUnpackTeam(team + "");
			packed = Teams.packTeam(team);
		} catch (ex) {
			return callback(null, new Error(INVALID_TEAM_FORMAT_ERROR_MESSAGE));
		}

		return callback(packed);
	});
}

function fetchTeam(Teams, parsedLink, callback) {
	switch (parsedLink.service) {
		case "pokepast":
			return fetchTeamPokePast(Teams, parsedLink.id, callback);
		case "psim":
			return fetchTeamPokemonShowdown(Teams, parsedLink.id, callback);
		default:
			return callback(null, new Error("Unsupported service"));
	}
}

module.exports = {
	addteam: function (App) {
		this.setLangFile(Lang_File);

		if (!this.can('teams', this.room)) return this.replyAccessDenied('teams');

		if (this.args.length !== 3) {
			return this.errorReply(this.usage({ desc: this.mlt(0) }, { desc: this.mlt(1) },
				{ desc: this.mlt(2) }));
		}

		const mod = App.modules.battle.system;

		const Teams = mod.TeamBuilder.tools;

		let format = parseAliases(this.args[1], App);

		if (!App.bot.formats[format]) {
			return this.errorReply(this.mlt(3) + " " + Chat.italics(format) + " " + this.mlt(4));
		}

		const formatName = App.bot.formats[format].name || format;

		const teamName = this.args[0];
		const teamId = Text.toId(teamName);

		if (!teamId) {
			return this.errorReply(this.usage({ desc: this.mlt(0) }, { desc: this.mlt(1) },
				{ desc: this.mlt(2) }));
		}

		if (mod.TeamBuilder.dynTeams[teamId]) {
			return this.errorReply(this.mlt(5));
		}

		let link = (this.args[2] + "").toLowerCase().trim();

		let parsedLink = parseTeamLink(link);

		if (!parsedLink) {
			return this.errorReply(this.mlt(6));
		}

		fetchTeam(Teams, parsedLink, (packed, err) => {
			if (err) {
				if (err.message === INVALID_TEAM_FORMAT_ERROR_MESSAGE) {
					return this.errorReply(this.mlt(8));
				} else {
					return this.errorReply(this.mlt(7) + " " + err.message);
				}
			}

			if (!packed) {
				return this.errorReply(this.mlt(8));
			}

			mod.TeamBuilder.dynTeams[teamId] = {
				name: teamName,
				format: format,
				packed: packed,
			};

			mod.TeamBuilder.saveTeams();
			mod.TeamBuilder.mergeTeams();

			this.reply(this.mlt(9) + " " + Chat.italics(teamName) + " " + this.mlt(10) + " " + Chat.italics(formatName));
			this.addToSecurityLog();

			// Display the added team

			this.cmd = 'getteam';
			this.arg = teamId;
			this.args = [teamId];
			this.parser.exec(this);
		});
	},

	deleteteam: function (App) {
		this.setLangFile(Lang_File);

		if (!this.can('teams', this.room)) return this.replyAccessDenied('teams');

		const teamName = (this.args[0] || "") + "";
		const teamId = Text.toId(teamName);

		if (!teamId) {
			return this.errorReply(this.usage({ desc: this.mlt(0) }));
		}

		const mod = App.modules.battle.system;

		if (!mod.TeamBuilder.dynTeams[teamId]) {
			return this.errorReply(this.mlt(11) + " " + Chat.italics(teamName));
		}

		delete mod.TeamBuilder.dynTeams[teamId];

		mod.TeamBuilder.saveTeams();
		mod.TeamBuilder.mergeTeams();

		this.reply(this.mlt(12) + " " + Chat.italics(teamName));
		this.addToSecurityLog();
	},

	listallteams: function (App) {
		this.setLangFile(Lang_File);

		if (!this.can('teams', this.room)) return this.replyAccessDenied('teams');

		const mod = App.modules.battle.system;
		const Teams = mod.TeamBuilder.tools;

		let teams = Object.create(null);

		for (let key of Object.keys(mod.TeamBuilder.dynTeams)) {
			let team = mod.TeamBuilder.dynTeams[key];
			let format = team.format;
			if (!teams[format]) {
				let formatName = App.bot.formats[format] ? (App.bot.formats[format].name || format) : format;
				teams[format] = {
					name: formatName,
					teams: [],
				};
			}
			teams[format].teams.push({
				packed: team.packed,
				name: team.name || key,
			});
		}

		teams = Object.values(teams);

		if (teams.length === 0) {
			return this.errorReply(this.mlt(13));
		}

		let key = App.data.temp.createTempFile(
			HtmlMaker.wrapHTML(
				teams.map(t => {
					return "<h1> " + Text.escapeHTML(this.mlt(14)) + " " + Text.escapeHTML(t.name) + "</h1>" +
						t.teams.map(function (a) {
							return "<p><b>" +
								Text.escapeHTML(a.name) + '</b>:</p><p> ' +
								Text.escapeHTML(Teams.exportTeam(a.packed)).replace(/\n/g, "<br>") + "</p>";
						}).join("<hr>");
				}).join("<hr>")
			)
		);

		this.reply(this.mlt(15) + ' ' + App.server.getControlPanelLink('/temp/' + key));
	},

	teams: "listteams",
	getteams: "listteams",
	listteams: function (App) {
		this.setLangFile(Lang_File);

		if (!this.can('teams', this.room) && !this.can('viewteams', this.room)) return this.replyAccessDenied('viewteams');

		const mod = App.modules.battle.system;

		const Teams = mod.TeamBuilder.tools;

		let format = parseAliases(this.args[0], App);

		if (!format) {
			return this.errorReply(this.usage({ desc: this.mlt(1) }));
		}

		if (!App.bot.formats[format]) {
			return this.errorReply(this.mlt(3) + " " + Chat.italics(format) + " " + this.mlt(4));
		}

		const formatName = App.bot.formats[format].name || format;

		let teams = [];

		for (let key of Object.keys(mod.TeamBuilder.dynTeams)) {
			let team = mod.TeamBuilder.dynTeams[key];
			if (team.format !== format) continue;
			teams.push({
				packed: team.packed,
				name: team.name || key,
			});
		}

		if (teams.length === 0) {
			return this.errorReply(this.mlt(16) + " " + Chat.italics(formatName));
		}

		const code = "!code " + this.mlt(14) + " " + formatName + ":\n\n" + teams.map(t => {
			return "  - " + t.name + ": " + Teams.teamOverview(t.packed);
		}).join("\n");

		let html = '';

		html += '<div style="overflow: auto; width: 100%;">';

		html += '<p>' + Text.escapeHTML(this.mlt(14)) + " " + Text.escapeHTML(formatName) + ':</p>';

		html += '<table border="1" cellspacing="0" cellpadding="3" style="min-width:100%;">';

		html += '<tr>';
		html += '<th>' + Text.escapeHTML(this.mlt("teamname")) + '</th>';
		html += '<th>' + Text.escapeHTML(this.mlt("pokemon")) + '</th>';
		html += '</tr>';

		teams.forEach(t => {
			const exportedTeam = Teams.exportTeam(t.packed);
			html += '<tr>';
			html += '<td><b>' + Text.escapeHTML(t.name) + '</b></td>';
			html += '<td><details><summary>' + Teams.teamOverviewShowdownHTML(t.packed) + '</summary><pre>' + Text.escapeHTML(exportedTeam).replace(/\n/g, "<br>") + '</pre></details></td>';
			html += '</tr>';
		});

		html += '</table>';

		html += '</div>';

		this.htmlRestrictReply(html, "info", code);
	},

	team: "getteam",
	getteam: function (App) {
		this.setLangFile(Lang_File);

		if (!this.can('teams', this.room) && !this.can('viewteams', this.room)) return this.replyAccessDenied('viewteams');

		let mod = App.modules.battle.system;
		const Teams = mod.TeamBuilder.tools;

		const teamName = (this.args[0] || "") + "";
		const teamId = Text.toId(teamName);

		if (!teamId) {
			return this.errorReply(this.usage({ desc: this.mlt(0) }));
		}

		if (!mod.TeamBuilder.dynTeams[teamId]) {
			return this.errorReply(this.mlt(11) + " " + Chat.italics(teamName));
		}

		let format = mod.TeamBuilder.dynTeams[teamId].format;
		let formatName = App.bot.formats[format] ? (App.bot.formats[format].name || format) : format;

		const realTeamName = mod.TeamBuilder.dynTeams[teamId].name || teamId;

		const exportedTeam = Teams.exportTeam(mod.TeamBuilder.dynTeams[teamId].packed);

		let html = '';

		html += '<div style="overflow: auto; width: 100%;">';

		html += '<p>' + this.mlt('teamname') + ': <b>' + Text.escapeHTML(realTeamName) + '</b></p>';
		html += '<p>' + this.mlt(1) + ': ' + Text.escapeHTML(formatName) + '</p>';

		html += '<details><summary>' + Teams.teamOverviewShowdownHTML(mod.TeamBuilder.dynTeams[teamId].packed) + '</summary><pre>' + Text.escapeHTML(exportedTeam).replace(/\n/g, "<br>") + '</pre></details>';

		html += '</div>';

		const code = "!code " + realTeamName + " - " + formatName + "\n\n" + exportedTeam;

		this.htmlRestrictReply(html, "info", code);
	},
};
