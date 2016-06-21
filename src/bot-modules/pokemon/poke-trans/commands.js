/**
 * Commands File
 */

'use strict';

const Path = require('path');

const normalize = Tools.get('normalize.js');
const Text = Tools.get('text.js');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));

const getTranslations = require(Path.resolve(__dirname, 'translate.js'));

App.parser.addPermission('translate', {group: 'driver'});

module.exports = {
	translate: function () {
		if (!this.arg) return this.errorReply(this.usage({desc: 'pokemon/item/ability/move/nature'}));
		let args = this.args;
		let word = args[0].trim();
		let from = 'spanish';
		let to = 'english';
		if (!word) return this.errorReply(this.usage({desc: 'pokemon/item/ability/move/nature'}));

		try {
			let aliases = App.data.getAliases();
			if (aliases[Text.toId(word)]) word = aliases[Text.toId(word)];
		} catch (e) {
			App.log("Could not fetch aliases. Cmd: " + this.cmd + " " + this.arg + " | Room: " + this.room + " | By: " + this.by);
		}

		/* Translation */
		let translations = getTranslations(from, to, word);
		let translationsInv = getTranslations(to, from, word);
		if (translationsInv && translationsInv.length) {
			if ((!translations || !translations.length) || (translationsInv[0].ld < translations[0].ld)) {
				translations = translationsInv;
				let temp = to;
				to = from;
				from = temp;
			}
		}

		if (!translations || !translations.length) {
			return this.errorReply(translator.get(0, this.lang) + ' "' +
				word + '" ' + translator.get(1, this.lang) + '. ' + translator.get(2, this.lang));
		}

		let text = "";
		if (normalize(translations[0].from) !== normalize(word)) {
			text += translator.get(0, this.lang) + ' "' + word + '" ' + translator.get(1, this.lang) + '. ';
		}
		text += translator.get(3, this.lang) + ' ' + " **" + (translations[0].from || "").trim() +
			"** (" + translator.get(from, this.lang) + " - " + translator.get(to, this.lang) + "): ";
		for (let i = 0; i < translations.length; i++) {
			if (normalize(translations[0].from) !== normalize(translations[i].from)) continue;
			if (typeof translations[i].to === "string") {
				text += "**" + (translations[i].to || "").trim() + "** (" +
					(translator.get(translations[i].type, this.lang) || translations[i].type) + ")";
			} else {
				text += "**" + (translations[i].to[0] || "").trim() + "** (" +
					(translator.get(translations[i].type, this.lang) || translations[i].type) + ")";
			}
			if (i < translations.length - 1) text += ", ";
		}
		this.restrictReply(text, "translate");
	},
};
