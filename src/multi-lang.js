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

class MultiLanguageManager {
	constructor(config) {
		this.config = config || {};
		this.cache = {};
	}

	isLangEnabled(lang) {
		if (this.config[lang] === false) {
			return false;
		} else {
			return true;
		}
	}

	clearCache() {
		for (let k in this.cache) {
			delete this.cache[k];
		}
	}

	mlt(file, lang, key, vars) {
		let value;
		if (!this.cache[file]) {
			this.cache[file] = new Translator(file, this.config);
		}
		value = this.cache[file].get(key, lang);
		return this.replaceVars(value, vars || {});
	}

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
}

module.exports = MultiLanguageManager;
