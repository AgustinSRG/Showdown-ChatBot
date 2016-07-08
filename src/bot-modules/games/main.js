/*
 * Bot Module: Games
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');

const Game = require(Path.resolve(__dirname, 'game.js'));

const games = exports.games = {};

exports.createGame = function (room, system, commands) {
	if (games[room]) return false;
	games[room] = new Game(room, system);
	games[room].setCommands(commands);
	games[room].start();
	return true;
};

exports.terminateGame = function (room) {
	if (!games[room]) return false;
	games[room].destroy();
	delete games[room];
	return true;
};

App.bot.on('disconnect', () => {
	for (let room in games) {
		exports.terminateGame(room);
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

exports.templates = {};

let files = FileSystem.readdirSync(__dirname);
files.forEach(file => {
	let mainFile = Path.resolve(__dirname, file, 'system.js');
	if (FileSystem.existsSync(mainFile) && FileSystem.statSync(mainFile).isFile()) {
		try {
			exports.templates[file] = require(mainFile);
		} catch (err) {
			App.reportCrash(err);
		}
	}
});
