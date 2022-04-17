/**
 * Commands File
 *
 * starttimer: starts a new timeout
 * stoptimer: stops the current timeout
 */

'use strict';

const Min_Timer = 5 * 1000;
const Max_Timer = 48 * 60 * 60 * 1000;

const Min_Repeat = 30 * 1000;
const Max_Repeat = 48 * 60 * 60 * 1000;

const Path = require('path');
const Text = Tools('text');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

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
	timer: 'starttimer',
	starttimer: function (App) {
		const Mod = App.modules.timers.system;
		this.setLangFile(Lang_File);
		if (Text.toId(this.arg) === "stop") {
			this.cmd = "stoptimer";
			this.parser.exec(this);
			return;
		}
		if (Mod.timers[this.room]) {
			return this.restrictReply(this.mlt(3) + " | " + Mod.getAnnounce(Mod.timers[this.room]), 'timer');
		}
		if (!this.can('timer', this.room)) return this.replyAccessDenied('timer');
		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}
		let minutes = parseMinutes(this.args[0]) || 0;
		let seconds = parseInt(this.args[1]) || 0;
		let time = (minutes * 60) + seconds;
		time = Math.floor(time * 1000);
		if (isNaN(time) || time <= 0) {
			return this.errorReply(this.usage({ desc: this.mlt(6) }, { desc: this.mlt(7) }));
		}
		if (time < Min_Timer) {
			return this.errorReply(this.mlt(1));
		}
		if (time > Max_Timer) {
			return this.errorReply(this.mlt(2));
		}
		if (!Mod.createTimer(this.room, time)) {
			this.errorReply(this.mlt(3));
		}
	},

	stoptimer: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('timer', this.room)) return this.replyAccessDenied('timer');
		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}
		const Mod = App.modules.timers.system;
		if (!Mod.stopTimer(this.room)) {
			this.errorReply(this.mlt(4));
		} else {
			this.reply(this.mlt(5));
		}
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
		if (!Mod.createRepeat(this.room, text, time)) {
			this.errorReply(this.mlt(3));
		} else {
			this.pmReply(this.mlt(18) + " " + Mod.getRepeatTime(time, this.room));
		}
	},

	clearrepeat: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('repeat', this.room)) return this.replyAccessDenied('repeat');

		if (!this.arg) {
			return this.errorReply(this.usage({ desc: this.mlt(10) }));
		}

		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}

		const Mod = App.modules.timers.system;
		if (!Mod.cancelRepeat(this.room, this.arg)) {
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

		const room = Text.toRoomid(this.arg) || this.room;

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

		this.reply("!code " + this.mlt(17) + ":\n\n" + Mod.getRepeats(room).join("\n"));
	},
};
