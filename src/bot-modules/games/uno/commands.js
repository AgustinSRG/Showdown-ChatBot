/**
 * Commands File
 *
 * uno: creates a game of UNO
 */

'use strict';

const Path = require('path');
const Text = Tools('text');

const DEFAULT_PLAYER_CAP = 30;
const DEFAULT_AUTO_START = 2;
const DEFAULT_AUTO_DQ = 35 / 60;

const Lang_File = Path.resolve(__dirname, 'commands.translations');

function botCanUno(room, App) {
	let roomData = App.bot.rooms[room];
	let botid = Text.toId(App.bot.getBotNick());
	return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({group: roomData.users[botid]}, 'driver'));
}

module.exports = {
	uno: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt("nochat"));
		}
		if (!botCanUno(this.room, App)) {
			return this.errorReply(this.mlt('nobot'));
		}
		let playerCap = DEFAULT_PLAYER_CAP;
		let autoStartMin = DEFAULT_AUTO_START;
		let autoDqMin = DEFAULT_AUTO_DQ;
		if (this.args[0]) {
			playerCap = parseInt(this.args[0]);
			if (isNaN(playerCap) || !isFinite(playerCap) || playerCap < 1) {
				playerCap = DEFAULT_PLAYER_CAP;
			}
		}
		if (this.args[1]) {
			autoStartMin = parseFloat(this.args[1]);
			if (isNaN(autoStartMin) || !isFinite(autoStartMin) || autoStartMin <= 0) {
				autoStartMin = DEFAULT_AUTO_START;
			}
		}
		if (this.args[2]) {
			autoDqMin = parseFloat(this.args[2]);
			if (isNaN(autoDqMin) || !isFinite(autoDqMin) || autoDqMin <= 0) {
				autoDqMin = DEFAULT_AUTO_DQ;
			}
		}
		let autoStartSec = Math.round(autoStartMin * 60);
		let autoDQSec = Math.round(autoDqMin * 60);
		this.reply([
			"/uno create " + playerCap,
			"/uno autostart " + autoStartSec,
			"/uno timer " + autoDQSec
		]);
	},
};
