/**
 * Basic check / assert tool
 */

'use strict';

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
