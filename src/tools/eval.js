/*
 * Eval Tool
 */

'use strict';

const Util = require('util');

function getEvalResult(script) {
	try {
		return JSON.stringify(eval(script));
	} catch (err) {
		return Util.inspect(err);
	}
}

module.exports = getEvalResult;
