/**
 * Eval Tool
 */

'use strict';

const Util = require('util');

/**
 * Evaluates a script and returns the result
 * @param {String} script
 * @returns {String} The result
 */
function getEvalResult(script) {
	try {
		return JSON.stringify(eval(script));
	} catch (err) {
		return Util.inspect(err);
	}
}

module.exports = getEvalResult;
