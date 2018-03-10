/**
 * Moderation Filter: Pacman Emote
 */

'use strict';

const Pacman_Default_Value = 2;

const Path = require('path');

const Lang_File = Path.resolve(__dirname, 'pacman.translations');

exports.id = 'pacman';

exports.parse = function (context) {
	let msg = " " + context.msgLow + " ";
	let val = this.getModTypeValue(exports.id, Pacman_Default_Value);

	/* Pacman emiticon detection */

	if (msg.indexOf(":v") >= 0) {
		context.infractions.push(exports.id);
		context.pointVal = val;
		context.totalPointVal += val;
		context.muteMessage = context.mlt(Lang_File, 'pacman');
	} else if ((/([^a-z0-9](:|;|=)+(\^|-|'|`|´|~|"|[ ]|_|\.|\,)*(v|((\\|╲)+(_|[ ])*(\/|╱)+))+[^a-z0-9])|([^a-z0-9](v|((\\|╲)+(_|[ ])*(\/|╱)+))+(\^|-|'|`|´|~|"|[ ]|_|\.|\,)*(:|;)+[^a-z0-9])/i).test(msg)) {
		context.infractions.push(exports.id);
		context.pointVal = val;
		context.totalPointVal += val;
		context.muteMessage = context.mlt(Lang_File, 'pacman');
	} else if ((/([ ](:|;|=)+(\^|-|'|`|´|~|"|[ ]|_|\.|\,)*(u|((\\|╲)+(_|[ ])*(\/|╱)+))+[^a-z0-9])|([^a-z0-9](u|((\\|╲)+(_|[ ])*(\/|╱)+))+(\^|-|'|`|´|~|"|[ ]|_|\.|\,)*(:|;)+[ ])/i).test(msg.replace(/[:;=]u[:;=]/g, "   "))) {
		context.infractions.push(exports.id);
		context.pointVal = val;
		context.totalPointVal += val;
		context.muteMessage = context.mlt(Lang_File, 'pacman');
	} else if ((/((:|;|=)+(\^|-|'|`|´|~|"|[ ]|_|\.|\,)*(((\\|╲)+(_|[ ])*(\/|╱)+))+)|((((\\|╲)+(_|[ ])*(\/|╱)+))+(\^|-|'|`|´|~|"|[ ]|_|\.|\,)*(:|;|=)+)/i).test(msg)) {
		context.infractions.push(exports.id);
		context.pointVal = val;
		context.totalPointVal += val;
		context.muteMessage = context.mlt(Lang_File, 'pacman');
	}
};
