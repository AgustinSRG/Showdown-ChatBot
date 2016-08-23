/**
 * Tournament results parsing util
 */

'use strict';

/**
 * Parses a tournament binary tree
 * @param {Object} tree
 * @returns {Map<String, Number>} Parsed results
 */
function parseTourTree(tree) {
	let auxobj = {};
	let team = tree.team;
	let state = tree.state;
	let children = tree.children;
	if (!children) children = [];
	if (!auxobj[team]) auxobj[team] = 0;
	if (state && state === "finished") {
		auxobj[team] += 1;
	}
	let aux;
	for (let i = 0; i < children.length; i++) {
		aux = parseTourTree(children[i]);
		for (let j in aux) {
			if (!auxobj[j]) auxobj[j] = 0;
			auxobj[j] += aux[j];
		}
	}
	return auxobj;
}

module.exports = parseTourTree;
