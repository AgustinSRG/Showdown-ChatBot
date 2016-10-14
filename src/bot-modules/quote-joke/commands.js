/**
 * Commands File
 *
 * quote: gets a random quote
 * joke: gets a random joke
 * addquote: adds a quote
 * rmquote: removes a quote
 * addjoke: adds a new joke
 * rmjoke: removes a joke
 */

'use strict';

const Path = require('path');
const Translator = Tools('translate');
const Text = Tools('text');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));

module.exports = {
	randomquote: "quote",
	quote: function (App) {
		let text = App.modules.quote.system.getRandomQuote();
		if (text) {
			return this.restrictReply(Text.stripCommands(text), 'quote');
		} else {
			return this.errorReply(translator.get(0, this.lang));
		}
	},

	randomjoke: "joke",
	joke: function (App) {
		let text = App.modules.quote.system.getRandomJoke();
		if (text) {
			return this.restrictReply(Text.stripCommands(text), 'quote');
		} else {
			return this.errorReply(translator.get(1, this.lang));
		}
	},

	addquote: function (App) {
		if (!this.can('editquote', this.room)) return this.replyAccessDenied('editquote');
		let quote = this.arg.trim();
		if (!quote) return this.errorReply(this.usage({desc: translator.get(10, this.lang)}));
		if (App.modules.quote.system.getQuoteId(quote) === -1) {
			App.modules.quote.system.addQuote(quote);
			App.modules.quote.system.save();
			App.logCommandAction(this);
			return this.reply(translator.get(2, this.lang));
		} else {
			return this.errorReply(translator.get(3, this.lang));
		}
	},

	rmquote: function (App) {
		if (!this.can('editquote', this.room)) return this.replyAccessDenied('editquote');
		let quote = this.arg.trim();
		if (!quote) return this.errorReply(this.usage({desc: translator.get(10, this.lang)}));
		let id = App.modules.quote.system.getQuoteId(quote);
		if (id !== -1) {
			App.modules.quote.system.removeQuote(id);
			App.modules.quote.system.save();
			App.logCommandAction(this);
			return this.reply(translator.get(4, this.lang));
		} else {
			return this.errorReply(translator.get(5, this.lang));
		}
	},

	addjoke: function (App) {
		if (!this.can('editquote', this.room)) return this.replyAccessDenied('editquote');
		let joke = this.arg.trim();
		if (!joke) return this.errorReply(this.usage({desc: translator.get(11, this.lang)}));
		if (App.modules.quote.system.getJokeId(joke) === -1) {
			App.modules.quote.system.addJoke(joke);
			App.modules.quote.system.save();
			App.logCommandAction(this);
			return this.reply(translator.get(6, this.lang));
		} else {
			return this.errorReply(translator.get(7, this.lang));
		}
	},

	rmjoke: function (App) {
		if (!this.can('editquote', this.room)) return this.replyAccessDenied('editquote');
		let joke = this.arg.trim();
		if (!joke) return this.errorReply(this.usage({desc: translator.get(11, this.lang)}));
		let id = App.modules.quote.system.getQuoteId(joke);
		if (id !== -1) {
			App.modules.quote.system.removeJoke(id);
			App.modules.quote.system.save();
			App.logCommandAction(this);
			return this.reply(translator.get(8, this.lang));
		} else {
			return this.errorReply(translator.get(9, this.lang));
		}
	},
};
