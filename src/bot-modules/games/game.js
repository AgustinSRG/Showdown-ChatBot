/**
 *  Bot Game
 */

'use strict';

class Game {
	constructor(room, system) {
		this.room = room;
		this.system = system;
		this.commands = {};
	}

	setCommands(commands) {
		this.commands = commands || {};
	}

	start() {
		if (typeof this.system.start === 'function') {
			this.system.start();
		}
	}

	destroy() {
		if (typeof this.system.destroy === 'function') {
			this.system.destroy();
		}
	}

	terminate() {
		App.modules.games.system.terminateGame(this.room);
	}
}

module.exports = Game;
