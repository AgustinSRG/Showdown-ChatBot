/**
 * Commands File
 *
 * translate: translates pokemon stuff
 */

'use strict';

const Path = require('path');
const normalize = Tools('normalize');
const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

const getTranslations = require(Path.resolve(__dirname, 'translate.js'));
const Available_Languages = Object.keys(getTranslations.supportedLanguages);

const abreviations = {
	"english": "en",
	"spanish": "es",
	"latino": "lat",
};

module.exports = {
	translate: function (App) {
		this.setLangFile(Lang_File);
		if (!this.arg) {
			return this.errorReply(this.usage({desc: this.mlt(6)},
				{desc: this.mlt(7), optional: true}, {desc: this.mlt(8), optional: true}));
		}
		let args = this.args;
		let word = args[0].trim();
		let from = Text.toId(args[1] || abreviations[this.lang] || 'es');
		let to = Text.toId(args[2] || 'en');
		let bidirectional = true;
		if (!word || !from || !to || from === to) {
			return this.errorReply(this.usage({desc: this.mlt(6)},
				{desc: this.mlt(7), optional: true}, {desc: this.mlt(8), optional: true}));
		}

		if (Available_Languages.indexOf(from) === -1) {
			return this.errorReply(this.mlt(4) + ": " + Chat.italics(from) + ". " +
				this.mlt(5) + ": " + Chat.italics(Available_Languages.join(', ')));
		}

		if (Available_Languages.indexOf(to) === -1) {
			return this.errorReply(this.mlt(4) + ": " + Chat.italics(to) + ". " +
				this.mlt(5) + ": " + Chat.italics(Available_Languages.join(', ')));
		}

		if (args[1] && args[2]) {
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
			return this.errorReply(this.mlt(0) + ' "' +
				word + '" ' + this.mlt(1) + '. ' +
				"(" + this.mlt(from) + " - " + this.mlt(to) + ")");
		}

		let text = "";
		if (normalize(translations[0].from) !== normalize(word)) {
			text += this.mlt(0) + ' "' + word + '" ' + this.mlt(1) + '. ';
		}
		text += this.mlt(3) + ' ' + " " + Chat.bold(translations[0].from) +
			" (" + this.mlt(from) + " - " + this.mlt(to) + "): ";
		let results = [];
		for (let i = 0; i < translations.length; i++) {
			if (normalize(translations[0].from) !== normalize(translations[i].from)) continue;
			if (typeof translations[i].to === "string") {
				results.push(Chat.bold(translations[i].to) + " (" +
					(this.mlt(translations[i].type) || translations[i].type) + ")");
			} else {
				results.push(Chat.bold(translations[i].to[0]) + " (" +
					(this.mlt(translations[i].type) || translations[i].type) + ")");
			}
		}
		this.restrictReply(text + results.join(', '), "translate");
	},
};
