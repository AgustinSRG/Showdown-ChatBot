/**
 * Random Decision
 */

'use strict';

exports.setup = function () {
	exports.id = "random";

	exports.decide = function (battle, decisions) {
		return decisions[Math.floor(Math.random() * decisions.length)];
	};

	return module.exports;
};
