/**
 * Require-Eval tool
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');
const uncacheTree = Tools('uncachetree');

function run(App, script) {
	let path = Path.resolve(App.dataDir, 'tmp-require.js');
	try {
		uncacheTree(path);
	} catch (e) {}
	FileSystem.writeFileSync(path, script);
	return require(path);
}

exports.run = run;
