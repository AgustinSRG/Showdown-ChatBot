/**
 * Moderation Filter: Caps
 */

'use strict';

const Min_Caps_Length = 18;
const Min_Caps_Proportion = 0.8;
const Caps_Default_Value = 1;

const Path = require('path');
const Text = Tools('text');
const Translator = Tools('translate');

const translator = new Translator(Path.resolve(__dirname, 'caps.translations'));

exports.id = 'caps';

exports.parse = function (context) {
	let msg = context.noNicksMsg;
	let capsMatch = msg.replace(/[^A-Za-z]/g, '').match(/[A-Z]/g);
	capsMatch = capsMatch && Text.toId(msg).length > Min_Caps_Length &&
		(capsMatch.length >= Math.floor(Text.toId(msg).length * Min_Caps_Proportion));
	let val = this.getModTypeValue(exports.id, Caps_Default_Value);
	if (capsMatch) {
		context.infractions.push(exports.id);
		context.totalPointVal += val;
		if (context.pointVal < val) {
			context.pointVal = val;
			context.muteMessage = translator.get('caps', this.getLanguage(context.room));
		}
	}
};
