/**
 * Random Decision
 */

'use strict';

exports.id = "random";

exports.decide = function (battle, decisions) {
	return decisions[Math.floor(Math.random() * decisions.length)];
};
