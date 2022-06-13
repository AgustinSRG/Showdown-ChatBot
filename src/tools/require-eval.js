/**
 * Require-Eval tool
 */

'use strict';

function requireFromString(src, filename) {
	const Module = module.constructor;
	const m = new Module();
	m._compile(src, filename);
	return m.exports;
}

function run(file, script) {
	return requireFromString(script, file);
}

exports.run = run;
