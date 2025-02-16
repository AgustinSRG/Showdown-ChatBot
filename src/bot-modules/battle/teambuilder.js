/**
 * Teambuilder / Teams Manager
 */

'use strict';

const Path = require('path');

const Text = Tools('text');
const randomize = Tools('randomize');

exports.setup = function (App) {
	const Teams = require(Path.resolve(__dirname, 'teams.js')).setup(App);
	const teamsDataBase = App.dam.getDataBase('teams.json');

	return {
		tools: Teams,
		teams: Object.create(null),
		dynTeams: Object.create(null),

		loadTeamList: function () {
			this.dynTeams = teamsDataBase.data;
			this.mergeTeams();
		},

		mergeTeams: function () {
			if (this.teams) delete this.teams;
			this.teams = Object.create(null);
			for (let i in this.dynTeams) {
				let team = this.dynTeams[i];
				if (!this.teams[team.format]) this.teams[team.format] = [];
				this.teams[team.format].push(team.packed);
			}
		},

		addTeam: function (name, format, packed) {
			const id = Text.toId(name);
			if (this.dynTeams[id]) return false;
			this.dynTeams[id] = {
				name: name,
				format: format,
				packed: packed,
			};
			this.mergeTeams();
			this.saveTeams();
			return true;
		},

		removeTeam: function (name) {
			const id = Text.toId(name);
			if (!this.dynTeams[id]) return false;
			delete this.dynTeams[id];
			this.mergeTeams();
			this.saveTeams();
			return true;
		},

		saveTeams: function () {
			teamsDataBase.write();
		},

		getTeam: function (format) {
			let formatId = Text.toId(format);
			let teamStuff = this.teams[formatId];
			if (!teamStuff || !teamStuff.length) return false;
			let teamChosen = teamStuff[Math.floor(Math.random() * teamStuff.length)]; //choose team
			let teamStr = '';
			try {
				if (typeof teamChosen === 'string') {
					//already parsed
					teamStr = teamChosen;
				} else if (typeof teamChosen === 'object') {
					if (teamChosen.maxPokemon && teamChosen.pokemon) {
						//generate random team
						let team = [];
						let pokes = randomize(teamChosen.pokemon);
						let k = 0;
						for (let i = 0; i < pokes.length; i++) {
							if (k++ >= teamChosen.maxPokemon) break;
							team.push(pokes[i]);
						}
						teamStr = this.packTeam(team);
					} else if (teamChosen.length) {
						//parse team
						teamStr = this.packTeam(teamChosen);
					} else {
						App.log("invalid team data type: " + JSON.stringify(teamChosen));
						return false;
					}
				} else {
					App.log("invalid team data type: " + JSON.stringify(teamChosen));
					return false;
				}
				return teamStr;
			} catch (e) {
				App.reportCrash(e.stack);
			}
		},

		hasTeam: function (format) {
			let formatId = Text.toId(format);
			if (this.teams[formatId]) return true;
			return false;
		},

		/* Pack Team function - from Pokemon-Showdown-Client */

		packTeam: function (team) {
			return Teams.packTeam(team);
		},
	};
};
