/**
 * Challenges Manager
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

exports.setup = function (App) {
	const Config = App.config.modules.battle;

	function getLanguage(room) {
		return App.config.language.rooms[room] || App.config.language['default'];
	}

	const ChallManager = {};
	ChallManager.challenges = {};

	function canChallenge(i, nBattles) {
		if (Config.maxBattles > nBattles) return true;
		let ident = Text.parseUserIdent(i);
		if (App.parser.can(ident, 'chall')) return true;
		return false;
	}

	ChallManager.parse = function (room, message, isIntro, spl) {
		let mod = App.modules.battle.system;
		if (spl[0] !== 'updatechallenges') return;
		let nBattles = Object.keys(mod.BattleBot.battles).length;
		try {
			ChallManager.challenges = JSON.parse(message.substr(18));
		} catch (e) {
			App.reportCrash(e);
			return;
		}
		if (ChallManager.challenges.challengesFrom) {
			let cmds = [];
			for (let i in ChallManager.challenges.challengesFrom) {
				if (canChallenge(i, nBattles)) {
					let format = ChallManager.challenges.challengesFrom[i];

					if (!(format in App.bot.formats) || !App.bot.formats[format].chall) {
						cmds.push('/reject ' + i);
						continue;
					}
					if (App.bot.formats[format].team && !mod.TeamBuilder.hasTeam(format)) {
						cmds.push('/reject ' + i);
						cmds.push('/pm ' + i + "," + App.multilang.mlt(Lang_File, getLanguage(room), 2) + ' ' + Chat.italics(App.bot.formats[format].name));
						continue;
					}

					let team = mod.TeamBuilder.getTeam(format);
					if (team) {
						cmds.push('/useteam ' + team);
					}
					cmds.push('/accept ' + i);
					nBattles++;
					if (App.config.debug) {
						App.log("acepted battle: " + i + " | " + ChallManager.challenges.challengesFrom[i]);
					}
				} else {
					cmds.push('/reject ' + i);
					cmds.push('/pm ' + i + "," + App.multilang.mlt(Lang_File, getLanguage(room), "busy").replace("#BN", "" + nBattles));
					if (App.config.debug) {
						App.log("rejected battle: " + i + " | " + ChallManager.challenges.challengesFrom[i]);
					}
					continue;
				}
			}
			if (cmds.length > 0) {
				App.bot.sendTo('', cmds);
			}
		}
	};

	ChallManager.clean = function () {
		ChallManager.challenges = {};
	};

	return ChallManager;
};
