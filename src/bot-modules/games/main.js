/**
 * Bot Module: Games
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');

const Lang_File = Path.resolve(__dirname, 'errors.translations');

const Game = require(Path.resolve(__dirname, 'game.js'));

exports.setup = function (App) {
	const GamesModule = {};
	const games = GamesModule.games = {};

	function getLanguage(room) {
		return App.config.language.rooms[room] || App.config.language['default'];
	}

	const Error_Open = '<div class="message-error">';
	const Error_Close = '</div>';

	const Error_Msg = 'There is already a game';

	function parseErrorMessage(room, spl) {
		let msg = spl.splice(1).join('|');
		if (msg.substr(0, Error_Open.length) === Error_Open) {
			msg = msg.substr(Error_Open.length, msg.length - (Error_Open.length + Error_Close.length));
			/* Specific error messages, may be updated frecuently */
			if (msg.substr(0, Error_Msg.length) === Error_Msg) {
				App.bot.sendTo(room, App.multilang.mlt(Lang_File, getLanguage(room), 0));
			}
		}
	}

	App.bot.on('line', (room, line, spl, isIntro) => {
		if (isIntro) return;
		if (spl[0] === 'html') return parseErrorMessage(room, spl);
	});

	GamesModule.createGame = function (room, system, commands) {
		if (games[room]) return false;
		games[room] = new Game(GamesModule, room, system);
		games[room].setCommands(commands);
		games[room].start();
		return true;
	};

	GamesModule.terminateGame = function (room) {
		if (!games[room]) return false;
		games[room].destroy();
		delete games[room];
		return true;
	};

	App.bot.on('disconnect', () => {
		for (let room in games) {
			GamesModule.terminateGame(room);
		}
	});

	App.parser.addTrigger('games', 'before', context => {
		let room = context.room;
		if (room && games[room]) {
			let cmd = games[room].commands[context.cmd];
			if (typeof cmd === 'string') {
				cmd = games[room].commands[cmd];
			}
			if (typeof cmd === 'function') {
				cmd.call(context, games[room]);
				return true;
			}
		}
		return false;
	});

	GamesModule.templates = {};

	let files = FileSystem.readdirSync(__dirname);
	files.forEach(file => {
		let mainFile = Path.resolve(__dirname, file, 'system.js');
		if (FileSystem.existsSync(mainFile) && FileSystem.statSync(mainFile).isFile()) {
			try {
				GamesModule.templates[file] = require(mainFile);
				if (typeof GamesModule.templates[file].setup === "function") {
					GamesModule.templates[file] = GamesModule.templates[file].setup(App);
				}
			} catch (err) {
				App.reportCrash(err);
			}
		}
	});

	return GamesModule;
};
