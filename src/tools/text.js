/**
 * Misc String utils
 */

'use strict';

/**
 * Transforms string to ID
 * @param {String} str
 * @returns {String} id
 */
exports.toId = function (str) {
	if (!str) return '';
	return ('' + str).toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Transforms string to Room ID
 * @param {String} str
 * @returns {String} room id
 */
exports.toRoomid = function (str) {
	if (!str) return '';
	return ('' + str).replace(/[^a-zA-Z0-9-]+/g, '').toLowerCase();
};

/**
 * Transforms string to Command ID
 * @param {String} str
 * @returns {String} command id
 */
exports.toCmdid = function (str) {
	if (!str) return '';
	return ('' + str).replace(/[^_a-zA-Z0-9-]+/g, '').toLowerCase();
};

/**
 * Transforms string to Command Token ID
 * @param {String} str
 * @returns {String} command token id
 */
exports.toCmdTokenid = function (str) {
	if (!str) return '';
	return ('' + str).replace(/ /g, '').toLowerCase();
};

/**
 * Transforms string to format ID
 * @param {String} str
 * @returns {String} format ID
 */
exports.toFormatStandard = function (str) {
	if (!str) return '';
	str = ('' + str).toLowerCase().replace(/[^a-z0-9]/g, '');
	if ((/^gen[0-9]+.*/i).test(str)) {
		return str;
	} else {
		return "gen8" + str;
	}
};

/**
 * Removes lateral blank spaces
 * @param {String} str
 * @returns {String}
 */
exports.trim = function (str) {
	if (!str) return '';
	return ('' + str).trim();
};

/**
 * Escapes HTML code
 * @param {String} str
 * @returns {String}
 */
exports.escapeHTML = function (str) {
	if (!str) return '';
	return ('' + str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/\//g, '&#x2f;');
};


exports.removeDoubleQuotes = function (str) {
	if (!str) return '';
	return ('' + str).replace(/"/g, '');
};

/**
 * Removes pokemon showdown command from a chat message
 * @param {String} text
 * @returns {String}
 */
exports.stripCommands = function (text) {
	if (!text) return '';
	text = '' + text;
	return ((text.trim().charAt(0) === '/') ? '/' : ((text.trim().charAt(0) === '!') ? ' ' : '')) + text.trim();
};

/**
 * Transforms string to  valid chat message
 * @param {String} text
 * @returns {String}
 */
exports.toChatMessage = function (text) {
	if (!text) return '';
	return ('' + text).replace(/\n/, '').trim();
};

/**
 * Gets levenshtein distsance between two strings
 * @param {String} s - String 1
 * @param {String} t - String 2
 * @param {Number} l - Limit
 * @returns {Number} levenshtein distance
 */
exports.levenshtein = function (s, t, l) {
	// Original levenshtein distance function by James Westgate, turned out to be the fastest
	let d = []; // 2d matrix
	// Step 1
	let n = s.length;
	let m = t.length;
	if (n === 0) return m;
	if (m === 0) return n;
	if (l && Math.abs(m - n) > l) return Math.abs(m - n);
	// Create an array of arrays in javascript (a descending loop is quicker)
	for (let i = n; i >= 0; i--) d[i] = [];
	// Step 2
	for (let i = n; i >= 0; i--) d[i][0] = i;
	for (let j = m; j >= 0; j--) d[0][j] = j;
	// Step 3
	for (let i = 1; i <= n; i++) {
		let s_i = s.charAt(i - 1);
		// Step 4
		for (let j = 1; j <= m; j++) {
			// Check the jagged ld total so far
			if (i === j && d[i][j] > 4) return n;
			let t_j = t.charAt(j - 1);
			let cost = (s_i === t_j) ? 0 : 1; // Step 5
			// Calculate the minimum
			let mi = d[i - 1][j] + 1;
			let b = d[i][j - 1] + 1;
			let c = d[i - 1][j - 1] + cost;
			if (b < mi) mi = b;
			if (c < mi) mi = c;
			d[i][j] = mi; // Step 6
		}
	}
	// Step 7
	return d[n][m];
};

/**
 * Gets a random ID
 * @param {Number} length
 * @returns {String} random ID
 */
exports.randomId = function (length) {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let str = '';
	for (let i = 0; i < length; i++) {
		str += chars.charAt(~~(Math.random() * chars.length));
	}
	return str;
};

/**
 * Gets a random token
 * @param {Number} length
 * @returns {String} random token
 */
exports.randomToken = function (length) {
	const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
	let str = '';
	for (let i = 0; i < length; i++) {
		str += chars.charAt(~~(Math.random() * chars.length));
	}
	return str;
};

exports.randomNumber = function (length) {
	const chars = '0123456789';
	let str = '';
	for (let i = 0; i < length; i++) {
		str += chars.charAt(~~(Math.random() * chars.length));
	}
	return str;
};

/**
 * Parses Pokemon Showdown user idents
 * @param {String} ident
 * @returns {Object} parsed ident - (id, group, name, ident)
 */
exports.parseUserIdent = function (ident) {
	ident = '' + ident;
	return {
		ident: ident,
		id: exports.toId(ident),
		group: ident.charAt(0),
		name: ident.substr(1),
	};
};
