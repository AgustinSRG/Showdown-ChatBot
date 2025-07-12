/**
 * Ladder Manager
 */

'use strict';

const Ladder_Check_Interval = 5 * 1000;

const Path = require('path');
const Text = Tools('text');

const Lang_File = Path.resolve(__dirname, 'ladder.translations');

exports.setup = function (App) {
	const Config = App.config.modules.battle;

	function getLanguage(room) {
		return App.config.language.rooms[room] || App.config.language['default'];
	}

	const LadderManager = Object.create(null);

	LadderManager.reportsRoom = false;

	LadderManager.reportBattle = function (room) {
		if (!LadderManager.reportsRoom) return;
		if (LadderManager.reportsRoom.charAt(0) === ',') {
			App.bot.pm(Text.toId(LadderManager.reportsRoom), App.multilang.mlt(Lang_File, getLanguage(room), 0) + ": <<" + room + ">>");
		} else {
			App.bot.sendTo(LadderManager.reportsRoom, App.multilang.mlt(Lang_File, getLanguage(room), 0) + ": <<" + room + ">>");
		}
		LadderManager.reportsRoom = false;
	};

	LadderManager.searching = [];
	LadderManager.ladderTimer = null;

	LadderManager.onUpdateSearching = function (searchingFormats) {
		LadderManager.searching = searchingFormats.map(Text.toId);
	};

	LadderManager.update = function () {
		let formats = Config.laddering || [];

		if (typeof formats === "string") {
			if (formats) {
				formats = [formats];
			} else {
				formats = [];
			}
		}

		if (formats.length === 0) {
			if (LadderManager.searching.length > 0) {
				// Cancel all search
				App.bot.send(['|/cancelsearch']);
			}
			return;
		}

		if (!App.bot.status.connected || !App.bot.status.named) {
			return; // Bot not connected or named yet
		}

		const mod = App.modules.battle.system;

		let maxBattles = 1;
		if (Config.ladderBattles && Config.ladderBattles > 0) maxBattles = Config.ladderBattles;

		let ratedBattleCounter = 0;

		for (let i in mod.BattleBot.battles) {
			if (mod.BattleBot.battles[i].self && mod.BattleBot.battles[i].rated) {
				ratedBattleCounter++;
			}
		}

		if (ratedBattleCounter >= maxBattles) {
			if (LadderManager.searching.length > 0) {
				// Cancel all search
				App.bot.send(['|/cancelsearch']);
			}
			return;
		}

		const cmds = [];

		for (let format of formats) {
			if (LadderManager.searching.indexOf(format) >= 0) continue; // Already searching
			let team = mod.TeamBuilder.getTeam(format);
			if (team) {
				cmds.push('|/utm ' + team);
			} else {
				cmds.push('|/utm null');
			}
			cmds.push('|/search ' + format);
		}

		if (cmds.length > 0) {
			App.bot.send(cmds);
		}
	};

	LadderManager.destroy = function () {
		if (LadderManager.ladderTimer) clearTimeout(LadderManager.ladderTimer);
		LadderManager.ladderTimer = null;
	};

	LadderManager.ladderTimer = setInterval(function () {
		LadderManager.update();
	}, Ladder_Check_Interval);

	return LadderManager;
};
