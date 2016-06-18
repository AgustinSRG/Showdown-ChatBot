/**
 * This module loads the basic server handlers
 * from the path "handlers/"
 */

'use strict';

const FileSystem = require('fs');
const Path = require('path');

FileSystem.readdirSync(Path.resolve(__dirname, 'handlers/')).forEach(file => {
	if (/.*\.js/.test(file)) {
		require(Path.resolve(__dirname, 'handlers/', file));
	}
});
