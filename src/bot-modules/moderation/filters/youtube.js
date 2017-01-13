/**
 * Moderation Filter: Youtube Channels
 */

'use strict';

const Youtube_Default_Value = 1;

const Path = require('path');

const Lang_File = Path.resolve(__dirname, 'youtube.translations');

exports.id = 'youtube';

exports.parse = function (context) {
	let msg = context.msgLow;
	let val = this.getModTypeValue(exports.id, Youtube_Default_Value);
	if (msg.indexOf("youtube.com/channel/") > -1 || msg.indexOf("youtube.com/user/") > -1) {
		context.infractions.push(exports.id);
		context.totalPointVal += val;
		if (context.pointVal < val) {
			context.pointVal = val;
			context.muteMessage = context.mlt(Lang_File, 'yt');
		}
	}
};
