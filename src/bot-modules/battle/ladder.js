/**
 * Ladder Manager
 */

'use strict';

const Ladder_Check_Interval = 10 * 1000;

const Path = require('path');
const Text = Tools('text');

const Lang_File = Path.resolve(__dirname, 'ladder.translations');

exports.setup = function (App) {
	const Config = App.config.modules.battle;

	function getLanguage(room) {
		return App.config.language.rooms[room] || App.config.language['default'];
	}

	const LadderManager = {};

	LadderManager.reportsRoom = false;

	LadderManager.reportBattle = function (room) {
		if (!LadderManager.reportsRoom) return;
		if (LadderManager.reportsRoom.charAt(0) === ',') {
			App.bot.pm(LadderManager.reportsRoom, App.multilang.mlt(Lang_File, getLanguage(room), 0) + ": <<" + room + ">>");
		} else {
			App.bot.sendTo(LadderManager.reportsRoom, App.multilang.mlt(Lang_File, getLanguage(room), 0) + ": <<" + room + ">>");
		}
		LadderManager.reportsRoom = false;
	};

	LadderManager.laddering = false;
	LadderManager.format = '';
	LadderManager.interv = 0;
	LadderManager.ladderTimer = null;

	LadderManager.start = function (format, checkInterv) {
		if (!format) return false;
		if (LadderManager.laddering) return false;
		let mod = App.modules.battle.system;
		format = Text.toId(format);
		let check = function () {
			if (!App.bot.isConnected()) return;
			let counter = 0;
			let maxBattles = 1;
			if (Config.ladderBattles && Config.ladderBattles > 0) maxBattles = Config.ladderBattles;
			for (let i in mod.BattleBot.battles) {
				if (mod.BattleBot.battles[i].tier && Text.toId(mod.BattleBot.battles[i].tier) === format && mod.BattleBot.battles[i].rated) {
					counter++;
				}
			}
			if (counter >= maxBattles) return;
			let cmds = [];
			let team = mod.TeamBuilder.getTeam(format);
			if (team) {
				cmds.push('|/useteam ' + team);
			}
			cmds.push('|/search ' + format);
			App.bot.send(cmds);
		};
		LadderManager.laddering = true;
		LadderManager.format = format;
		LadderManager.interv = checkInterv;
		LadderManager.ladderTimer = setInterval(check, checkInterv || Ladder_Check_Interval);
		check();
		return true;
	};

	LadderManager.stop = function () {
		if (!LadderManager.laddering) return false;
		LadderManager.laddering = false;
		if (LadderManager.ladderTimer) clearTimeout(LadderManager.ladderTimer);
		LadderManager.ladderTimer = null;
		LadderManager.format = '';
		LadderManager.interv = 0;
		return true;
	};

	LadderManager.destroy = function () {
		LadderManager.laddering = false;
		if (LadderManager.ladderTimer) clearTimeout(LadderManager.ladderTimer);
		LadderManager.ladderTimer = null;
	};

	return LadderManager;
};
