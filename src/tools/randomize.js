/**
 * Randomize / Suffle function
 */

'use strict';

/**
 * Randomizes an array
 * @param {Array} array
 * @returns {Array}
 */
function randomize(array) {
	let newArray = array.slice();
	let i = array.length, j, x;
	while (i) {
		j = Math.floor(Math.random() * i);
		x = newArray[--i];
		newArray[i] = newArray[j];
		newArray[j] = x;
	}
	return newArray;
}

module.exports = randomize;
