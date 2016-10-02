/**
 * Bot Module: Games
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');

const Game = require(Path.resolve(__dirname, 'game.js'));

exports.setup = function (App) {
	const GamesModule = {};
	const games = GamesModule.games = {};

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
