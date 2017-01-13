/**
 * Commands File
 *
 * terminategame: finalizes a game
 */

'use strict';

const Path = require('path');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

module.exports = {
	endgame: "terminategame",
	terminategame: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(this.mlt('nochat'));
		if (App.modules.games.system.terminateGame(room)) {
			this.reply(this.mlt('end'));
		} else {
			return this.errorReply(this.mlt('nogame'));
		}
	},
};

