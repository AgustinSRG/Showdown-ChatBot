/**
 * Commands File
 *
 * starttimer: starts a new timeout
 * stoptimer: stops the current timeout
 * stopalltimers: stops all timers
 * repeat: sets a repeat
 * repeatcommand: sets a command repeat
 * clearrepeat: clears repeat
 * clearrepeatroom: clears repeat for a room
 * clearallrepeats: clears all repeats of a room
 * showrepeats: Shows the list of repeats of a room
 */

'use strict';

const Min_Timer = 5 * 1000;
const Max_Timer = 48 * 60 * 60 * 1000;

const Min_Repeat = 30 * 1000;
const Max_Repeat = 48 * 60 * 60 * 1000;

const Path = require('path');
const Text = Tools('text');
const LineSplitter = Tools('line-splitter');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

function isValidFloat(str) {
	return (/^[0-9]*(\.)?[0-9]+$/).test(str);
}

function isValidInt(str) {
	return (/^[0-9]+$/).test(str);
}

function argIsTime(str) {
	if (isValidFloat(str)) {
		return true;
	}

	str = str + " ";

	return (/^([0-9]*(\.)?[0-9]+(s|m|h|d|\s)?(\s)*)+$/i).test(str);
}

function parseMinutes(str) {
	str = (str + "").toLowerCase().replace(/[^a-z0-9\.]+/gi, "");
	let b = "";
	let r = 0;
	let state = 0;
	for (let i = 0; i < str.length; i++) {
		let c = str.charAt(i);
		switch (state) {
			case 0:
				{
					if ((/[0-9\.]/i).test(c)) {
						// Number
						b += c;
					} else {
						let n = parseFloat(b);
						if (isNaN(n) || !isFinite(n) || n < 0) {
							n = 0;
						}
						b = "";
						state = 1;
						switch (c) {
							case "d":
								r += (n * 60 * 24);
								break;
							case "h":
								r += (n * 60);
								break;
							case "s":
								r += (n / 60);
								break;
							default:
								r += n;
						}
					}
				}
				break;
			case 1:
				if ((/[0-9\.]/i).test(c)) {
					b += c;
					state = 0;
				}
				break;
		}
	}

	if (b) {
		let n = parseFloat(b);
		if (isNaN(n) || !isFinite(n) || n < 0) {
			n = 0;
		}
		r += n;
	}

	return r;
}

module.exports = {
	starttimer: 'timer',
	timer: function (App) {
		const Mod = App.modules.timers.system;
		this.setLangFile(Lang_File);

		if (!this.arg) {
			const timers = Mod.getTimers(this.room);
			if (timers.length > 0) {
				// Announce all timers
				let spl = new LineSplitter(this.parser.app.config.bot.maxMessageLength);
				let first = true;
				for (let timer of timers) {
					spl.add((first ? "" : " | ") + Mod.getAnnounce(timer));
					first = false;
				}
				return this.restrictReply(spl.getLines(), 'timer');
			} else {
				// Usage
				return this.errorReply(this.mlt(4) + ". " + this.usage({ desc: this.mlt("time") }, { desc: this.mlt("name"), optional: true }));
			}
		} else if (!argIsTime(this.args[0] || "") && !(!Text.toId(this.args[0]) && isValidInt(this.args[1] || ""))) {
			if (Text.toId(this.args[0]) === "stop") {
				// Stop a timer
				const nameSpecified = !!Text.toId(this.args.slice(1).join(","));
				let timer = Mod.findTimer(this.room, this.args.slice(1).join(","));

				if (!timer && !nameSpecified) {
					const timers = Mod.getTimers(this.room);
					if (timers.length > 0) {
						timer = timers[timers.length - 1];
					}
				}

				if (!timer) {
					if (!nameSpecified) {
						return this.errorReply(this.mlt(4));
					} else {
						return this.errorReply(this.mlt('4b'));
					}
				}

				if (!Mod.stopTimer(timer.room, timer.name)) {
					return this.errorReply(this.mlt(4));
				} else {
					return this.reply(Mod.getTimerPrefix(timer) + " " + this.mlt(5));
				}
			}

			// A name was specified (maybe, or bad usage)

			const timer = Mod.findTimer(this.room, this.arg);

			if (timer) {
				return this.restrictReply(Mod.getAnnounce(timer), 'timer');
			} else {
				// Usage
				return this.errorReply(this.mlt('4b') + ". " + this.usage({ desc: this.mlt("time") }, { desc: this.mlt("name"), optional: true }));
			}
		}

		// The user wants to set a timer

		if (!this.can('timer', this.room)) return this.replyAccessDenied('timer');

		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}

		let minutes = parseMinutes((this.args[0] || "0").trim().split(" ")[0]) || 0;
		let name = this.args.slice(1).join(", ").trim();
		let seconds = 0;

		if (this.args[1] && isValidInt(this.args[1].trim())) {
			seconds = parseInt((this.args[1] || "0").trim().split(" ")[0]) || 0;
			name = this.args.slice(2).join(", ").trim();
		}

		let existingTimer = Mod.findTimer(this.room, name);

		if (existingTimer) {
			return this.restrictReply(this.mlt(3) + " | " + Mod.getAnnounce(existingTimer), 'timer');
		}

		let time = (minutes * 60) + seconds;

		time = Math.floor(time * 1000);

		if (isNaN(time) || time <= 0) {
			return this.errorReply(this.usage({ desc: this.mlt("time") }, { desc: this.mlt("name"), optional: true }));
		}

		if (time < Min_Timer) {
			return this.errorReply(this.mlt(1));
		}

		if (time > Max_Timer) {
			return this.errorReply(this.mlt(2));
		}

		if (name.length > 100) {
			return this.errorReply(this.mlt(20));
		}

		if (!Mod.createTimer(this.room, time, name, this.byIdent.name)) {
			this.errorReply(this.mlt(19));
		}
	},

	stoptimer: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('timer', this.room)) return this.replyAccessDenied('timer');
		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}
		const Mod = App.modules.timers.system;

		const nameSpecified = !!Text.toId(this.arg);
		let timer = Mod.findTimer(this.room, this.arg);

		if (!timer && !nameSpecified) {
			const timers = Mod.getTimers(this.room);
			if (timers.length > 0) {
				timer = timers[timers.length - 1];
			}
		}

		if (!timer) {
			if (!nameSpecified) {
				return this.errorReply(this.mlt(4));
			} else {
				return this.errorReply(this.mlt('4b'));
			}
		}

		if (!Mod.stopTimer(timer.room, timer.name)) {
			this.errorReply(this.mlt(4));
		} else {
			this.reply(Mod.getTimerPrefix(timer) + " " + this.mlt(5));
		}
	},

	stoptimers: "stopalltimers",
	stopalltimers: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('timer', this.room)) return this.replyAccessDenied('timer');
		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}
		const Mod = App.modules.timers.system;

		Mod.stopAllTimers(this.room);

		this.reply(this.mlt(22));
	},

	repeat: function (App) {
		const Mod = App.modules.timers.system;
		this.setLangFile(Lang_File);
		if (!this.can('repeat', this.room)) return this.replyAccessDenied('repeat');
		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}

		let minutes = parseMinutes(this.args[0]) || 0;
		let commaIndex = this.arg.indexOf(",");
		if (commaIndex === -1) {
			return this.errorReply(this.usage({ desc: this.mlt("time") }, { desc: this.mlt(10) }));
		}
		let text = this.arg.substr(commaIndex + 1).trim();
		if (!text) {
			return this.errorReply(this.usage({ desc: this.mlt("time") }, { desc: this.mlt(10) }));
		}
		let time = Math.floor(minutes * 60 * 1000);
		if (isNaN(time) || time <= 0) {
			return this.errorReply(this.usage({ desc: this.mlt("time") }, { desc: this.mlt(10) }));
		}
		if (time < Min_Repeat) {
			return this.errorReply(this.mlt(8));
		}
		if (time > Max_Repeat) {
			return this.errorReply(this.mlt(9));
		}
		if (Mod.countRepeats(this.room) >= 10) {
			return this.errorReply(this.mlt(13));
		}
		if (Mod.hasRepeat(this.room, text)) {
			return this.errorReply(this.mlt(15));
		}
		if (!Mod.createRepeat(this.room, text, time, this.by, false)) {
			this.errorReply(this.mlt(21));
		} else {
			this.pmReply(this.mlt(18) + " " + Mod.getRepeatTime(time, this.room));
		}
	},

	repeatcmd: "repeatcommand",
	repeatcommand: function (App) {
		const Mod = App.modules.timers.system;
		this.setLangFile(Lang_File);
		if (!this.can('repeatcmd', this.room)) return this.replyAccessDenied('repeatcmd');
		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}

		let minutes = parseMinutes(this.args[0]) || 0;
		let commaIndex = this.arg.indexOf(",");
		if (commaIndex === -1) {
			return this.errorReply(this.usage({ desc: this.mlt("time") }, { desc: this.mlt(23) }));
		}
		let text = this.arg.substr(commaIndex + 1).trim();
		if (!text) {
			return this.errorReply(this.usage({ desc: this.mlt("time") }, { desc: this.mlt(23) }));
		}
		let time = Math.floor(minutes * 60 * 1000);
		if (isNaN(time) || time <= 0) {
			return this.errorReply(this.usage({ desc: this.mlt("time") }, { desc: this.mlt(23) }));
		}
		if (time < Min_Repeat) {
			return this.errorReply(this.mlt(8));
		}
		if (time > Max_Repeat) {
			return this.errorReply(this.mlt(9));
		}
		if (Mod.countRepeats(this.room) >= 10) {
			return this.errorReply(this.mlt(13));
		}
		if (Mod.hasRepeat(this.room, text)) {
			return this.errorReply(this.mlt(15));
		}
		if (!Mod.createRepeat(this.room, text, time, this.by, true)) {
			this.errorReply(this.mlt(21));
		} else {
			this.pmReply(this.mlt(24) + " " + Mod.getRepeatTime(time, this.room));
		}
	},

	clearrepeat: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('repeat', this.room)) return this.replyAccessDenied('repeat');

		if (!this.arg) {
			return this.errorReply(this.usage({ desc: this.mlt(10) }));
		}

		if (this.getRoomType(this.room) !== 'chat') {
			if (this.args.length > 1 && this.can('clearrepeatroom', this.room)) {
				this.cmd = "clearrepeatroom";
				this.parser.exec(this);
				return;
			} else {
				return this.errorReply(this.mlt('nochat'));
			}
		}

		const Mod = App.modules.timers.system;
		if (!Mod.cancelRepeat(this.room, this.arg)) {
			if (this.args.length > 1 && this.can('clearrepeatroom', this.room)) {
				this.cmd = "clearrepeatroom";
				this.parser.exec(this);
			} else {
				this.errorReply(this.mlt(16));
			}
		} else {
			this.reply(this.mlt(11));
		}
	},

	rmrepeatroom: "clearrepeatroom",
	clearrepeatroom: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('clearrepeatroom', this.room)) return this.replyAccessDenied('clearrepeatroom');

		if (this.args.length < 2) {
			return this.errorReply(this.usage({desc: this.usageTrans('room')}, { desc: this.mlt(10) }));
		}

		const room = this.parseRoomAliases(Text.toRoomid(this.args[0]));

		if (!room) {
			return this.errorReply(this.usage({desc: this.usageTrans('room')}, { desc: this.mlt(10) }));
		}

		if (this.getRoomType(room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}

		const Mod = App.modules.timers.system;
		if (!Mod.cancelRepeat(room, this.arg.split(",").slice(1).join(",").trim())) {
			this.errorReply(this.mlt(16));
		} else {
			this.reply(this.mlt(11));
		}
	},

	clearrepeats: "clearallrepeats",
	clearallrepeats: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('repeat', this.room)) return this.replyAccessDenied('repeat');
		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}
		const Mod = App.modules.timers.system;

		Mod.clearRepeats(this.room);

		this.reply(this.mlt(14));
	},

	seerepeats: "showrepeats",
	showrepeats: function (App) {
		this.setLangFile(Lang_File);
		if (this.getRoomType(this.room) !== 'chat' && !this.arg) {
			return this.errorReply(this.usage({ desc: this.usageTrans('room') }));
		}

		const room = this.parseRoomAliases(Text.toRoomid(this.arg)) || this.room;

		if (!App.bot.rooms[room]) {
			return this.errorReply(this.mlt(12));
		}

		if (!App.bot.rooms[room].users[this.byIdent.id]) {
			return this.replyAccessDenied('repeat');
		}

		const group = App.bot.rooms[room].users[this.byIdent.id];

		if (!App.parser.can({ group: group, id: this.byIdent.id }, "repeat", room)) {
			return this.replyAccessDenied('repeat');
		}

		const Mod = App.modules.timers.system;

		if (Mod.countRepeats(room) === 0) {
			return this.errorReply(this.mlt(12));
		}

		this.replyCommand("!code " + this.mlt(17) + ":\n\n" + Mod.getRepeats(room).join("\n"));
	},
};
