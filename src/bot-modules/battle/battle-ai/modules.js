/**
 * Battle modules
 */

'use strict';

const modFiles = ['singles-eff.js', 'ingame-nostatus.js', 'free-for-all-simple.js', 'free-for-all-complex.js', 'multi-simple.js', 'random.js', 'random-move.js', 'random-switch.js', 'random-move-no-dynamax.js'];

const Path = require('path');
const Text = Tools('text');

exports.setup = function (App, BattleData, CustomModules) {
	const BattleModulesManager = Object.create(null);
	const modules = BattleModulesManager.modules = Object.create(null);

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

	BattleModulesManager.find = function (modid) {
		if (modules[modid]) {
			return modules[modid];
		} else {
			return null;
		}
	};

	BattleModulesManager.choose = function (battle) {
		if (!battle.tier) return null;

		let tier = Text.toId(battle.tier);

		/* Custom modules */

		for (let module of Object.values(CustomModules)) {
			if (!module.module) {
				try {
					module.module = module.setupFunc(BattleData);
				} catch (e) {
					App.reportCrash(e);
					continue;
				}
			}

			const modid = module.module.id;

			if (module.formats.indexOf(tier) >= 0) {
				battle.debug("Battle module [" + battle.id + "] - Using " + modid + " (Custom - Add-On)");
				return module.module;
			}
		}

		/* Configured Modules */

		if (App.config.modules.battle.battlemods[tier]) {
			let modid = App.config.modules.battle.battlemods[tier];
			if (modules[modid]) {
				if (!modules[modid].gametypes || modules[modid].gametypes.indexOf(battle.gametype) !== -1) {
					battle.debug("Battle module [" + battle.id + "] - Using " + modid + " (user configuration)");
					return modules[modid];
				} else {
					battle.debug("Battle module [" + battle.id + "] - Incompatible (user configuration)");
				}
			}
		}

		/* Module decision by default */

		if ((tier + "").endsWith("1v1")) {
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

		if (modules["ingame-nostatus"] && battle.gametype in { 'singles': 1, 'doubles': 1, 'triples': 1 }) {
			battle.debug("Battle module [" + battle.id + "] - Using ingame-nostatus");
			return modules["ingame-nostatus"];
		}

		if (modules["free-for-all-complex"] && battle.gametype in { 'freeforall': 1 }) {
			battle.debug("Battle module [" + battle.id + "] - Using free-for-all-complex");
			return modules["free-for-all-complex"];
		}

		if (modules["multi-simple"] && battle.gametype in { 'multi': 1 }) {
			battle.debug("Battle module [" + battle.id + "] - Using multi-simple");
			return modules["multi-simple"];
		}

		/* Random, no module designed */
		battle.debug("Battle module [" + battle.id + "] - Not found, using random");
		return null;
	};

	return BattleModulesManager;
};
