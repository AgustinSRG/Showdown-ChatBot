/**
 * Custom rules utils
 */

'use strict';

const Text = Tools("text");

/**
 * Parses battle custom rules
 * @param {String} rulesStr List of rules separated by commas
 * @returns {Array} The parsed rules as objects
 */
exports.parseCustomRules = function (rulesStr) {
	return rulesStr.split(",").map(r => r.trim()).filter(r => !!r)
		.map(r => {
			const parts = r.split("=");

			return {
				id: Text.toId(parts[0] || ""),
				value: (parts[1] || "").trim(),
			};
		});
};

const SAFE_RULES = [
	'Team Preview',
	'Tera Type Preview',
	'Blitz',
	'VGC Timer',
	'Sleep Clause Mod',
	'Stadium Sleep Clause',
	'Switch Priority Clause Mod',
	'Desync Clause Mod',
	'Deoxys Camouflage Clause Mod',
	'Freeze Clause Mod',
	'No Freeze Mod',
	'Mega Rayquaza Clause',
	'Dynamax Clause',
	'Terastal Clause',
	'Inverse Mod',
	'Camomons Mod',
	'350 Cup Mod',
	'Flipped Mod',
	'Scalemons Mod',
	'Team Type Preview',
	'Open Team Sheets',
	'Force Open Team Sheets',
	'No Switching',
	'Guaranteed Secondary Mod',
	'Bonus Type Mod',
	'First Blood Rule',
	'Tier Shift Mod',
	'Category Swap Mod',
	'Illusion Level Mod',
	'Twisted Dimension Mod',
	'Data Preview',
	'Best Of',

].map(r => Text.toId(r));

/**
 * Checks if the rules are safe, meaning they will
 * not affect the team rules.
 * @param {Array} rules The list of rules
 * @returns {Boolean} True if all the rules are safe
 */
exports.customRulesAreSafe = function (rules) {
	for (const rule of rules) {
		if (!SAFE_RULES.includes(rule.id)) {
			return false;
		}
	}

	return true;
};
