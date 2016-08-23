/**
 * CheckDir function
 */

'use strict';

const FileSystem = require('fs');

/**
 * Checks if a directory exists and, if not, makes it
 * @param {Path} path
 */
function checkDir(path) {
	if (!FileSystem.existsSync(path)) {
		try {
			FileSystem.mkdirSync(path);
		} catch (err) {
			throw err;
		}
	}
}

module.exports = checkDir;
