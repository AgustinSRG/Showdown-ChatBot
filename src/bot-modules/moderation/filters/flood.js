/**
 * Moderation Filter: Flood
 */

'use strict';

const Flood_Message_Num = 5;
const Flood_Message_Time = 6 * 1000;
const Flood_Per_Msg_Min = 500;
const Flood_Default_Value = 2;

const Path = require('path');

const Lang_File = Path.resolve(__dirname, 'flood.translations');

exports.id = 'flood';

exports.parse = function (context) {
	let user = context.byIdent.id;
	let room = context.room;
	let times = this.chatData[room][user].times;
	let time = context.time;
	let val = this.getModTypeValue(exports.id, Flood_Default_Value);
	if (times.length >= Flood_Message_Num && (time - times[times.length - Flood_Message_Num]) < Flood_Message_Time) {
		let isFlooding = true;
		for (let i = this.chatLog[room].users.length - 2; i > this.chatLog[room].users.length - 4; i--) {
			if (this.chatLog[room].users[i] !== this.chatLog[room].users[this.chatLog[room].users.length - 1]) {
				isFlooding = false;
				break;
			}
		}
		if (isFlooding) {
			context.infractions.push('flood-spam');
			context.totalPointVal += val;
			if (context.pointVal < val) {
				context.pointVal = val;
				context.muteMessage = context.mlt(Lang_File, 'flood');
			}
			return;
		}
	}
	let isFlooding = (times.length >= Flood_Message_Num &&
		(time - times[times.length - Flood_Message_Num]) < Flood_Message_Time &&
		(time - times[times.length - Flood_Message_Num]) > (Flood_Per_Msg_Min * Flood_Message_Num));
	if (isFlooding) {
		context.infractions.push(exports.id);
		context.totalPointVal += val;
		if (context.pointVal < val) {
			context.pointVal = val;
			context.muteMessage = context.mlt(Lang_File, 'flood');
		}
	}
};
