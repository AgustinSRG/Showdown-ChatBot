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
			return this.errorReply(this.usage({ desc: this.mlt(6) },
				{ desc: this.mlt(7), optional: true }, { desc: this.mlt(8), optional: true }));
		}
		let args = this.args;
		let word = args[0].trim();
		let from = Text.toId(args[1] || abreviations[this.lang] || 'es');
		let to = Text.toId(args[2] || 'en');
		let bidirectional = true;
		if (!word || !from || !to || from === to) {
			return this.errorReply(this.usage({ desc: this.mlt(6) },
				{ desc: this.mlt(7), optional: true }, { desc: this.mlt(8), optional: true }));
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
		let translations = [];

		const fromList = from === "es" ? ["es", "lat"] : [from];
		const toList = to === "es" ? ["es", "lat"] : [to];

		for (let fromListElement of fromList) {
			for (let toListElement of toList) {
				let tempTranslations = getTranslations(fromListElement, toListElement, word);
				let reverse = false;

				if (bidirectional) {
					const translationsInv = getTranslations(toListElement, fromListElement, word);
					if (translationsInv && translationsInv.length) {
						if ((!tempTranslations || !tempTranslations.length) || (translationsInv[0].ld < tempTranslations[0].ld)) {
							tempTranslations = translationsInv;
							reverse = true;
						}
					}
				}

				if (!tempTranslations || !tempTranslations.length) {
					continue;
				}

				if ((!translations || !translations.length) || (tempTranslations[0].ld < translations[0].ld)) {
					translations = tempTranslations;

					from = reverse ? toListElement : fromListElement;
					to = reverse ? fromListElement : toListElement;
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

		const results = [];
		const resultsWords = new Set();

		for (let i = 0; i < translations.length; i++) {
			if (normalize(translations[0].from) !== normalize(translations[i].from)) continue;
			if (i !== 0 && translations[i].type === "legacy" && translations[i].to === translations[0].to) {
				continue;
			}
			if (typeof translations[i].to === "string") {
				resultsWords.add(translations[i].to);
				results.push(Chat.bold(translations[i].to) + " (" +
					(this.mlt(translations[i].type) || translations[i].type) + ")");
			} else {
				resultsWords.add(translations[i].to[0]);
				results.push(Chat.bold(translations[i].to[0]) + " (" +
					(this.mlt(translations[i].type) || translations[i].type) + ")");
			}
		}

		if (from === "en" && to === "es") {
			let latTranslations = getTranslations("en", "lat", translations[0].from);

			if (latTranslations && latTranslations.length > 0) {
				const latResults = [];

				for (let i = 0; i < latTranslations.length; i++) {
					if (normalize(latTranslations[0].from) !== normalize(latTranslations[i].from)) continue;
					if (i !== 0 && latTranslations[i].type === "legacy" && latTranslations[i].to === latTranslations[0].to) {
						continue;
					}

					let translatedWord;

					if (typeof latTranslations[i].to === "string") {
						translatedWord = latTranslations[i].to;
					} else {
						translatedWord = latTranslations[i].to[0];
					}

					if (resultsWords.has(translatedWord)) {
						continue;
					}

					latResults.push(Chat.bold(translatedWord) + " (" +
						(this.mlt(latTranslations[i].type) || latTranslations[i].type) + ")");
				}

				if (latResults.length > 0) {
					this.restrictReply(text + results.join(', ') + " | " + this.mlt("lat") + ": " + latResults.join(", "), "translate");
					return;
				}
			}
		}

		this.restrictReply(text + results.join(', '), "translate");
	},

	translatetable: function (App) {
		this.setLangFile(Lang_File);
		let server = App.config.server.url;
		if (!server) {
			return this.pmReply(this.mlt(9));
		}

		const lang = Text.toId(this.args[0]) || 'es';

		const availableTables = ['es', 'lat'];

		if (availableTables.indexOf(lang) === -1) {
			return this.errorReply(this.mlt(4) + ": " + Chat.italics(lang) + ". " +
				this.mlt(5) + ": " + Chat.italics(availableTables.join(', ')));
		}

		if (server.charAt(server.length - 1) === '/') {
			return this.restrictReply(App.config.server.url + 'tradtable/' + lang, 'translate');
		} else {
			return this.restrictReply(App.config.server.url + '/tradtable/' + lang, 'translate');
		}
	},
};
