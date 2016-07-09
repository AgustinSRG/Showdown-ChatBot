/*
 * Ladder Manager
 */

'use strict';

const Ladder_Check_Interval = 10 * 1000;

const Path = require('path');

const Text = Tools.get('text.js');
const Translator = Tools.get('translate.js');

const Config = App.config.modules.battle;

const translator = new Translator(Path.resolve(__dirname, 'ladder.translations'));

function getLanguage(room) {
	return App.config.language.rooms[room] || App.config.language['default'];
}

exports.reportsRoom = false;

exports.reportBattle = function (room) {
	if (!exports.reportsRoom) return;
	if (exports.reportsRoom.charAt(0) === ',') {
		App.bot.pm(exports.reportsRoom, translator.get(0, getLanguage(room)) + ": <<" + room + ">>");
	} else {
		App.bot.sendTo(exports.reportsRoom, translator.get(0, getLanguage(room)) + ": <<" + room + ">>");
	}
	exports.reportsRoom = false;
};

exports.laddering = false;
exports.format = '';
exports.interv = 0;
exports.ladderTimer = null;

exports.start = function (format, checkInterv) {
	if (!format) return false;
	if (exports.laddering) return false;
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
	exports.laddering = true;
	exports.format = format;
	exports.interv = checkInterv;
	exports.ladderTimer = setInterval(check, checkInterv || Ladder_Check_Interval);
	check();
	return true;
};

exports.stop = function () {
	if (!exports.laddering) return false;
	exports.laddering = false;
	if (exports.ladderTimer) clearTimeout(exports.ladderTimer);
	exports.ladderTimer = null;
	exports.format = '';
	exports.interv = 0;
	return true;
};

exports.destroy = function () {
	exports.laddering = false;
	if (exports.ladderTimer) clearTimeout(exports.ladderTimer);
	exports.ladderTimer = null;
};
