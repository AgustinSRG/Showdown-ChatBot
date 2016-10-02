/**
 * Game System File
 */

'use strict';

const Path = require('path');

exports.setup = function (App) {
	return require(Path.resolve(__dirname, 'kunc.js')).setup(App);
};
