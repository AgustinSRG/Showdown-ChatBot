/**
 * Chat Formats Converters
 */

'use strict';

const Text = Tools('text');

/**
 * @param {String} text
 * @returns {String} Text in Bold
 */
exports.bold = function (text) {
	text = Text.trim("" + text);
	return '**' + text + '**';
};

/**
 * @param {String} text
 * @returns {String} Text in Italics
 */
exports.italics = function (text) {
	text = Text.trim("" + text);
	return '__' + text + '__';
};

/**
 * @param {String} text
 * @returns {String} Text in strikethrough format
 */
exports.strikethrough = function (text) {
	text = Text.trim("" + text);
	return '~~' + text + '~~';
};

/**
 * @param {String} text
 * @returns {String} Text in code format
 */
exports.code = function (text) {
	text = Text.trim("" + text);
	return '``' + text + '``';
};

/**
 * @param {String} text
 * @returns {String} Text in superscript format
 */
exports.superscript = function (text) {
	text = Text.trim("" + text);
	return '^^' + text + '^^';
};

/**
 * @param {String} text
 * @returns {String} Link to a room
 */
exports.room = function (text) {
	return '<<' + Text.toRoomid("" + text) + '>>';
};

/**
 * @param {String} text
 * @returns {String} External link format
 */
exports.link = function (text) {
	text = Text.trim("" + text);
	return '[[' + text + ']]';
};
