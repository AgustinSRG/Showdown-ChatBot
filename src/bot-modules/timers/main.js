/**
 * Bot Module: Timers
 */

'use strict';

const Path = require('path');
const Chat = Tools('chat');
const Text = Tools('text');

const TIMER_LIMIT_PER_ROOM = 32;
const REPEAT_LIMIT_PER_ROOM = 100;

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
				this.data.timers = Object.create(null);
			}

			this.timers = this.data.timers;

			if (!this.data.repeat) {
				this.data.repeat = Object.create(null);
			}

			this.repeats = this.data.repeat;
		}

		save() {
			this.db.write();
		}

		getTimers(room) {
			if (!this.timers[room]) return [];

			if (!Array.isArray(this.timers[room])) {
				this.timers[room] = [this.timers[room]];
			}

			return this.timers[room];
		}

		findTimer(room, name) {
			if (!this.timers[room]) return null;

			if (!Array.isArray(this.timers[room])) {
				this.timers[room] = [this.timers[room]];
			}

			if (this.timers[room].length === 1 && !name) {
				return this.timers[room][0];
			}

			for (let t of this.timers[room]) {
				if (Text.toId(t.name || "") === Text.toId(name || "")) {
					return t;
				}
			}

			return null;
		}

		countTimers(room) {
			if (!this.timers[room]) return 0;

			if (!Array.isArray(this.timers[room])) {
				this.timers[room] = [this.timers[room]];
			}

			return this.timers[room].length;
		}

		getTimerPrefix(timer) {
			if (timer.name) {
				return Chat.bold((timer.name + "").replace(/\*\*/g, "") + ":");
			} else {
				return Chat.bold(trans(timer.room, "timer") + ":");
			}
		}

		getTimerPrefixCode(timer) {
			if (timer.name) {
				return (timer.name + "").replace(/\*\*/g, "") + ":";
			} else {
				return trans(timer.room, "timer") + ":";
			}
		}

		deleteTimer(timer) {
			const timers = this.timers[timer.room];

			if (Array.isArray(timers)) {
				for (let i = 0; i < timers.length; i++) {
					if (Text.toId(timers[i].name || "") === Text.toId(timer.name || "")) {
						timers.splice(i, 1);
						break;
					}
				}
				if (timers.length === 0) {
					delete this.timers[timer.room];
				}
			} else {
				delete this.timers[timer.room];
			}

			this.save();
		}

		checkTimer(timer) {
			if (Date.now() >= timer.ends) {
				App.bot.sendTo(timer.room, this.getTimerPrefix(timer) + " " +
					Chat.bold(timer.user ? trans(timer.room, 4).replace("$USER", timer.user) : trans(timer.room, 2)));
				this.deleteTimer(timer);
			} else if (!timer.midAnnounced && Date.now() >= timer.mid) {
				let diff = this.getDiff(timer);
				App.bot.sendTo(timer.room, this.getTimerPrefix(timer) + " " + trans(timer.room, (diff.substr(0, 2) === '1 ' ? 3 : 0)) + ' ' +
					diff + ' ' + trans(timer.room, 1));
				timer.midAnnounced = true;
				this.save();
			}
		}

		checkTimers() {
			for (let timer of Object.values(this.timers)) {
				if (!timer) {
					continue;
				}
				if (Array.isArray(timer)) {
					for (let t of timer) {
						this.checkTimer(t);
					}
				} else {
					this.checkTimer(timer);
				}
			}
		}

		getAnnounce(timer) {
			let diff = this.getDiff(timer);
			let str = this.getTimerPrefix(timer) + " " + trans(timer.room, (diff.substr(0, 2) === '1 ' ? 3 : 0)) +
				' ' + diff + ' ' + trans(timer.room, 1);
			return str;
		}

		getAnnounceCode(timer) {
			let diff = this.getDiff(timer);
			let str = this.getTimerPrefixCode(timer) + " " + trans(timer.room, (diff.substr(0, 2) === '1 ' ? 3 : 0)) +
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
			let hours = Math.floor(minutes / 60);
			minutes = minutes % 60;
			if (hours > 0) {
				dates.push(hours + ' ' + (hours === 1 ? trans(timer.room, 'hour') : trans(timer.room, 'hours')));
			}
			if (minutes > 0) {
				dates.push(minutes + ' ' + (minutes === 1 ? trans(timer.room, 'minute') : trans(timer.room, 'minutes')));
			}
			if (seconds > 0) {
				dates.push(seconds + ' ' + (seconds === 1 ? trans(timer.room, 'second') : trans(timer.room, 'seconds')));
			}
			return dates.join(', ') || trans(timer.room, 'instants');
		}

		createTimer(room, time, name, user) {
			if (!this.timers[room]) {
				this.timers[room] = [];
			} else if (!Array.isArray(this.timers[room])) {
				this.timers[room] = [this.timers[room]];
			}

			for (let t of this.timers[room]) {
				if (Text.toId(name || "") === Text.toId(t.name || "")) {
					return false;
				}
			}

			if (this.timers[room].length >= TIMER_LIMIT_PER_ROOM) {
				return false;
			}

			const timer = {
				room: room,
				name: name,
				user: user,
				ends: Date.now() + time,
				mid: Date.now() + (time / 2),
				midAnnounced: false,
			};

			this.timers[room].push(timer);

			App.bot.sendTo(room, this.getAnnounce(timer));

			this.save();

			return true;
		}

		stopTimer(room, name) {
			if (!this.timers[room]) return false;

			if (!Array.isArray(this.timers[room])) {
				this.timers[room] = [this.timers[room]];
			}

			for (let t of this.timers[room]) {
				if (Text.toId(name || "") === Text.toId(t.name || "")) {
					this.deleteTimer(t);
					return true;
				}
			}

			return false;
		}

		stopAllTimers(room) {
			if (!this.timers[room]) return false;

			delete this.timers[room];
			this.save();

			return true;
		}

		checkRepeats() {
			for (let repeat of Object.values(this.repeats)) {
				if (repeat.active) {
					for (let activeRepeat of repeat.active) {
						if (Date.now() >= activeRepeat.next) {
							this.sendRepeat(repeat.room, activeRepeat.text, activeRepeat.command, activeRepeat.by);
							activeRepeat.next = Date.now() + activeRepeat.interval;
							this.save();
						}
					}
				}
			}
		}

		createRepeat(room, text, interval, by, command) {
			if (!this.repeats[room] || !this.repeats[room].active) {
				this.repeats[room] = {
					room: room,
					active: [],
				};
			}

			if (this.repeats[room].active.length > REPEAT_LIMIT_PER_ROOM) {
				return false;
			}

			this.repeats[room].active.push({
				text: text,
				interval: interval,
				next: Date.now() + interval,
				by: by || "",
				command: command || false,
			});

			this.sendRepeat(room, text, command || false, by || "");

			this.save();

			return true;
		}

		countRepeats(room) {
			if (!this.repeats[room]) return 0;
			if (!this.repeats[room].active) return 0;
			return this.repeats[room].active.length;
		}

		getRepeatTime(timeInterval, room) {
			let dates = [];
			let diff = timeInterval;
			if (diff % 1000 > 0) {
				diff = Math.floor(diff / 1000) + 1;
			} else {
				diff = Math.floor(diff / 1000);
			}
			let seconds = diff % 60;
			let minutes = Math.floor(diff / 60);
			let hours = Math.floor(minutes / 60);
			minutes = minutes % 60;
			if (hours > 0) {
				dates.push(hours + ' ' + (hours === 1 ? trans(room, 'hour') : trans(room, 'hours')));
			}
			if (minutes > 0) {
				dates.push(minutes + ' ' + (minutes === 1 ? trans(room, 'minute') : trans(room, 'minutes')));
			}
			if (seconds > 0) {
				dates.push(seconds + ' ' + (seconds === 1 ? trans(room, 'second') : trans(room, 'seconds')));
			}
			return dates.join(', ');
		}

		getRepeats(room) {
			if (!this.repeats[room]) return [];
			if (!this.repeats[room].active) return [];
			const res = [];
			for (let activeRepeat of this.repeats[room].active) {
				res.push(
					"- " +
					"[" + trans(room, "by") + ": " + (activeRepeat.by || "-") + "] " +
					"[" + this.getRepeatTime(activeRepeat.interval, room) + "] " +
					"[" + (activeRepeat.command ? trans(room, "command") : trans(room, "text")) + "] " +
					activeRepeat.text
				);
			}
			return res;
		}

		sendRepeat(room, text, command, by) {
			if (command) {
				let cmd = (text + "").trim();
				const tokens = App.parser.getRoomTokens(room);

				if (tokens.indexOf(cmd.charAt(0)) === -1) {
					cmd = (tokens[0] || "") + cmd;
				}

				App.parser.parse(cmd, room, by);
			} else {
				let repeatText = text + "";
				if (repeatText.startsWith("/wall ") || repeatText.startsWith("/announce ")) {
					repeatText = repeatText.split(" ").slice(1).join(" ");

					if (repeatText) {
						App.bot.sendTo(room, "/announce " + repeatText);
					}
				} else if (repeatText.startsWith("!") || repeatText.startsWith("/addhtmlbox ")) {
					App.bot.sendTo(room, repeatText);
				} else {
					App.bot.sendTo(room, Text.stripCommands(repeatText));
				}
			}
		}

		hasRepeat(room, text) {
			if (!this.repeats[room]) return false;
			return (this.repeats[room].active.filter(function (activeRepeat) {
				return activeRepeat.text === text;
			}).length > 0);
		}

		cancelRepeat(room, text) {
			if (!this.repeats[room]) return false;
			const hasMessage = this.repeats[room].active.filter(function (activeRepeat) {
				return activeRepeat.text === text;
			}).length > 0;

			if (!hasMessage) {
				return false;
			}

			if (this.repeats[room].active) {
				this.repeats[room].active = this.repeats[room].active.filter(function (activeRepeat) {
					return activeRepeat.text !== text;
				});
			}
			this.save();
			return true;
		}

		cancelRepeatIndex(room, i) {
			if (!this.repeats[room]) return false;
			if (this.repeats[room].active) {
				this.repeats[room].active.splice(i, 1);
			}
			this.save();
			return true;
		}

		clearRepeats(room) {
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
