/**
 * Commands File
 *
 * anagrams: creates a game of Anagrams
 * hangman: creates a game of hangman
 */

'use strict';

const Path = require('path');
const Text = Tools('text');

const Lang_File = Path.resolve(__dirname, 'commands.translations');
const trigger = require(Path.resolve(__dirname, 'cmd-trigger.js'));

function botCanHangman(room, App) {
	let roomData = App.bot.rooms[room];
	let botid = Text.toId(App.bot.getBotNick());
	return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({group: roomData.users[botid]}, 'driver'));
}

module.exports = {
	anagrams: function (App) {
		this.setLangFile(Lang_File);
		const Anagrams = App.modules.games.system.templates.wordgames.anagrams;
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		if (!this.arg) {
			return this.errorReply(this.usage({desc: this.mlt('games')},
				{desc: this.mlt('maxpoints'), optional: true}, {desc: this.mlt('anstime'), optional: true}));
		}
		let args = this.args;
		if (this.getRoomType(this.room) !== 'chat') return this.errorReply(this.mlt('nochat'));
		let games = parseInt(args[0]);
		if (Text.toId(args[0]) === 'inf' || Text.toId(args[0]) === 'infinite') {
			games = 0;
		}
		let points = parseInt(args[1] || "0");
		if (Text.toId(args[1]) === 'inf' || Text.toId(args[1]) === 'infinite') {
			points = 0;
		}
		let ansTime = parseInt(args[2] || "30");
		if (isNaN(ansTime) || ansTime < 10 || ansTime > 300) {
			return this.errorReply(this.mlt(0));
		}
		if (games < 0 || points < 0 || isNaN(games) || isNaN(points)) {
			return this.errorReply(this.usage({desc: this.mlt('games')},
				{desc: this.mlt('maxpoints'), optional: true}, {desc: this.mlt('anstime'), optional: true}));
		}
		if (App.modules.games.system.templates.wordgames.isDataEmpty()) {
			return this.errorReply(this.mlt(2));
		}
		let anagrams = new Anagrams(this.room, games, points, ansTime * 1000);
		if (!App.modules.games.system.createGame(this.room, anagrams, trigger.anagrams)) {
			return this.errorReply(this.mlt(1));
		}
	},

	texthangman: function (App) {
		this.setLangFile(Lang_File);
		const Hangman = App.modules.games.system.templates.wordgames.hangman;
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		if (this.getRoomType(this.room) !== 'chat') return this.errorReply(this.mlt('nochat'));
		let maxFails = parseInt(this.arg || '0');
		if (isNaN(maxFails) || maxFails < 0) {
			return this.errorReply(this.usage({desc: this.mlt('maxfails'), optional: true}));
		}
		if (App.modules.games.system.templates.wordgames.isDataEmpty()) {
			return this.errorReply(this.mlt(2));
		}
		let hangman = new Hangman(this.room, maxFails);
		if (!App.modules.games.system.createGame(this.room, hangman, trigger.hangman)) {
			return this.errorReply(this.mlt(1));
		}
	},

	hangman: function (App) {
		this.setLangFile(Lang_File);
		if (this.getRoomType(this.room) !== 'chat') return this.errorReply(this.mlt('nochat'));
		if (!this.can('games', this.room)) return this.replyAccessDenied('games');
		if (!botCanHangman(this.room, App)) {
			return this.errorReply(this.mlt('nobot'));
		}
		if (App.modules.games.system.templates.wordgames.isDataEmpty()) {
			return this.errorReply(this.mlt(2));
		}
		let data = App.modules.games.system.templates.wordgames.getRandomWord();
		this.send("/hangman create " + data.word + ", " + data.clue, this.room);
	},
};
