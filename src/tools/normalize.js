/**
 * Normalize string util
 */

'use strict';

const Text = Tools('text');

function normalize_init() {
	let str1 = "ÃÀÁÄÂÈÉËÊÌÍÏÎÒÓÖÔÙÚÜÛãàáäâèéëêìíïîòóöôùúüûÑÇç";
	let str2 = "AAAAAEEEEIIIIOOOOUUUUaaaaaeeeeiiiioooouuuuñcc";
	let map = {};
	for (let i = 0; i < str1.length; i++) {
		map[str1.charAt(i)] = str2.charAt(i);
	}
	return map;
}

const normalObj = normalize_init();

/**
 * Normalizes a string
 * @param {String} str
 * @param {Boolean} noId
 * @returns {String} Normalized string
 */
function normalize(str, noId) {
	if (!str) return '';
	let res = '';
	for (let i = 0; i < str.length; i++) {
		res += normalObj[str.charAt(i)] ? normalObj[str.charAt(i)] : str.charAt(i);
	}
	if (noId) {
		return res;
	} else {
		return Text.toId(res);
	}
}

module.exports = normalize;
