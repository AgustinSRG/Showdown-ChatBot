/**
 * Moderation Filter: Spam
 */

'use strict';

const Spam_Message_Time = 15 * 1000;
const Spam_Default_Value = 3;

const Path = require('path');

const Lang_File = Path.resolve(__dirname, 'spam.translations');

exports.id = 'spam';

exports.parse = function (context) {
	let msg = context.msgLow;
	let user = context.byIdent.id;
	let room = context.room;
	let val = this.getModTypeValue(exports.id, Spam_Default_Value);

	/* Spamming links or long messages */
	if (context.infractions.indexOf("flood-spam") >= 0) {
		if (msg.indexOf("http://") > -1 || msg.indexOf("https://") > -1 || msg.indexOf("www.") > -1 || msg.length > 70 || (/\*\*.+\*\*/).test(msg)) {
			context.pointVal = 5;
			context.muteMessage = context.mlt(Lang_File, 'spam');
			return;
		}
	}

	/* Repeating */
	let times = this.chatData[room][user].times;
	let time = context.time;
	let isSpamming = (times.length >= 3 && (time - times[times.length - 3]) < Spam_Message_Time &&
		msg === this.chatData[room][user].lastMsgs[0] && this.chatData[room][user].lastMsgs[0] === this.chatData[room][user].lastMsgs[1]);
	if (isSpamming) {
		if (msg.indexOf("http://") > -1 || msg.indexOf("https://") > -1 || msg.indexOf("www.") > -1 || msg.length > 70 || (/\*\*.+\*\*/).test(msg)) {
			context.pointVal = 5;
			context.muteMessage = context.mlt(Lang_File, 'spam');
			return;
		} else {
			context.infractions.push('spam');
			context.totalPointVal += val;
			if (context.pointVal < val) {
				context.pointVal = val;
				context.muteMessage = context.mlt(Lang_File, 'spam');
			}
		}
	}

	/* Multiple infraction */
	if (context.infractions.length >= 2) {
		context.pointVal = context.totalPointVal;
		context.muteMessage = context.mlt(Lang_File, 'spam');
	}
};
