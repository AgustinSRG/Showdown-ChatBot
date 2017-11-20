/**
 * Moderation Filter: Caps
 */

'use strict';

const Min_Caps_Length = 18;
const Min_Caps_Proportion = 0.8;
const Caps_Default_Value = 1;

const Path = require('path');

const Lang_File = Path.resolve(__dirname, 'caps.translations');

exports.id = 'caps';

exports.parse = function (context) {
	let msg = context.noNicksMsg;
	let capsMatch = msg.match(/[A-Z]/g);
	capsMatch = capsMatch && msg.length > Min_Caps_Length &&
		(capsMatch.length >= Math.floor(msg.length * Min_Caps_Proportion));
	if (capsMatch || msg.match(/[A-Z\s]{18,}/)) {
		let val = this.getModTypeValue(exports.id, Caps_Default_Value);
		context.infractions.push(exports.id);
		context.totalPointVal += val;
		if (context.pointVal < val) {
			context.pointVal = val;
			context.muteMessage = context.mlt(Lang_File, 'caps');
		}
	}
};
