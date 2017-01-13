/**
 * Moderation Filter: Spoiler
 */

'use strict';

const Spoiler_Default_Value = 2;

const Path = require('path');

const Lang_File = Path.resolve(__dirname, 'spoiler.translations');

exports.id = 'spoiler';

exports.parse = function (context) {
	let msg = context.msgLow;
	let val = this.getModTypeValue(exports.id, Spoiler_Default_Value);
	if (msg.indexOf("spoiler:") > -1 || msg.indexOf("spoilers:") > -1) {
		context.infractions.push(exports.id);
		context.totalPointVal += val;
		if (context.pointVal < val) {
			context.pointVal = val;
			context.muteMessage = context.mlt(Lang_File, 'spoiler');
		}
	}
};
