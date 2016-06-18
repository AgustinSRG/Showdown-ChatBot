/**
 * Crash Guard
 */

'use strict';

class CrashGuard {
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
