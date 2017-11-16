/**
 * Moderation Filter: Banned Words
 */

'use strict';

const Path = require('path');

const Lang_File = Path.resolve(__dirname, 'bannedwords.translations');

exports.id = 'bannedwords';

exports.parse = function (context) {
	let msgLow = context.msgLow;
	let msgAltLow = context.noNicksMsgLow;
	let banwords = context.app.modules.moderation.system.data.bannedWords[context.room];
	if (!banwords) return;
	let val = 0, wordType = '';
	for (let word in banwords) {
		let type = banwords[word].type;
		let value = banwords[word].val;
		let strict = banwords[word].strict;
		let nonicks = banwords[word].nonicks;
		let hasWord = false;

		if (!strict && !nonicks) {
			hasWord = (msgLow.indexOf(word) >= 0);
		} else if (strict && !nonicks) {
			let regex = new RegExp("[^a-z0-9A-Z]" + word.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&") + "[^a-z0-9A-Z]", 'g');
			hasWord = !!regex.test(" " + msgLow + " ");
		} else if (!strict && nonicks) {
			hasWord = (msgAltLow.indexOf(word) >= 0);
		} else if (strict && nonicks) {
			let regex = new RegExp("[^a-z0-9A-Z]" + word.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&") + "[^a-z0-9A-Z]", 'g');
			hasWord = !!regex.test(" " + msgAltLow + " ");
		}

		if (hasWord && val < value) {
			val = value;
			wordType = type;
		}
	}
	if (val > 0) {
		context.infractions.push(exports.id);
		context.totalPointVal += val;
		if (context.pointVal < val) {
			context.pointVal = val;
			switch (wordType) {
			case 'b':
				context.muteMessage = context.mlt(Lang_File, 'banword');
				break;
			case 'i':
				context.muteMessage = context.mlt(Lang_File, 'inap');
				break;
			case 'o':
				context.muteMessage = context.mlt(Lang_File, 'offense');
				break;
			case 'e':
				context.muteMessage = context.mlt(Lang_File, 'emote');
				break;
			default:
				context.muteMessage = context.mlt(Lang_File, 'banword');
				break;
			}
		}
	}
};
