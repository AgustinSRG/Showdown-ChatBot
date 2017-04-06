/**
 * Pokemon Showdown Teams
 */

'use strict';

const Text = Tools('text');
const BattleTypeChart = Tools('typechart');

const BattleStatIDs = {
	HP: 'hp',
	hp: 'hp',
	Atk: 'atk',
	atk: 'atk',
	Def: 'def',
	def: 'def',
	SpA: 'spa',
	SAtk: 'spa',
	SpAtk: 'spa',
	spa: 'spa',
	SpD: 'spd',
	SDef: 'spd',
	SpDef: 'spd',
	spd: 'spd',
	Spe: 'spe',
	Spd: 'spe',
	spe: 'spe',
};

const BattleStatNames = {
	hp: 'HP',
	atk: 'Atk',
	def: 'Def',
	spa: 'SpA',
	spd: 'SpD',
	spe: 'Spe',
};

exports.setup = function (App) {
	const TeamsTools = {};
	TeamsTools.BattleStatIDs = BattleStatIDs;
	TeamsTools.BattleStatNames = BattleStatNames;

	/**
	 * Transforms an exportable team to JSON format
	 * @param {String} text - Exportable team
	 * @returns {Object} - JSON team
	 */
	TeamsTools.teamToJSON = function (text) {
		text = text.split("\n");
		let team = [];
		let curSet = null;
		for (let i = 0; i < text.length; i++) {
			let line = text[i].trim();
			if (line === '' || line === '---') {
				curSet = null;
			} else if (!curSet) {
				curSet = {name: '', species: '', gender: '', item: '', ability: '', nature: ''};
				team.push(curSet);
				let atIndex = line.lastIndexOf(' @ ');
				if (atIndex !== -1) {
					curSet.item = line.substr(atIndex + 3);
					if (Text.toId(curSet.item) === 'noitem') curSet.item = '';
					line = line.substr(0, atIndex);
				}
				if (line.substr(line.length - 4) === ' (M)') {
					curSet.gender = 'M';
					line = line.substr(0, line.length - 4);
				}
				if (line.substr(line.length - 4) === ' (F)') {
					curSet.gender = 'F';
					line = line.substr(0, line.length - 4);
				}
				let parenIndex = line.lastIndexOf(' (');
				if (line.substr(line.length - 1) === ')' && parenIndex !== -1) {
					line = line.substr(0, line.length - 1);
					curSet.species = line.substr(parenIndex + 2);
					line = line.substr(0, parenIndex);
					curSet.name = line;
				} else {
					curSet.species = line;
					curSet.name = curSet.species;
				}
			} else if (line.substr(0, 7) === 'Trait: ') {
				line = line.substr(7);
				curSet.ability = line;
			} else if (line.substr(0, 9) === 'Ability: ') {
				line = line.substr(9);
				curSet.ability = line;
			} else if (line === 'Shiny: Yes') {
				curSet.shiny = true;
			} else if (line.substr(0, 7) === 'Level: ') {
				line = line.substr(7);
				curSet.level = parseInt(line);
			} else if (line.substr(0, 11) === 'Happiness: ') {
				line = line.substr(11);
				curSet.happiness = parseInt(line);
			} else if (line.substr(0, 9) === 'Ability: ') {
				line = line.substr(9);
				curSet.ability = line;
			} else if (line.substr(0, 5) === 'EVs: ') {
				line = line.substr(5);
				let evLines = line.split('/');
				curSet.evs = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
				for (let j = 0; j < evLines.length; j++) {
					let evLine = evLines[j].trim();
					let spaceIndex = evLine.indexOf(' ');
					if (spaceIndex === -1) continue;
					let statid = BattleStatIDs[evLine.substr(spaceIndex + 1)];
					let statval = parseInt(evLine.substr(0, spaceIndex));
					if (!statid) continue;
					curSet.evs[statid] = statval;
				}
			} else if (line.substr(0, 5) === 'IVs: ') {
				line = line.substr(5);
				let ivLines = line.split(' / ');
				curSet.ivs = {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31};
				for (let j = 0; j < ivLines.length; j++) {
					let ivLine = ivLines[j];
					let spaceIndex = ivLine.indexOf(' ');
					if (spaceIndex === -1) continue;
					let statid = BattleStatIDs[ivLine.substr(spaceIndex + 1)];
					let statval = parseInt(ivLine.substr(0, spaceIndex));
					if (!statid) continue;
					curSet.ivs[statid] = statval;
				}
			} else if (line.match(/^[A-Za-z]+ (N|n)ature/)) {
				let natureIndex = line.indexOf(' Nature');
				if (natureIndex === -1) natureIndex = line.indexOf(' nature');
				if (natureIndex === -1) continue;
				line = line.substr(0, natureIndex);
				curSet.nature = line;
			} else if (line.substr(0, 1) === '-' || line.substr(0, 1) === '~') {
				line = line.substr(1);
				if (line.substr(0, 1) === ' ') line = line.substr(1);
				if (!curSet.moves) curSet.moves = [];
				if (line.substr(0, 14) === 'Hidden Power [') {
					let hptype = line.substr(14, line.length - 15);
					line = 'Hidden Power ' + hptype;
					if (!curSet.ivs) {
						curSet.ivs = {};
						for (let stat in BattleTypeChart[hptype].HPivs) {
							curSet.ivs[stat] = BattleTypeChart[hptype].HPivs[stat];
						}
					}
				}
				if (line === 'Frustration') {
					curSet.happiness = 0;
				}
				curSet.moves.push(line);
			}
		}
		return team;
	};

	/**
 	* Transforms a JSON team to packed format
 	* @param {Object} team - JSON team
 	* @returns {String} - Packed team
 	*/
	TeamsTools.packTeam = function (team) {
		let buf = '';
		if (!team) return '';
		for (let i = 0; i < team.length; i++) {
			let set = team[i];
			if (buf) buf += ']';
			// name
			buf += (set.name || set.species);
			// species
			let id = Text.toId(set.species || set.name);
			buf += '|' + (Text.toId(set.name || set.species) === id ? '' : id);
			// item
			buf += '|' + Text.toId(set.item);
			// ability
			let template = set.species || set.name;
			try {
				template = App.data.getPokedex()[Text.toId(template)];
			} catch (e) {
				App.reportCrash(e);
				template = null;
			}
			if (!template) {
				template = {};
			}
			let abilities = template.abilities || {};
			id = Text.toId(set.ability);
			if (abilities) {
				if (abilities['0'] && id === Text.toId(abilities['0'])) {
					buf += '|';
				} else if (abilities['1'] && id === Text.toId(abilities['1'])) {
					buf += '|1';
				} else if (abilities['H'] && id === Text.toId(abilities['H'])) {
					buf += '|H';
				} else {
					buf += '|' + id;
				}
			} else {
				buf += '|' + id;
			}
			// moves
			buf += '|' + set.moves.map(Text.toId).join(',');
			// nature
			buf += '|' + set.nature;
			// evs
			let evs = '|';
			if (set.evs) {
				evs = '|' + (set.evs['hp'] || '') + ',' + (set.evs['atk'] || '') + ',' + (set.evs['def'] || '') + ',' +
				(set.evs['spa'] || '') + ',' + (set.evs['spd'] || '') + ',' + (set.evs['spe'] || '');
			}
			if (evs === '|,,,,,') {
				buf += '|';
			} else {
				buf += evs;
			}
			// gender
			if (set.gender && set.gender !== template.gender) {
				buf += '|' + set.gender;
			} else {
				buf += '|';
			}
			// ivs
			let ivs = '|';
			if (set.ivs) {
				ivs = '|' + (set.ivs['hp'] === 31 || set.ivs['hp'] === undefined ? '' : set.ivs['hp']) + ',' + (set.ivs['atk'] === 31 || set.ivs['atk'] === undefined ? '' : set.ivs['atk']) + ',' + (set.ivs['def'] === 31 || set.ivs['def'] === undefined ? '' : set.ivs['def']) + ',' + (set.ivs['spa'] === 31 || set.ivs['spa'] === undefined ? '' : set.ivs['spa']) + ',' + (set.ivs['spd'] === 31 || set.ivs['spd'] === undefined ? '' : set.ivs['spd']) + ',' + (set.ivs['spe'] === 31 || set.ivs['spe'] === undefined ? '' : set.ivs['spe']);
			}
			if (ivs === '|,,,,,') {
				buf += '|';
			} else {
				buf += ivs;
			}
			// shiny
			if (set.shiny) {
				buf += '|S';
			} else {
				buf += '|';
			}
			// level
			if (set.level && set.level !== 100) {
				buf += '|' + set.level;
			} else {
				buf += '|';
			}
			// happiness
			if (set.happiness !== undefined && set.happiness !== 255) {
				buf += '|' + set.happiness;
			} else {
				buf += '|';
			}
		}
		return buf;
	};

	/**
	 * Transforms a packed team to JSON format
	 * @param {String} buf - Packed team
	 * @returns {Object} - JSON team
	 */
	const fastUnpackTeam = TeamsTools.fastUnpackTeam = function (buf) {
		if (!buf) return [];

		let team = [];
		let i = 0, j = 0;

		while (j >= 0) {
			let set = {};
			team.push(set);

			// name
			j = buf.indexOf('|', i);
			set.name = buf.substring(i, j);
			i = j + 1;

			// species
			j = buf.indexOf('|', i);
			set.species = buf.substring(i, j) || set.name;
			i = j + 1;

			// item
			j = buf.indexOf('|', i);
			set.item = buf.substring(i, j);
			i = j + 1;

			// ability
			j = buf.indexOf('|', i);
			let ability = buf.substring(i, j);
			let template = TeamsTools.getTemplate(set.species);
			set.ability = (template.abilities && ability in {'': 1, 0: 1, 1: 1, H: 1} ? template.abilities[ability || '0'] : ability);
			i = j + 1;

			// moves
			j = buf.indexOf('|', i);
			set.moves = buf.substring(i, j).split(',');
			i = j + 1;

			// nature
			j = buf.indexOf('|', i);
			set.nature = buf.substring(i, j);
			i = j + 1;

			// evs
			j = buf.indexOf('|', i);
			if (j !== i) {
				let evs = buf.substring(i, j).split(',');
				set.evs = {
					hp: Number(evs[0]) || 0,
					atk: Number(evs[1]) || 0,
					def: Number(evs[2]) || 0,
					spa: Number(evs[3]) || 0,
					spd: Number(evs[4]) || 0,
					spe: Number(evs[5]) || 0,
				};
			}
			i = j + 1;

			// gender
			j = buf.indexOf('|', i);
			if (i !== j) set.gender = buf.substring(i, j);
			i = j + 1;

			// ivs
			j = buf.indexOf('|', i);
			if (j !== i) {
				let ivs = buf.substring(i, j).split(',');
				set.ivs = {
					hp: ivs[0] === '' ? 31 : Number(ivs[0]),
					atk: ivs[1] === '' ? 31 : Number(ivs[1]),
					def: ivs[2] === '' ? 31 : Number(ivs[2]),
					spa: ivs[3] === '' ? 31 : Number(ivs[3]),
					spd: ivs[4] === '' ? 31 : Number(ivs[4]),
					spe: ivs[5] === '' ? 31 : Number(ivs[5]),
				};
			}
			i = j + 1;

			// shiny
			j = buf.indexOf('|', i);
			if (i !== j) set.shiny = true;
			i = j + 1;

			// level
			j = buf.indexOf('|', i);
			if (i !== j) set.level = parseInt(buf.substring(i, j));
			i = j + 1;

			// happiness
			j = buf.indexOf(']', i);
			if (j < 0) {
				if (buf.substring(i)) {
					set.happiness = Number(buf.substring(i));
				}
				break;
			}
			if (i !== j) set.happiness = Number(buf.substring(i, j));
			i = j + 1;
		}
		return team;
	};

	/**
	 * Gets team overview (pokemon names)
	 * @param {String} buf - Packed team
	 * @returns {String} List of pokemon
	 */
	TeamsTools.teamOverview = function (buf) {
		let team = fastUnpackTeam(buf);
		if (!team) return '(empty)';
		let pokes = [];
		for (let i = 0; i < team.length; i++) {
			pokes.push(team[i].species);
		}
		if (!pokes.length) return '(empty)';
		return pokes.join(', ');
	};

	/**
	 * Transforms a JSON team to exportable format
	 * @param {Object} team - JSON team
	 * @returns {String} - Exportable team
	 */
	TeamsTools.exportTeam = function (team) {
		if (!team) return "";
		if (typeof team === 'string') {
			if (team.indexOf('\n') >= 0) return team;
			team = TeamsTools.fastUnpackTeam(team);
		}
		let text = '';
		for (let i = 0; i < team.length; i++) {
			let curSet = team[i];
			if (curSet.name !== curSet.species) {
				text += '' + curSet.name + ' (' + (TeamsTools.getTemplate(curSet.species).name || curSet.species) + ')';
			} else {
				text += '' + (TeamsTools.getTemplate(curSet.species).name || curSet.species);
			}
			if (curSet.gender === 'M') text += ' (M)';
			if (curSet.gender === 'F') text += ' (F)';
			if (curSet.item) {
				curSet.item = TeamsTools.getItem(curSet.item).name || curSet.item;
				text += ' @ ' + curSet.item;
			}
			text += "\n";
			if (curSet.ability) {
				text += 'Ability: ' + curSet.ability + "\n";
			}
			if (curSet.level && curSet.level !== 100) {
				text += 'Level: ' + curSet.level + "\n";
			}
			if (curSet.shiny) {
				text += 'Shiny: Yes\n';
			}
			if (typeof curSet.happiness === 'number' && curSet.happiness !== 255) {
				text += 'Happiness: ' + curSet.happiness + "\n";
			}
			let first = true;
			if (curSet.evs) {
				for (let j in BattleStatNames) {
					if (!curSet.evs[j]) continue;
					if (first) {
						text += 'EVs: ';
						first = false;
					} else {
						text += ' / ';
					}
					text += '' + curSet.evs[j] + ' ' + BattleStatNames[j];
				}
			}
			if (!first) {
				text += "\n";
			}
			if (curSet.nature) {
				text += '' + curSet.nature + ' Nature' + "\n";
			}
			first = true;
			if (curSet.ivs) {
				let defaultIvs = true;
				let hpType = false;
				for (let j = 0; j < curSet.moves.length; j++) {
					let move = curSet.moves[j];
					if (move.substr(0, 13) === 'Hidden Power ' && move.substr(0, 14) !== 'Hidden Power [') {
						hpType = move.substr(13);
						if (!TeamsTools.BattleTypeChart[hpType].HPivs) {
							continue;
						}
						for (let stat in BattleStatNames) {
							if ((curSet.ivs[stat] === undefined ? 31 : curSet.ivs[stat]) !== (TeamsTools.BattleTypeChart[hpType].HPivs[stat] || 31)) {
								defaultIvs = false;
								break;
							}
						}
					}
				}
				if (defaultIvs && !hpType) {
					for (let stat in BattleStatNames) {
						if (curSet.ivs[stat] !== 31 && typeof curSet.ivs[stat] !== undefined) {
							defaultIvs = false;
							break;
						}
					}
				}
				if (!defaultIvs) {
					for (let stat in BattleStatNames) {
						if (typeof curSet.ivs[stat] === 'undefined' || isNaN(curSet.ivs[stat]) || curSet.ivs[stat] === 31) continue;
						if (first) {
							text += 'IVs: ';
							first = false;
						} else {
							text += ' / ';
						}
						text += '' + curSet.ivs[stat] + ' ' + BattleStatNames[stat];
					}
				}
			}
			if (!first) {
				text += "\n";
			}
			if (curSet.moves) {
				for (let j = 0; j < curSet.moves.length; j++) {
					let move = curSet.moves[j];
					if (move.substr(0, 13) === 'Hidden Power ') {
						move = move.substr(0, 13) + '[' + move.substr(13) + ']';
					}
					text += '- ' + (TeamsTools.getMove(move).name || move) + "\n";
				}
			}
			text += "\n";
		}
		return text;
	};

	/**
	 * Gets a pokemon template
	 * @param {String} name
	 * @returns {Object} - Pokemon
	 */
	TeamsTools.getTemplate = function (name) {
		name = Text.toId(name || '');
		try {
			return (App.data.getPokedex()[name] || {});
		} catch (e) {}
		return {};
	};

	/**
	 * Gets an item template
	 * @param {String} name
	 * @returns {Object} - Item
	 */
	TeamsTools.getItem = function (name) {
		name = Text.toId(name || '');
		try {
			return (App.data.getItems()[name] || {});
		} catch (e) {}
		return {};
	};

	/**
	 * Gets an ability template
	 * @param {String} name
	 * @returns {Object} - Ability
	 */
	TeamsTools.getAbility = function (name) {
		name = Text.toId(name || '');
		try {
			return (App.data.getAbilities()[name] || {});
		} catch (e) {}
		return {};
	};

	/**
	 * Gets a move template
	 * @param {String} name
	 * @returns {Object} - Move
	 */
	TeamsTools.getMove = function (name) {
		name = Text.toId(name || '');
		try {
			return (App.data.getMoves()[name] || {});
		} catch (e) {}
		return {};
	};

	return TeamsTools;
};
