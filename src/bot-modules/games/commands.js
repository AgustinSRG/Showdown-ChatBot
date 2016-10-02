/**
 * Commands Reader
 */

'use strict';

const Path = require('path');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));

module.exports = {
	endgame: "terminategame",
	terminategame: function (App) {
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		let room = this.targetRoom;
		if (this.getRoomType(room) !== 'chat') return this.errorReply(translator.get('nochat', this.lang));
		if (App.modules.games.system.terminateGame(room)) {
			this.reply(translator.get('end', this.lang));
		} else {
			return this.errorReply(translator.get('nogame', this.lang));
		}
	},
};

