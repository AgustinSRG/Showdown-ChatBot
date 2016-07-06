/**
 * Battle modules
 */

'use strict';

const Path = require('path');

const Text = Tools.get('text.js');

const modules = exports.modules = {};
const modFiles = ['singles-eff.js', 'ingame-nostatus.js'];

modFiles.forEach(function (file) {
	let mod;
	try {
		mod = require(Path.resolve(__dirname, "modules", file));
		if (!mod.id) return;
		modules[mod.id] = mod;
	} catch (e) {
		App.reportCrash(e);
	}
});

exports.choose = function (battle) {
	if (!battle.tier) return null;

	/* Module decision by default */

	if (Text.toId(battle.tier) in {'challengecup1v1': 1, '1v1': 1}) {
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
