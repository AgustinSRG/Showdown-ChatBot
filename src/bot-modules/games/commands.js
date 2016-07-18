/**
 * Commands Reader
 */

'use strict';

const FileSystem = require('fs');
const Path = require('path');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));

App.parser.addPermission('games', {group: 'owner'});

let commands = {
	endgame: "terminategame",
	terminategame: function () {
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

let files = FileSystem.readdirSync(__dirname);
files.forEach(file => {
	let cmdsFile = Path.resolve(__dirname, file, 'commands.js');
	if (FileSystem.existsSync(cmdsFile) && FileSystem.statSync(cmdsFile).isFile()) {
		try {
			Object.merge(commands, require(cmdsFile));
		} catch (err) {
			App.reportCrash(err);
		}
	}
});

module.exports = commands;
