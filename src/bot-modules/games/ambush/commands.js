/**
 * Commands File
 *
 * ambush: creates a game of Ambush
 */

'use strict';

const Path = require('path');
const Text = Tools('text');

const Lang_File = Path.resolve(__dirname, 'commands.translations');
const trigger = require(Path.resolve(__dirname, 'cmd-trigger.js'));

module.exports = {
	ambush: function (App) {
		this.setLangFile(Lang_File);
		const Ambush = App.modules.games.system.templates.ambush;
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		if (this.getRoomType(this.room) !== 'chat') return this.errorReply(this.mlt('nochat'));
		let maxPlayers = parseInt(this.arg);
		if (Text.toId(this.arg) === 'infinite') {
			maxPlayers = 0;
		}
		if (isNaN(maxPlayers) || (maxPlayers < 2 && maxPlayers !== 0)) {
			return this.errorReply(this.usage({desc: this.mlt('maxplayers')}));
		}
		let ambush = new Ambush(this.room, maxPlayers);
		if (!App.modules.games.system.createGame(this.room, ambush, trigger)) {
			return this.errorReply(this.mlt(1));
		}
	},
};
