/**
 * Misc String utils
 */

'use strict';

exports.toId = function (str) {
	if (!str) return '';
	return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

exports.toRoomid = function (str) {
	if (!str) return '';
	return str.replace(/[^a-zA-Z0-9-]+/g, '').toLowerCase();
};

exports.toCmdid = function (str) {
	if (!str) return '';
	return str.replace(/[^_a-zA-Z0-9-]+/g, '').toLowerCase();
};
exports.toCmdTokenid = function (str) {
	if (!str) return '';
	return str.replace(/ /g, '').toLowerCase();
};

exports.trim = function (str) {
	if (!str) return '';
	return str.trim();
};

exports.escapeHTML = function (str) {
	if (!str) return '';
	return ('' + str).escapeHTML();
};

exports.stripCommands = function (text) {
	if (!text) return '';
	return ((text.trim().charAt(0) === '/') ? '/' : ((text.trim().charAt(0) === '!') ? ' ' : '')) + text.trim();
};

exports.toChatMessage = function (text) {
	if (!text) return '';
	return (text.replace(/\n/, '').trim());
};

exports.levenshtein = function (s, t, l) { // s = string 1, t = string 2, l = limit
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

exports.randomId = function (length) {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let str = '';
	for (let i = 0; i < length; i++) {
		str += chars.charAt(~~(Math.random() * chars.length));
	}
	return str;
};

exports.randomToken = function (length) {
	const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
	let str = '';
	for (let i = 0; i < length; i++) {
		str += chars.charAt(~~(Math.random() * chars.length));
	}
	return str;
};

exports.parseUserIdent = function (ident) {
	return {
		ident: ident,
		id: exports.toId(ident),
		group: ident.charAt(0),
		name: ident.substr(1),
	};
};
