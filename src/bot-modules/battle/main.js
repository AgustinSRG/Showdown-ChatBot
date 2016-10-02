/**
 * Bot Module: Battle
 */

'use strict';

const Path = require('path');

exports.setup = function (App) {
	if (!App.config.modules.battle) {
		App.config.modules.battle = {
			maxBattles: 1,
			initBattleMsg: ['gl hf'],
			winmsg: ['GG', 'g_g'],
			losemsg: ['gg', 'wp'],
			ladderBattles: 1,
			joinTours: {},
		};
	}

	const BattleBot = exports.BattleBot = require(Path.resolve(__dirname, 'battle-ai', 'index.js')).setup(App);
	const TeamBuilder = exports.TeamBuilder = require(Path.resolve(__dirname, 'teambuilder.js')).setup(App);
	const ChallManager = exports.ChallManager = require(Path.resolve(__dirname, 'challenges.js')).setup(App);
	const TourManager = exports.TourManager = require(Path.resolve(__dirname, 'tournaments.js')).setup(App);
	const LadderManager = exports.LadderManager = require(Path.resolve(__dirname, 'ladder.js')).setup(App);

	TeamBuilder.loadTeamList();

	App.bot.on('connect', () => {
		BattleBot.init();
	});

	App.bot.on('disconnect', () => {
		BattleBot.init();
		TourManager.clearData();
		ChallManager.clean();
	});

	App.bot.on('line', (room, line, spl, isIntro) => {
		switch (spl[0]) {
		case 'updatechallenges':
			ChallManager.parse(room, line, isIntro, spl);
			break;
		case 'tournament':
			TourManager.parse(room, line, isIntro, spl);
			break;
		case 'rated':
			LadderManager.reportBattle(room);
			break;
		}

		if (!App.bot.rooms[room]) {
			if (spl[0] !== 'init' || spl[1] !== 'battle') return;
		} else if (App.bot.rooms[room].type !== "battle") {
			return;
		}

		try {
			BattleBot.receive(room, line, isIntro);
		} catch (e) {
			App.reportCrash(e);
		}
	});

	exports.getInitCmds = function () {
		return BattleBot.tryJoinAbandonedBattles();
	};

	return module.exports;
};
