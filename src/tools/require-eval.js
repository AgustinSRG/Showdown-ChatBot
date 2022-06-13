/**
 * Require-Eval tool
 */

'use strict';

const ModuleFromString = require("module-from-string");

function run(App, script) {
	return ModuleFromString.importFromStringSync(script, { globals: global });
}

exports.run = run;
