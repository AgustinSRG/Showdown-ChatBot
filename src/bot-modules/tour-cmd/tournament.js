/**
 * Tournament
 */

'use strict';

class Tournament {
	constructor(app, room, details) {
		this.app = app;
		this.format = details.format || 'randombattle';
		this.type = details.type || 'elimination';
		this.users = 0;
		this.maxUsers = details.maxUsers || null;
		this.signups = false;
		this.started = false;
		this.startTimer = null;
		this.room = room || 'lobby';
		this.timeToStart = details.timeToStart || 30 * 1000;
		this.autodq = details.autodq || false;
		this.scoutProtect = details.scoutProtect || false;
		this.forcedTimer = details.forcedTimer || false;
	}

	create() {
		this.app.bot.sendTo(this.room, '/tournament create ' + this.format + ', ' + this.type);
	}

	startTimeout() {
		if (!this.timeToStart) return;
		this.signups = true;
		let cmds = [];
		if (this.timeToStart) {
			cmds.push('/tournament autostart ' + (this.timeToStart / 60000));
		}
		if (this.autodq) {
			cmds.push('/tournament autodq ' + this.autodq);
		}
		if (this.scoutProtect) {
			cmds.push('/tournament setscouting disallow');
		}
		if (this.forcedTimer) {
			cmds.push('/tournament forcetimer on');
		}
		if (this.app.config.modules.tourcmd.createMessage) {
			cmds.push(this.app.config.modules.tourcmd.createMessage);
		}
		if (cmds.length > 0) this.app.bot.sendTo(this.room, cmds);
	}

	checkUsers() {
		if (!this.maxUsers) return;
		if (this.maxUsers <= this.users) this.start();
	}

	start() {
		this.app.bot.sendTo(this.room, '/tournament start');
	}

	end() {
		this.app.bot.sendTo(this.room, '/tournament end');
	}
}

module.exports = Tournament;
