/*
 * Bot Module: Timers
 */

'use strict';

const Path = require('path');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'timers.translations'));

function getLanguage(room) {
	return App.config.language.rooms[room] || App.config.language['default'];
}

const timers = exports.timers = {};

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
		App.bot.sendTo(this.room, "**Timer:** " + translator.get(0, this.lang) + ' ' + this.getDiff() + ' ' + translator.get(1, this.lang));
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
			dates.push(minutes + ' ' + (minutes === 1 ? translator.get('minute', this.lang) : translator.get('minutes', this.lang)));
		}
		if (seconds > 0) {
			dates.push(seconds + ' ' + (seconds === 1 ? translator.get('second', this.lang) : translator.get('seconds', this.lang)));
		}
		return dates.join(', ');
	}

	midAnnounce() {
		this.timer2 = null;
		App.bot.sendTo(this.room, "**Timer:** " + translator.get(0, this.lang) + ' ' + this.getDiff() + ' ' + translator.get(1, this.lang));
	}

	end() {
		this.timer1 = null;
		App.bot.sendTo(this.room, translator.get(2, this.lang));
		exports.stopTimer(this.room);
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
	for (let room in timers) {
		timers[room].clear();
		delete timers[room];
	}
});

exports.createTimer = function (room, time) {
	if (timers[room]) return false;
	timers[room] = new Timer(room, time);
	return true;
};

exports.stopTimer = function (room) {
	if (!timers[room]) return false;
	timers[room].clear();
	delete timers[room];
	return true;
};

