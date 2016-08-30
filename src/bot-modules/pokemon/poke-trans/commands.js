/**
 * Commands File
 */

'use strict';

const Path = require('path');

const normalize = Tools.get('normalize.js');
const Text = Tools.get('text.js');
const Chat = Tools.get('chat.js');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));

const getTranslations = require(Path.resolve(__dirname, 'translate.js'));

App.parser.addPermission('translate', {group: 'driver'});

const Available_Languages = ['english', 'spanish'];

module.exports = {
	translate: function () {
		if (!this.arg) {
			return this.errorReply(this.usage({desc: translator.get(6, this.lang)},
				{desc: translator.get(7, this.lang), optional: true}, {desc: translator.get(8, this.lang), optional: true}));
		}
		let args = this.args;
		let word = args[0].trim();
		let from = Text.toId(args[1] || this.lang);
		let to = Text.toId(args[2] || 'english');
		let bidirectional = true;
		if (!word || !from || !to || from === to) {
			return this.errorReply(this.usage({desc: translator.get(6, this.lang)},
				{desc: translator.get(7, this.lang), optional: true}, {desc: translator.get(8, this.lang), optional: true}));
		}

		if (Available_Languages.indexOf(from) === -1) {
			return this.errorReply(translator.get(4, this.lang) + ": " + Chat.italics(from) + ". " +
				translator.get(5, this.lang) + ": " + Chat.italics(Available_Languages.join(', ')));
		}

		if (Available_Languages.indexOf(to) === -1) {
			return this.errorReply(translator.get(4, this.lang) + ": " + Chat.italics(to) + ". " +
				translator.get(5, this.lang) + ": " + Chat.italics(Available_Languages.join(', ')));
		}

		if (args[1] || args[2]) {
			bidirectional = false;
		}

		try {
			let aliases = App.data.getAliases();
			if (aliases[Text.toId(word)]) word = aliases[Text.toId(word)];
		} catch (e) {
			App.log("Could not fetch aliases. Cmd: " + this.cmd + " " + this.arg + " | Room: " + this.room + " | By: " + this.by);
		}

		/* Translation */
		let translations = getTranslations(from, to, word);
		if (bidirectional) {
			let translationsInv = getTranslations(to, from, word);
			if (translationsInv && translationsInv.length) {
				if ((!translations || !translations.length) || (translationsInv[0].ld < translations[0].ld)) {
					translations = translationsInv;
					let temp = to;
					to = from;
					from = temp;
				}
			}
		}

		if (!translations || !translations.length) {
			return this.errorReply(translator.get(0, this.lang) + ' "' +
				word + '" ' + translator.get(1, this.lang) + '. ' +
				"(" + translator.get(from, this.lang) + " - " + translator.get(to, this.lang) + ")");
		}

		let text = "";
		if (normalize(translations[0].from) !== normalize(word)) {
			text += translator.get(0, this.lang) + ' "' + word + '" ' + translator.get(1, this.lang) + '. ';
		}
		text += translator.get(3, this.lang) + ' ' + " " + Chat.bold(translations[0].from) +
			" (" + translator.get(from, this.lang) + " - " + translator.get(to, this.lang) + "): ";
		let results = [];
		for (let i = 0; i < translations.length; i++) {
			if (normalize(translations[0].from) !== normalize(translations[i].from)) continue;
			if (typeof translations[i].to === "string") {
				results.push(Chat.bold(translations[i].to) + " (" +
					(translator.get(translations[i].type, this.lang) || translations[i].type) + ")");
			} else {
				results.push(Chat.bold(translations[i].to[0]) + " (" +
					(translator.get(translations[i].type, this.lang) || translations[i].type) + ")");
			}
		}
		this.restrictReply(text + results.join(', '), "translate");
	},
};
