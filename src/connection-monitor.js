/**
 * Connection Monitor for Showdown ChatBot
 * Showdown ChatBot is distributed under the terms of the MIT License
 * (https://github.com/asanrom/Showdown-ChatBot/blob/master/LICENSE)
 *
 * This file handles with connection issues
 * and bad connection closing
 */

'use strict';

class ConnectionMonitor {
	constructor(App) {
		this.app = App;
		this.timer = null;
		this.lastReceived = Date.now();
		if (!App.config.connmonitor) {
			App.config.connmonitor = {
				enabled: false,
				checktime: 10,
				room: 'lobby',
				msg: '/lagtest',
			};
		}
		App.bot.on('connect', function () {
			this.start();
		}.bind(this));
		App.bot.on('disconnect', function () {
			this.stop();
		}.bind(this));
		App.bot.on('message', function () {
			this.lastReceived = Date.now();
		}.bind(this));
	}

	start() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
		if (!this.app.config.connmonitor.enabled) return;
		this.timer = setInterval(function () {
			this.check();
		}.bind(this), this.app.config.connmonitor.checktime * 1000);
	}

	check() {
		if (!this.app.bot.isConnected()) return;
		let limit = this.app.config.connmonitor.checktime;
		let noMessage = Math.round((Date.now() - this.lastReceived) / 1000);
		if (noMessage >= (limit * 2)) {
			this.app.log("[MONITOR] Still no response. Restarting the bot...");
			this.app.restartBot();
		} else if (noMessage >= limit) {
			this.app.log("[MONITOR] No message received during " + noMessage + " seconds. Sending a test message.");
			this.app.bot.sendTo(this.app.config.connmonitor.room, this.app.config.connmonitor.msg);
		}
	}

	stop() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}
}

module.exports = ConnectionMonitor;
