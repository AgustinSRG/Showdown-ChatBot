/**
 * Dependencies Checker
 * Require this file to check / install the dependencies
 */

'use strict';

try {
	require('sugar');
	require('websocket');
} catch (e) {
	console.log('Installing dependencies...');
	require('child_process').spawnSync('sh', ['-c', 'npm install --production'], {stdio: 'inherit'});
}

require('sugar');
