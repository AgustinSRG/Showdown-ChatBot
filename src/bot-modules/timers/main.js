/**
 * Bot Module: Timers
 */

'use strict';

const Path = require('path');
const Chat = Tools('chat');
const Text = Tools('text');

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
			this.db = App.dam.getDataBase('room-timers.json');
			this.data = this.db.data;

			if (!this.data.timers) {
				this.data.timers = {};
			}

			this.timers = this.data.timers;

			if (!this.data.repeats) {
				this.data.repeats = {};
			}

			this.repeats = this.data.repeats;
		}

		save() {
			this.db.write();
		}

		checkTimers() {
			for (let timer of Object.values(this.timers)) {
				if (Date.now() >= timer.ends) {
					App.bot.sendTo(timer.room, Chat.bold(trans(timer.room, 2)));
					delete this.timers[timer.room];
					this.save();
				} else if (!timer.midAnnounced && Date.now() >= timer.mid) {
					let diff = this.getDiff(timer);
					App.bot.sendTo(timer.room, Chat.bold("Timer:") + " " + trans(timer.room, (diff.substr(0, 2) === '1 ' ? 3 : 0)) + ' ' +
						diff + ' ' + trans(timer.room, 1));
					timer.midAnnounced = true;
					this.save();
				}
			}
		}

		getAnnounce(timer) {
			let diff = this.getDiff(timer);
			let str = Chat.bold("Timer:") + " " + trans(timer.room, (diff.substr(0, 2) === '1 ' ? 3 : 0)) +
				' ' + diff + ' ' + trans(timer.room, 1);
			return str;
		}

		getDiff(timer) {
			let dates = [];
			let diff = Math.floor(timer.ends - Date.now());
			if (diff % 1000 > 0) {
				diff = Math.floor(diff / 1000) + 1;
			} else {
				diff = Math.floor(diff / 1000);
			}
			let seconds = diff % 60;
			let minutes = Math.floor(diff / 60);
			if (minutes > 0) {
				dates.push(minutes + ' ' + (minutes === 1 ? trans(timer.room, 'minute') : trans(timer.room, 'minutes')));
			}
			if (seconds > 0) {
				dates.push(seconds + ' ' + (seconds === 1 ? trans(timer.room, 'second') : trans(timer.room, 'seconds')));
			}
			return dates.join(', ');
		}

		createTimer(room, time) {
			if (this.timers[room]) return false;
			this.timers[room] = {
				room: room,
				ends: Date.now() + time,
				mid: Date.now() + (time / 2),
				midAnnounced: false,
			};

			App.bot.sendTo(room, this.getAnnounce(this.timers[room]));
			this.save();
			return true;
		}

		stopTimer(room) {
			if (!this.timers[room]) return false;
			delete this.timers[room];
			this.save();
			return true;
		}

		checkRepeats() {
			for (let repeat of Object.values(this.repeats)) {
				if (Date.now() >= repeat.next) {
					this.sendRepeat(repeat);
					repeat.next = Date.now() + repeat.interval;
					this.save();
				}
			}
		}

		createRepeat(room, text, interval) {
			this.repeats[room] = {
				room: room,
				text: text,
				interval: interval,
				next: Date.now() + interval,
			};
			this.sendRepeat(this.repeats[room]);
			this.save();
			return true;
		}

		sendRepeat(repeat) {
			let roomData = App.parser.bot.rooms[repeat.room];
			let botid = Text.toId(App.parser.bot.getBotNick());
			if (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({group: roomData.users[botid]}, 'driver')) {
				// Can announce
				App.bot.sendTo(repeat.room, "/announce " + repeat.text);
			} else {
				App.bot.sendTo(repeat.room, Text.stripCommands(repeat.text));
			}
		}

		cancelRepeat(room) {
			if (!this.repeats[room]) return false;
			delete this.repeats[room];
			this.save();
			return true;
		}

		check() {
			this.checkTimers();
			this.checkRepeats();
		}
	}

	const TimersMod = new TimersModule();

	setInterval(TimersMod.check.bind(TimersMod), 500);

	return TimersMod;
};
