/**
 * Bot Game
 */

'use strict';

class Game {
	constructor(manager, room, system) {
		this.manager = manager;
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
		this.manager.terminateGame(this.room);
	}
}

module.exports = Game;
