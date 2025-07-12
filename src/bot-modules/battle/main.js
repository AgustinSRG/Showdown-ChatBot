/**
 * Bot Module: Battle
 */

'use strict';

const Path = require('path');
const Text = Tools('text');

exports.setup = function (App) {
	if (!App.config.modules.battle) {
		App.config.modules.battle = {
			maxBattles: 1,
			initBattleMsg: ['gl hf'],
			winmsg: ['GG', 'g_g'],
			losemsg: ['gg', 'wp'],
			otherMessages: Object.create(null),
			ladderBattles: 1,
			joinTours: Object.create(null),
			ignoreAbandonedbattles: false,
			turnTimerOn: true,
			maxTurns: 0,
		};
	}

	if (!App.config.modules.battle.otherMessages) {
		App.config.modules.battle.otherMessages = Object.create(null);
	}

	if (!App.config.modules.battle.battlemods) {
		App.config.modules.battle.battlemods = Object.create(null);
	}

	const BattleModule = Object.create(null);

	BattleModule.challengeExceptions = Object.create(null);

	const BattleBot = BattleModule.BattleBot = require(Path.resolve(__dirname, 'battle-ai', 'index.js')).setup(App);
	const TeamBuilder = BattleModule.TeamBuilder = require(Path.resolve(__dirname, 'teambuilder.js')).setup(App);
	const ChallManager = BattleModule.ChallManager = require(Path.resolve(__dirname, 'challenges.js')).setup(App);
	const TourManager = BattleModule.TourManager = require(Path.resolve(__dirname, 'tournaments.js')).setup(App);
	const LadderManager = BattleModule.LadderManager = require(Path.resolve(__dirname, 'ladder.js')).setup(App);

	const PokeBattleManager = BattleModule.PokeBattleManager = require(Path.resolve(__dirname, 'poke-battle', 'index.js')).setup(App);

	TeamBuilder.loadTeamList();

	App.bot.on('connect', () => {
		BattleBot.init();
	});

	App.bot.on('disconnect', () => {
		BattleBot.init();
		TourManager.clearData();
		ChallManager.clean();
		PokeBattleManager.clean();
	});

	App.bot.on('pm', (by, msg) => {
		ChallManager.parsePM(Text.toId(by), msg);
	});

	App.bot.on('pmsent', (by, msg) => {
		ChallManager.parsePMSent(Text.toId(by), msg);
	});

	App.bot.on('line', (room, line, spl, isIntro) => {
		switch (spl[0]) {
			case 'updatesearch':
				{
					let searchData = spl.slice(1);
					try {
						searchData = JSON.parseNoPrototype(searchData);
						if (searchData !== null && typeof searchData === "object" && searchData.searching !== null && Array.isArray(searchData.searching)) {
							LadderManager.onUpdateSearching(searchData.searching);
						}
					} catch (err) {
						App.reportCrash(err);
					}
				}
				break;
			case 'popup':
				if ((spl[1] + "").toLowerCase().startsWith("your team was rejected")) {
					App.log("[Battle Teams] Warning: Team rejected. Given reason: " + spl.slice(1).join("|"));
					TourManager.reportRejection();
				}
				break;
			case 'raw':
				if ((spl[1] + "").startsWith('<div class="infobox infobox-limited">This tournament includes:')) {
					TourManager.handleTourWithCustomRules(room);
				}
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

	return BattleModule;
};
