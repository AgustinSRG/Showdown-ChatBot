/**
 * CrashGuard
 */

'use strict';

/**
 * Represents a crashguard system
 * for current process
 */
class CrashGuard {
	/**
	 * @param {function(Error)} errFunc
	 */
	constructor(errFunc) {
		this.func = function (err) {
			errFunc(err);
		};
		process.on("uncaughtException", this.func);
	}

	destroy() {
		process.removeEventListener("uncaughtException", this.func);
	}
}

module.exports = CrashGuard;
