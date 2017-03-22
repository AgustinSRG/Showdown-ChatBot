/**
 * Bot Module: Quotes & Jokes
 */

'use strict';

class QuoteMod {
	constructor(App) {
		this.db = App.dam.getDataBase('quote-joke.json');
		this.data = this.db.data;
		if (!this.data.jokes) {
			this.data.jokes = {};
		}
		if (!this.data.quotes) {
			this.data.quotes = {};
		}
		this.quotes = this.data.quotes;
		this.jokes = this.data.jokes;
	}

	save() {
		this.db.write();
	}

	getRandomQuote() {
		let data = Object.keys(this.quotes);
		if (!data.length) return null;
		return this.quotes[data[Math.floor(Math.random() * data.length)]];
	}

	searchQuote(words) {
		words = words.toLowerCase();
		let quotes = [];
		for (let q in this.quotes) {
			if (this.quotes[q].toLowerCase().indexOf(words) >= 0) {
				quotes.push(this.quotes[q]);
			}
		}
		if (!quotes.length) return null;
		return quotes[Math.floor(Math.random() * quotes.length)];
	}

	addQuote(text) {
		let num = 0;
		while (this.quotes[num]) {
			num++;
		}
		this.quotes[num] = text;
	}

	getQuoteId(text) {
		text = (text || "").toLowerCase().trim();
		for (let i in this.quotes) {
			let quote = this.quotes[i].toLowerCase();
			if (quote === text) {
				return i;
			}
		}
		return -1;
	}

	removeQuote(id) {
		delete this.quotes[id];
	}

	getRandomJoke() {
		let data = Object.keys(this.jokes);
		if (!data.length) return null;
		return this.jokes[data[Math.floor(Math.random() * data.length)]];
	}

	searchJoke(words) {
		words = words.toLowerCase();
		let jokes = [];
		for (let j in this.jokes) {
			if (this.jokes[j].toLowerCase().indexOf(words) >= 0) {
				jokes.push(this.jokes[j]);
			}
		}
		if (!jokes.length) return null;
		return jokes[Math.floor(Math.random() * jokes.length)];
	}

	addJoke(text) {
		let num = 0;
		while (this.jokes[num]) {
			num++;
		}
		this.jokes[num] = text;
	}

	getJokeId(text) {
		text = (text || "").toLowerCase().trim();
		for (let i in this.jokes) {
			let joke = this.jokes[i].toLowerCase();
			if (joke === text) {
				return i;
			}
		}
		return -1;
	}

	removeJoke(id) {
		delete this.jokes[id];
	}
}

exports.setup = function (App) {
	return new QuoteMod(App);
};
