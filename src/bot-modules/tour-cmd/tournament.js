/**
 * Tournament
 */

'use strict';

class Tournament {
	constructor(room, details) {
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
	}

	create() {
		App.bot.sendTo(this.room, '/tournament create ' + this.format + ', ' + this.type);
	}

	startTimeout() {
		if (!this.timeToStart) return;
		this.signups = true;
		let cmds = [];
		if (this.scoutProtect) {
			cmds.push('/tournament setscouting disallow');
		}
		if (App.config.modules.tourcmd.createMessage) {
			cmds.push(App.config.modules.tourcmd.createMessage);
		}
		if (cmds.length > 0) App.bot.sendTo(this.room, cmds);
		this.startTimer = setTimeout(function () {
			this.start();
			this.started = true;
			this.startTimer = null;
		}.bind(this), this.timeToStart);
	}

	checkUsers() {
		if (!this.maxUsers) return;
		if (this.maxUsers <= this.users) this.start();
	}

	start() {
		App.bot.sendTo(this.room, '/tournament start');
	}

	setAutodq() {
		if (!this.autodq) return;
		App.bot.sendTo(this.room, '/tournament autodq ' + this.autodq);
	}

	end() {
		App.bot.sendTo(this.room, '/tournament end');
	}
}

module.exports = Tournament;
