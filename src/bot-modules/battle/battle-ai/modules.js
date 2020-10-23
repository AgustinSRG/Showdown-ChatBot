/**
 * Battle modules
 */

'use strict';

const modFiles = ['singles-eff.js', 'ingame-nostatus.js', 'random.js', 'random-move.js', 'random-switch.js', 'random-move-no-dynamax.js'];

const Path = require('path');
const Text = Tools('text');

exports.setup = function (App, BattleData) {
	const BattleModulesManager = {};
	const modules = BattleModulesManager.modules = {};

	modFiles.forEach(function (file) {
		let mod;
		try {
			mod = require(Path.resolve(__dirname, "modules", file)).setup(BattleData);
			if (!mod.id) return;
			modules[mod.id] = mod;
		} catch (e) {
			App.reportCrash(e);
		}
	});

	BattleModulesManager.choose = function (battle) {
		if (!battle.tier) return null;

		/* Configured Modules */

		let tier = Text.toId(battle.tier);

		if (App.config.modules.battle.battlemods[tier]) {
			let modid = App.config.modules.battle.battlemods[tier];
			if (battle.gametype === "singles" || modid !== "singles-eff") {
				if (modules[modid]) {
					battle.debug("Battle module [" + battle.id + "] - Using " + modid + " (user configuration)");
					return modules[modid];
				}
			} else {
				battle.debug("Battle module [" + battle.id + "] - Incompatible (user configuration)");
			}
		}

		/* Module decision by default */

		if (tier in {'gen7challengecup1v1': 1, 'challengecup1v1': 1, '1v1': 1}) {
			if (modules["ingame-nostatus"]) {
				battle.debug("Battle module [" + battle.id + "] - Using ingame-nostatus");
				return modules["ingame-nostatus"];
			}
		}

		if (battle.gametype === "singles") {
			if (modules["singles-eff"]) {
				battle.debug("Battle module [" + battle.id + "] - Using singles-eff");
				return modules["singles-eff"];
			}
		}

		if (modules["ingame-nostatus"]) {
			battle.debug("Battle module [" + battle.id + "] - Using ingame-nostatus");
			return modules["ingame-nostatus"];
		}

		/* Random, no module designed */
		battle.debug("Battle module [" + battle.id + "] - Not found, using random");
		return null;
	};

	return BattleModulesManager;
};
