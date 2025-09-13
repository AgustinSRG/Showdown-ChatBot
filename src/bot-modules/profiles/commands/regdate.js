/**
 * Commands File
 *
 * regdate: gets the register date of a Pokemon Showdown account
 * regtime: gets the old of a Pokemon Showdown account
 * autoconfirmedhelp: privides help about the autoconfirmed status
 */

'use strict';

const AutoConfirmed_RegTime = 7 * 24 * 60 * 60;

const MonthsAbv = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const Path = require('path');

const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'regdate.translations');

const downloadingFlag = Object.create(null);

function markDownload(user, b) {
	if (b === false) {
		if (downloadingFlag[user]) delete downloadingFlag[user];
	} else if (b === true) {
		downloadingFlag[user] = true;
	} else {
		return downloadingFlag[user] || false;
	}
}

module.exports = {
	regdate: function (App) {
		this.setLangFile(Lang_File);

		const Mod = App.modules.profiles.system;

		let target = Text.toId(this.arg) || Text.toId(this.by);

		if (!target || target.length > 18) return this.errorReply(this.mlt('inv'));

		if (markDownload(this.byIdent.id)) return this.errorReply(this.mlt('busy'));

		markDownload(this.byIdent.id, true);

		Mod.getRegisterData(target, (data, err) => {
			markDownload(this.byIdent.id, false);

			if (err) {
				return this.errorReply(this.mlt('err') + ": " + err.message);
			}

			if (!data) {
				return this.errorReply(this.mlt('user') + " " + Chat.italics(target) + " " + this.mlt('not'));
			}

			// Parse Data
			let rDate = (new Date(data.registertime * 1000));
			this.restrictReply(this.mlt('user') + " " + (data.username || target) +
				" " + this.mlt('regdate') + " " + this.mlt('date', {
				day: rDate.getDate(),
				month: this.mlt(MonthsAbv[rDate.getMonth()]),
				year: rDate.getFullYear(),
			}), "regdate");
		});
	},

	regtime: function (App) {
		this.setLangFile(Lang_File);

		const Mod = App.modules.profiles.system;

		let target = Text.toId(this.arg) || Text.toId(this.by);

		if (!target || target.length > 18) return this.errorReply(this.mlt('inv'));

		if (markDownload(this.byIdent.id)) return this.errorReply(this.mlt('busy'));

		markDownload(this.byIdent.id, true);

		Mod.getRegisterData(target, (data, err) => {
			markDownload(this.byIdent.id, false);

			if (err) {
				return this.errorReply(this.mlt('err') + ": " + err.message);
			}

			if (!data) {
				return this.errorReply(this.mlt('user') + " " + Chat.italics(target) + " " + this.mlt('not'));
			}

			// Parse Data
			let regTimestamp = (data.registertime * 1000) - -364000;
			let time = Math.round((Date.now() - regTimestamp) / 1000);
			let times = [];
			let aux;
			/* Get Time difference */
			aux = time % 60; // Seconds
			if (aux > 0 || time === 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(2) : this.mlt(3)));
			time = Math.floor(time / 60);
			aux = time % 60; // Minutes
			if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(4) : this.mlt(5)));
			time = Math.floor(time / 60);
			aux = time % 24; // Hours
			if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(6) : this.mlt(7)));
			time = Math.floor(time / 24);
			aux = time % 365; // Days
			if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(8) : this.mlt(9)));
			time = Math.floor(time / 365);
			aux = time;
			if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt('year') : this.mlt('years')));
			/* Reply */
			this.restrictReply(this.mlt('user') + " " + (data.username || target) +
				" " + this.mlt('regtime1') + " " + Chat.italics(times.join(', ')) +
				" " + this.mlt('regtime2'), "regdate");
		});
	},

	autoconfirmedhelp: function (App) {
		this.setLangFile(Lang_File);

		const Mod = App.modules.profiles.system;

		let target = Text.toId(this.arg) || Text.toId(this.by);

		if (!target || target.length > 18) return this.errorReply(this.mlt('inv'));

		if (markDownload(this.byIdent.id)) return this.errorReply(this.mlt('busy'));

		markDownload(this.byIdent.id, true);

		Mod.getRegisterData(target, (data, err) => {
			markDownload(this.byIdent.id, false);

			if (err) {
				return this.errorReply(this.mlt('err') + ": " + err.message);
			}

			if (!data) {
				return this.pmReply(this.mlt(10) + " " + Chat.italics(target) + " " + this.mlt(13));
			}

			// Parse Data
			let regTimestamp = (data.registertime * 1000) - -364000;
			let time = Math.round((Date.now() - regTimestamp) / 1000);
			let acCurr = AutoConfirmed_RegTime - time;
			if (acCurr <= 0) {
				if (typeof data.ratings !== "object" || Object.keys(data.ratings).length === 0) {
					this.pmReply(this.mlt(10) + " " + Chat.bold(data.username || target) + " " + this.mlt(11));
				} else {
					this.pmReply(this.mlt(10) + " " + Chat.bold(data.username || target) + " " + this.mlt(12));
				}
				return;
			}
			time = acCurr;
			let times = [];
			let aux;
			/* Get Time difference */
			aux = time % 60; // Seconds
			if (aux > 0 || time === 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(2) : this.mlt(3)));
			time = Math.floor(time / 60);
			aux = time % 60; // Minutes
			if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(4) : this.mlt(5)));
			time = Math.floor(time / 60);
			aux = time % 24; // Hours
			if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(6) : this.mlt(7)));
			time = Math.floor(time / 24); // Days
			if (time > 0) times.unshift(time + ' ' + (time === 1 ? this.mlt(8) : this.mlt(9)));
			/* Reply */
			this.pmReply(this.mlt(14) + " " + Chat.bold(data.username || target) +
				" " + this.mlt(15) + " " + Chat.italics(times.join(', ')) +
				" " + this.mlt(16));
		});
	},
};
