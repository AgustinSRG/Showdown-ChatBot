/**
 * Bot Module: Timers
 */

'use strict';

const Path = require('path');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'timers.translations');

exports.setup = function (App) {
	function getLanguage(room) {
		return App.config.language.rooms[room] || App.config.language['default'];
	}

	function trans(room, key, vars) {
		 return App.multilang.mlt(Lang_File, getLanguage(room), key, vars);
	}

	class TimersModule {
		constructor() {
			this.timers = {};
		}

		createTimer(room, time) {
			if (this.timers[room]) return false;
			this.timers[room] = new Timer(room, time);
			return true;
		}

		stopTimer(room) {
			if (!this.timers[room]) return false;
			this.timers[room].clear();
			delete this.timers[room];
			return true;
		}
	}

	const TimersMod = new TimersModule();

	class Timer {
		constructor(room, time) {
			this.room = room;
			this.lang = getLanguage(this.room);
			this.time = time;
			this.started = Date.now();
			let halfTime = Math.floor(time / 2);
			if (halfTime > 0) {
				this.timer2 = setTimeout(this.midAnnounce.bind(this), halfTime);
			}
			this.timer1 = setTimeout(this.end.bind(this), time);
			let diff = this.getDiff();
			App.bot.sendTo(this.room, Chat.bold("Timer:") + " " + trans(this.room, (diff.substr(0, 2) === '1 ' ? 3 : 0)) + ' ' +
			diff + ' ' + trans(this.room, 1));
		}

		getDiff() {
			let dates = [];
			let diff = Math.floor(this.time - (Date.now() - this.started));
			if (diff % 1000 > 0) {
				diff = Math.floor(diff / 1000) + 1;
			} else {
				diff = Math.floor(diff / 1000);
			}
			let seconds = diff % 60;
			let minutes = Math.floor(diff / 60);
			if (minutes > 0) {
				dates.push(minutes + ' ' + (minutes === 1 ? trans(this.room, 'minute') : trans(this.room, 'minutes')));
			}
			if (seconds > 0) {
				dates.push(seconds + ' ' + (seconds === 1 ? trans(this.room, 'second') : trans(this.room, 'seconds')));
			}
			return dates.join(', ');
		}

		midAnnounce() {
			this.timer2 = null;
			let diff = this.getDiff();
			App.bot.sendTo(this.room, Chat.bold("Timer:") + " " + trans(this.room, (diff.substr(0, 2) === '1 ' ? 3 : 0)) + ' ' +
			diff + ' ' + trans(this.room, 1));
		}

		getAnnounce() {
			let diff = this.getDiff();
			let str = Chat.bold("Timer:") + " " + trans(this.room, (diff.substr(0, 2) === '1 ' ? 3 : 0)) +
				' ' + diff + ' ' + trans(this.room, 1);
			return str;
		}

		end() {
			this.timer1 = null;
			App.bot.sendTo(this.room, Chat.bold(trans(this.room, 2)));
			TimersMod.stopTimer(this.room);
		}

		clear() {
			if (this.timer1) {
				clearTimeout(this.timer1);
				this.timer1 = null;
			}
			if (this.timer2) {
				clearTimeout(this.timer2);
				this.timer2 = null;
			}
		}
	}

	App.bot.on('disconnect', () => {
		for (let room in TimersMod.timers) {
			TimersMod.timers[room].clear();
			delete TimersMod.timers[room];
		}
	});

	return TimersMod;
};
