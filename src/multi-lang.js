/**
 * Pokemon Showdown Bot Language Manager
 * Showdown ChatBot is distributed under the terms of the MIT License
 * (https://github.com/asanrom/Showdown-ChatBot/blob/master/LICENSE)
 *
 * This tool manages multi-language system for Showdown-side
 * messages (commands and modules)
 */

'use strict';

const Translator = Tools('translate');
const Text = Tools('text');
const FileSystem = require('fs');
const Path = require('path');

/**
 * Represents a Showdown-ChatBot language manager
 */
class MultiLanguageManager {
	/**
	 * @param {Object} config - Language filter
	 * @param {ChatBotApp} app - Application to assign the parser
	 */
	constructor(config, app) {
		this.app = app;
		this.config = config || {};
		this.cache = {};
		this.langfiles = {};
		this.db = app.dam.getDataBase('custom-lang.json');
		this.data = this.db.data;
		if (!this.data.langdefs) {
			this.data.langdefs = {};
		}
		if (!this.data.langdata) {
			this.data.langdata = {};
		}
	}

	/**
	 * Asynchronous method to write the configuration
	 * to persistent storage
	 */
	saveData() {
		this.db.write();
	}

	/**
	 * Returns languaje definitions (id, name)
	 * @returns {Object}
	 */
	getLanguages() {
		let langs = {};
		for (let l in this.app.supportedLanguages) {
			langs[l] = this.app.supportedLanguages[l];
		}
		for (let l in this.data.langdefs) {
			langs[l] = this.data.langdefs[l];
		}
		return langs;
	}

	/**
	 * Ckecks if a language is enabled
	 * @param {String} lang - Language ID
	 */
	isLangEnabled(lang) {
		if (this.config[lang] === false) {
			return false;
		} else {
			return true;
		}
	}

	/**
	 * Multi-Language template
	 * @param {String} file - Translation file path
	 * @param {String} lang - Language ID
	 * @param {String} key
	 * @param {Object} vars
	 * @returns {String}
	 */
	mlt(file, lang, key, vars) {
		let value;
		if (!this.cache[file]) {
			this.cache[file] = new Translator(file, this.config);
		}
		if (this.cache[file].hasId() && this.data.langdata[lang] && this.data.langdata[lang][this.cache[file].id]) {
			if (typeof this.data.langdata[lang][this.cache[file].id][key] === 'string') {
				return this.replaceVars(this.data.langdata[lang][this.cache[file].id][key], vars || {});
			}
		}
		value = this.cache[file].get(key, lang);
		return this.replaceVars(value, vars || {});
	}

	/**
	 * Multi-Language template (with data as object)
	 * @param {Object} data - Translation data
	 * @param {String} lang - Language ID
	 * @param {String} key
	 * @param {Object} vars
	 * @returns {String}
	 */
	mltData(data, lang, key, vars) {
		let value = 'undefined';
		if (typeof key !== 'string') key = '' + key;
		if (lang && data[lang] && typeof data[lang][key] === 'string') {
			value = data[lang][key];
		} else {
			for (let l in data) {
				if (typeof data[l][key] === 'string') {
					value = data[l][key];
					break;
				}
			}
		}
		return this.replaceVars(value, vars || {});
	}

	/**
	 * Replace vars in format ${VAR}
	 * @param {String} template
	 * @param {Object} vars
	 * @returns {String}
	 */
	replaceVars(template, vars) {
		return template.replace(/\$\{[a-z0-9_]+\}/gi, key => {
			let v = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
			if (vars[v] !== undefined) {
				return ('' + vars[v]);
			} else {
				return key;
			}
		});
	}

	addLangFiles(files, path) {
		for (let name of files) {
			let file = Path.resolve(path, name);
			let str;
			try {
				str = FileSystem.readFileSync(file).toString();
			} catch (err) {
				this.app.reportCrash(err);
				continue;
			}
			let lines = str.split('\n');
			for (let line of lines) {
				if (line.charAt(0) === '@') {
					let id = Text.toRoomid(line.substr(1));
					if (id) {
						this.langfiles[id] = file;
						break;
					}
				}
			}
		}
	}

	/**
	 * Returns the room configured language
	 * @param {String} room - Room ID
	 * @returns {String} Room language
	 */
	getLanguage(room) {
		if (!room) {
			return this.app.config.language['default'];
		} else {
			return this.app.config.language.rooms[room] || this.app.config.language['default'];
		}
	}

	/**
	 * Clears language cache
	 */
	clearCache() {
		for (let k in this.cache) {
			delete this.cache[k];
		}
	}
}

module.exports = MultiLanguageManager;
