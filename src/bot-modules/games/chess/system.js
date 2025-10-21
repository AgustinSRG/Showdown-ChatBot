/**
 * Game System File - Chess
 */

'use strict';

const Path = require('path');

exports.setup = function (App) {
	return require(Path.resolve(__dirname, 'chess.js')).setup(App);
};