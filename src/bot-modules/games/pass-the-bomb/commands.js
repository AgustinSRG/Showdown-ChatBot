/**
 * Commands File
 *
 * passbomb: creates a game of Pass-The-Bomb
 */

'use strict';

const Path = require('path');
const Text = Tools('text');

const Lang_File = Path.resolve(__dirname, 'commands.translations');
const trigger = require(Path.resolve(__dirname, 'cmd-trigger.js'));

module.exports = {
	passbomb: function (App) {
		this.setLangFile(Lang_File);
		const PassBomb = App.modules.games.system.templates['pass-the-bomb'];
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		if (this.getRoomType(this.room) !== 'chat') return this.errorReply(this.mlt('nochat'));
		let maxPlayers = parseInt(this.arg);
		if (Text.toId(this.arg) === 'infinite') {
			maxPlayers = 0;
		}
		if (isNaN(maxPlayers) || (maxPlayers < 2 && maxPlayers !== 0)) {
			return this.errorReply(this.usage({desc: this.mlt('maxplayers')}));
		}
		let passbomb = new PassBomb(this.room, maxPlayers);
		if (!App.modules.games.system.createGame(this.room, passbomb, trigger)) {
			return this.errorReply(this.mlt(1));
		}
	},
};
