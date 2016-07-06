/*
 * Challenges Manager
 */

'use strict';

const Text = Tools.get('text.js');

const Config = App.config.modules.battle;

exports.challenges = {};

App.parser.addPermission('chall', {group: 'admin'});

function canChallenge(i, nBattles) {
	if (Config.maxBattles > nBattles) return true;
	let ident = Text.parseUserIdent(i);
	if (App.parser.can(ident, 'chall')) return true;
	return false;
}

exports.parse = function (room, message, isIntro, spl) {
	let mod = App.modules.battle.system;
	if (spl[0] !== 'updatechallenges') return;
	let nBattles = Object.keys(mod.BattleBot.battles).length;
	try {
		exports.challenges = JSON.parse(message.substr(18));
	} catch (e) {
		App.reportCrash(e);
		return;
	}
	if (exports.challenges.challengesFrom) {
		let cmds = [];
		for (let i in exports.challenges.challengesFrom) {
			if (canChallenge(i, nBattles)) {
				let format = exports.challenges.challengesFrom[i];

				if (!(format in App.bot.formats) || !App.bot.formats[format].chall) {
					cmds.push('/reject ' + i);
					continue;
				}
				if (App.bot.formats[format].team && !mod.TeamBuilder.hasTeam(format)) {
					cmds.push('/reject ' + i);
					continue;
				}

				let team = mod.TeamBuilder.getTeam(format);
				if (team) {
					cmds.push('/useteam ' + team);
				}
				cmds.push('/accept ' + i);
				nBattles++;
				if (App.config.debug) {
					App.log("acepted battle: " + i + " | " + exports.challenges.challengesFrom[i]);
				}
			} else {
				cmds.push('/reject ' + i);
				if (App.config.debug) {
					App.log("rejected battle: " + i + " | " + exports.challenges.challengesFrom[i]);
				}
				continue;
			}
		}
		if (cmds.length > 0) {
			App.bot.sendTo('', cmds);
		}
	}
};
