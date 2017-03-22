/**
 * Commands File
 *
 * quote: gets a random quote
 * searchquote: filters quotes
 * listquotes: gets a link to the list of quotes
 * joke: gets a random joke
 * searchjoke: filters jokes
 * listjokes: gets a link to the list of jokes
 * addquote: adds a quote
 * rmquote: removes a quote
 * addjoke: adds a new joke
 * rmjoke: removes a joke
 */

'use strict';

const Path = require('path');
const Text = Tools('text');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

module.exports = {
	randomquote: "quote",
	quote: function (App) {
		this.setLangFile(Lang_File);
		let text = App.modules.quote.system.getRandomQuote();
		if (text) {
			return this.restrictReply(Text.stripCommands(text), 'quote');
		} else {
			return this.errorReply(this.mlt(0));
		}
	},

	squote: "searchquote",
	searchquote: function (App) {
		this.setLangFile(Lang_File);
		let arg = Text.trim(this.arg);
		if (!arg) return this.errorReply(this.usage({desc: this.mlt(13)}));
		let text = App.modules.quote.system.searchQuote(arg);
		if (text) {
			return this.restrictReply(Text.stripCommands(text), 'quote');
		} else {
			return this.errorReply(this.mlt(5));
		}
	},

	listquotes: function (App) {
		this.setLangFile(Lang_File);
		let server = App.config.server.url;
		if (!server) {
			return this.pmReply(this.mlt(12));
		}
		if (server.charAt(server.length - 1) === '/') {
			return this.restrictReply(App.config.server.url + 'quotejoke/listquotes/', 'quote');
		} else {
			return this.restrictReply(App.config.server.url + '/quotejoke/listquotes/', 'quote');
		}
	},

	randomjoke: "joke",
	joke: function (App) {
		this.setLangFile(Lang_File);
		let text = App.modules.quote.system.getRandomJoke();
		if (text) {
			return this.restrictReply(Text.stripCommands(text), 'joke');
		} else {
			return this.errorReply(this.mlt(1));
		}
	},

	sjoke: "searchjoke",
	searchjoke: function (App) {
		this.setLangFile(Lang_File);
		let arg = Text.trim(this.arg);
		if (!arg) return this.errorReply(this.usage({desc: this.mlt(13)}));
		let text = App.modules.quote.system.searchJoke(arg);
		if (text) {
			return this.restrictReply(Text.stripCommands(text), 'joke');
		} else {
			return this.errorReply(this.mlt(9));
		}
	},

	listjokes: function (App) {
		this.setLangFile(Lang_File);
		let server = App.config.server.url;
		if (!server) {
			return this.pmReply(this.mlt(12));
		}
		if (server.charAt(server.length - 1) === '/') {
			return this.restrictReply(App.config.server.url + 'quotejoke/listjokes/', 'joke');
		} else {
			return this.restrictReply(App.config.server.url + '/quotejoke/listjokes/', 'joke');
		}
	},

	addquote: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('editquote', this.room)) return this.replyAccessDenied('editquote');
		let quote = this.arg.trim();
		if (!quote) return this.errorReply(this.usage({desc: this.mlt(10)}));
		if (App.modules.quote.system.getQuoteId(quote) === -1) {
			App.modules.quote.system.addQuote(quote);
			App.modules.quote.system.save();
			App.logCommandAction(this);
			return this.reply(this.mlt(2));
		} else {
			return this.errorReply(this.mlt(3));
		}
	},

	rmquote: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('editquote', this.room)) return this.replyAccessDenied('editquote');
		let quote = this.arg.trim();
		if (!quote) return this.errorReply(this.usage({desc: this.mlt(10)}));
		let id = App.modules.quote.system.getQuoteId(quote);
		if (id !== -1) {
			App.modules.quote.system.removeQuote(id);
			App.modules.quote.system.save();
			App.logCommandAction(this);
			return this.reply(this.mlt(4));
		} else {
			return this.errorReply(this.mlt(5));
		}
	},

	addjoke: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('editjoke', this.room)) return this.replyAccessDenied('editjoke');
		let joke = this.arg.trim();
		if (!joke) return this.errorReply(this.usage({desc: this.mlt(11)}));
		if (App.modules.quote.system.getJokeId(joke) === -1) {
			App.modules.quote.system.addJoke(joke);
			App.modules.quote.system.save();
			App.logCommandAction(this);
			return this.reply(this.mlt(6));
		} else {
			return this.errorReply(this.mlt(7));
		}
	},

	rmjoke: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('editjoke', this.room)) return this.replyAccessDenied('editjoke');
		let joke = this.arg.trim();
		if (!joke) return this.errorReply(this.usage({desc: this.mlt(11)}));
		let id = App.modules.quote.system.getQuoteId(joke);
		if (id !== -1) {
			App.modules.quote.system.removeJoke(id);
			App.modules.quote.system.save();
			App.logCommandAction(this);
			return this.reply(this.mlt(8));
		} else {
			return this.errorReply(this.mlt(9));
		}
	},
};
