/**
 * Commands File
 */

'use strict';

const Min_Timer = 5000;
const Max_Timer = 2 * 60 * 60 * 1000;

const Path = require('path');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));

module.exports = {
	timer: 'starttimer',
	starttimer: function () {
		if (!this.can('timer', this.room)) return this.replyAccessDenied('timer');
		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(translator.get('nochat', this.lang));
		}
		const Mod = App.modules.timers.system;
		let minutes = parseFloat(this.args[0]) || 0;
		let seconds = parseInt(this.args[1]) || 0;
		let time = (minutes * 60) + seconds;
		time = time * 1000;
		if (isNaN(time) || time <= 0) {
			return this.errorReply(this.usage({desc: translator.get(6, this.lang)}, {desc: translator.get(7, this.lang)}));
		}
		if (time < Min_Timer) {
			return this.errorReply(translator.get(1, this.lang));
		}
		if (time > Max_Timer) {
			return this.errorReply(translator.get(2, this.lang));
		}
		if (!Mod.createTimer(this.room, time)) {
			this.errorReply(translator.get(3, this.lang));
		}
	},

	stoptimer: function () {
		if (!this.can('timer', this.room)) return this.replyAccessDenied('timer');
		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(translator.get('nochat', this.lang));
		}
		const Mod = App.modules.timers.system;
		if (!Mod.stopTimer(this.room)) {
			this.errorReply(translator.get(4, this.lang));
		} else {
			this.reply(translator.get(5, this.lang));
		}
	},
};
