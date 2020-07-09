/**
 * Eval Tool
 */

'use strict';

const Util = require('util');

/**
 * Evaluates a script and returns the result
 * @param {String} script
 * @param {ChatBotApp} App
 * @returns {String} The result
 */
function getEvalResult(script, App) {
	try {
		if (App.jsInject) {
			return ('' + JSON.stringify(eval(script)));
		} else {
			return "[Javascript injection is disabled]";
		}
	} catch (err) {
		return ('' + Util.inspect(err));
	}
}

module.exports = getEvalResult;
