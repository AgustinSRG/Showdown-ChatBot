/**
 * Commands File
 *
 * starttimer: starts a new timeout
 * stoptimer: stops the current timeout
 */

'use strict';

const Min_Timer = 5000;
const Max_Timer = 2 * 60 * 60 * 1000;

const Path = require('path');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

module.exports = {
	timer: 'starttimer',
	starttimer: function (App) {
		const Mod = App.modules.timers.system;
		this.setLangFile(Lang_File);
		if (Mod.timers[this.room]) {
			return this.restrictReply(this.mlt(3) + " | " + Mod.timers[this.room].getAnnounce(), 'timer');
		}
		if (!this.can('timer', this.room)) return this.replyAccessDenied('timer');
		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}
		let minutes = parseFloat(this.args[0]) || 0;
		let seconds = parseInt(this.args[1]) || 0;
		let time = (minutes * 60) + seconds;
		time = time * 1000;
		if (isNaN(time) || time <= 0) {
			return this.errorReply(this.usage({desc: this.mlt(6)}, {desc: this.mlt(7)}));
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
};
