/**
 * Translate System
 */

'use strict';

const Text = Tools('text');
const FileSystem = require('fs');

/**
 * Represents a basic translator
 */
class Translator {
	/**
	 * @param {Path} file - Translations file
	 */
	constructor(file, loadFilter) {
		if (!loadFilter) loadFilter = {};
		this.data = {};
		this.id = null;
		let str = FileSystem.readFileSync(file).toString();
		let lines = str.split('\n');
		let currentLang = null;
		for (let i = 0; i < lines.length; i++) {
			lines[i] = lines[i].trim();
			if (!lines[i]) continue;
			switch (lines[i].charAt(0)) {
			case '@':
				if (this.id === null) {
					this.id = Text.toRoomid(lines[i].substr(1));
				}
				break;
			case '%':
				currentLang = Text.toId(lines[i].substr(1));
				if (!currentLang || loadFilter[currentLang] === false) {
					currentLang = null;
					continue;
				}
				if (!this.data[currentLang]) this.data[currentLang] = {};
				break;
			case '$':
				if (!currentLang) continue;
				lines[i] = lines[i].substr(1);
				let spl = lines[i].split('=');
				let id = Text.toId(spl.shift());
				if (!id) continue;
				this.data[currentLang][id] = spl.join('=').trim();
				break;
			}
		}
	}

	/**
	 * @returns {Boolean}
	 */
	hasId() {
		return !(this.id === null);
	}

	/**
	 * @param {String|Number} key
	 * @param {String} lang
	 * @returns {String} Translated key
	 */
	get(key, lang) {
		if (typeof key !== 'string') key = '' + key;
		if (lang && this.data[lang] && typeof this.data[lang][key] === 'string') {
			return this.data[lang][key];
		} else {
			for (let l in this.data) {
				if (typeof this.data[l][key] === 'string') {
					return this.data[l][key];
				}
			}
			return 'undefined';
		}
	}

	/**
	 * @returns {Array} Keys
	 */
	getKeys() {
		let keys = {};
		for (let l in this.data) {
			for (let k in this.data[l]) {
				keys[k] = true;
			}
		}
		return Object.keys(keys);
	}
}

module.exports = Translator;
