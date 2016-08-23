/**
 * Basic check / assert tool
 */

'use strict';

/**
 * Throws an exception if the condition fails
 * @param {Boolean} condition
 * @param {String} msg
 */
function check(condition, msg) {
	if (!condition) {
		if (msg) {
			throw new Error(msg);
		} else {
			throw new Error('The condition is false.');
		}
	}
}

module.exports = check;
