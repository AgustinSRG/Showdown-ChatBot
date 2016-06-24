/**
 * Commands File
 */

'use strict';

const Path = require('path');

const Text = Tools.get('text.js');
const Cache = Tools.get('cache.js').BufferCache;
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'regdate.translations'));
const regdateCache = new Cache(10);

function getESTDiff(timestamp) {
	let date = new Date(timestamp);
	if (date.getMonth() < 11 && date.getMonth() > 1) {
		if (date.getMonth() === 10 && (date.getDate() - date.getDay() <= 6)) return -5;
		if (date.getMonth() === 2 && (date.getDate() - date.getDay() < 0)) return -5;
		return -4;
	}
	return -5;
}

const downloadingFlag = {};

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
	regdate: function () {
		let target = Text.toId(this.arg) || Text.toId(this.by);
		if (!target || target.length > 18) return this.pmReply(translator.get('inv', this.lang));
		let url = "http://pokemonshowdown.com/users/" + target + ".json";
		if (markDownload(this.byIdent.id)) return this.pmReply(translator.get('busy', this.lang));
		let cacheData = regdateCache.get(target);
		let callback = function (data) {
			// Parse Data
			let regTimestamp = data.registertime * 1000;
			regTimestamp += (1000 * 60 * 60 * getESTDiff(regTimestamp)) +
				(new Date().getTimezoneOffset() * 60 * 1000) - 364000;
			this.pmReply(translator.get('user', this.lang) + " " + (data.username || target) +
				" " + translator.get('regdate', this.lang) + " __" +
				(new Date(regTimestamp)).toString().substr(4, 20).trim() + "__ (EST)");
		}.bind(this);
		if (cacheData) {
			return callback(cacheData);
		} else {
			markDownload(this.byIdent.id, true);
			App.data.wget(url, function (data, err) {
				markDownload(this.byIdent.id, false);
				if (err) {
					return this.pmReply(translator.get('err', this.lang) + " " + url);
				}
				try {
					data = JSON.parse(data);
				} catch (error) {
					return this.pmReply(translator.get('err', this.lang) + " " + url);
				}
				if (typeof data.registertime !== "number") {
					return this.pmReply(translator.get('err', this.lang) + " " + url);
				}
				if (data.registertime <= 0) {
					return this.pmReply(translator.get('user', this.lang) + " " +
						(data.username || target) + " " + translator.get('not', this.lang));
				}
				regdateCache.cache(target, data);
				return callback(data);
			}.bind(this));
		}
	},

	regtime: function () {
		let target = Text.toId(this.arg) || Text.toId(this.by);
		if (!target || target.length > 18) return this.pmReply(translator.get('inv', this.lang));
		let url = "http://pokemonshowdown.com/users/" + target + ".json";
		if (markDownload(this.byIdent.id)) return this.pmReply(translator.get('busy', this.lang));
		let cacheData = regdateCache.get(target);
		let callback = function (data) {
			// Parse Data
			let regTimestamp = (data.registertime * 1000) - -364000;
			let time = Math.round((Date.now() - regTimestamp) / 1000);
			let times = [];
			let aux;
			/* Get Time difference */
			aux = time % 60; // Seconds
			if (aux > 0 || time === 0) times.unshift(aux + ' ' + (aux === 1 ? translator.get(2, this.lang) : translator.get(3, this.lang)));
			time = Math.floor(time / 60);
			aux = time % 60; // Minutes
			if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? translator.get(4, this.lang) : translator.get(5, this.lang)));
			time = Math.floor(time / 60);
			aux = time % 24; // Hours
			if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? translator.get(6, this.lang) : translator.get(7, this.lang)));
			time = Math.floor(time / 24); // Days
			if (time > 0) times.unshift(time + ' ' + (time === 1 ? translator.get(8, this.lang) : translator.get(9, this.lang)));
			/* Reply */
			this.pmReply(translator.get('user', this.lang) + " " + (data.username || target) +
				" " + translator.get('regtime1', this.lang) + " __" + times.join(', ') +
				"__ " + translator.get('regtime2', this.lang));
		}.bind(this);
		if (cacheData) {
			return callback(cacheData);
		} else {
			markDownload(this.byIdent.id, true);
			App.data.wget(url, function (data, err) {
				markDownload(this.byIdent.id, false);
				if (err) {
					return this.pmReply(translator.get('err', this.lang) + " " + url);
				}
				try {
					data = JSON.parse(data);
				} catch (error) {
					return this.pmReply(translator.get('err', this.lang) + " " + url);
				}
				if (typeof data.registertime !== "number") {
					return this.pmReply(translator.get('err', this.lang) + " " + url);
				}
				if (data.registertime <= 0) {
					return this.pmReply(translator.get('user', this.lang) + " " +
						(data.username || target) + " " + translator.get('not', this.lang));
				}
				regdateCache.cache(target, data);
				return callback(data);
			}.bind(this));
		}
	},
};
