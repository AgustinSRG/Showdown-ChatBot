/**
 * CheckDir function
 * checks if a directory exists and, if not, makes it.
 */

'use strict';

const FileSystem = require('fs');

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
