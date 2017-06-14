/**
 * Server Handler: Quotes and Jokes
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const SubMenu = Tools('submenu');
const Template = Tools('html-template');

const quotesTemplate = new Template(Path.resolve(__dirname, 'template-quotes.html'));
const jokesTemplate = new Template(Path.resolve(__dirname, 'template-jokes.html'));
const listTemplate = new Template(Path.resolve(__dirname, 'template-list.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('quotejoke', 'Permission for managing the quotes and jokes database');

	/* Menu Options */
	App.server.setMenuOption('quotejoke', 'Quotes&nbsp;&amp;&nbsp;Jokes', '/quotejoke/', 'quotejoke', -1);

	/* Handlers */
	App.server.setHandler('quotejoke', (context, parts) => {
		if (parts[0] && parts[0].split('?')[0] === 'listquotes') {
			return serveQuotesList(context);
		} else if (parts[0] && parts[0].split('?')[0] === 'listjokes') {
			return serveJokesList(context);
		}

		if (!context.user || !context.user.can('quotejoke')) {
			context.endWith403();
			return;
		}

		let submenu = new SubMenu("Quotes and Jokes", parts, context, [
			{id: 'quotes', title: 'Quotes', url: '/quotejoke/quotes/', handler: quotesHandler},
			{id: 'jokes', title: 'Jokes', url: '/quotejoke/jokes/', handler: jokesHandler},
		], 'quotes');

		return submenu.run();
	});

	function quotesHandler(context, html) {
		let ok = null, error = null;
		if (context.post.add) {
			let quote = (context.post.content || "").trim();
			try {
				check(quote, "Quote cannot be blank.");
				check(quote.length <= 300, "Quote cannot be longer than 300 characters");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				if (App.modules.quote.system.getQuoteId(quote) === -1) {
					App.modules.quote.system.addQuote(quote);
					App.modules.quote.system.save();
					App.logServerAction(context.user.id, "Added quote: " + quote);
					ok = "Quote added to the database";
				} else {
					error = "Quote already exists";
				}
			}
		} else if (context.post.remove) {
			let id = parseInt(context.post.id);
			if (App.modules.quote.system.quotes[id]) {
				App.modules.quote.system.removeQuote(id);
				App.modules.quote.system.save();
				App.logServerAction(context.user.id, "Removed quote: " + id);
				ok = "Quote removed from the database";
			} else {
				error = "Quote not found.";
			}
		}

		let htmlVars = {};

		htmlVars.quotes = '';
		let quotes = App.modules.quote.system.quotes;
		for (let id in quotes) {
			htmlVars.quotes += '<tr><td style="word-wrap: break-word;">' + Text.escapeHTML(quotes[id]) + '</td>';
			htmlVars.quotes += ' <td><div align="center"><form style="display:inline;" method="post" action="">' +
			'<input type="hidden" name="id" value="' + id + '" /><input type="submit" name="remove" value="Remove" /></form></div></td></tr>';
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += quotesTemplate.make(htmlVars);
		context.endWithWebPage(html, {title: "Quotes - Showdown ChatBot"});
	}

	function jokesHandler(context, html) {
		let ok = null, error = null;
		if (context.post.add) {
			let joke = (context.post.content || "").trim();
			try {
				check(joke, "Joke cannot be blank.");
				check(joke.length <= 300, "Joke cannot be longer than 300 characters");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				if (App.modules.quote.system.getJokeId(joke) === -1) {
					App.modules.quote.system.addJoke(joke);
					App.modules.quote.system.save();
					App.logServerAction(context.user.id, "Added joke: " + joke);
					ok = "Joke added to the database";
				} else {
					error = "Joke already exists";
				}
			}
		} else if (context.post.remove) {
			let id = parseInt(context.post.id);
			if (App.modules.quote.system.jokes[id]) {
				App.modules.quote.system.removeJoke(id);
				App.modules.quote.system.save();
				App.logServerAction(context.user.id, "Removed joke: " + id);
				ok = "Joke removed from the database";
			} else {
				error = "Joke not found.";
			}
		}

		let htmlVars = {};

		htmlVars.jokes = '';
		let jokes = App.modules.quote.system.jokes;
		for (let id in jokes) {
			htmlVars.jokes += '<tr><td style="word-wrap: break-word;">' + Text.escapeHTML(jokes[id]) + '</td>';
			htmlVars.jokes += ' <td><div align="center"><form style="display:inline;" method="post" action="">' +
			'<input type="hidden" name="id" value="' + id + '" /><input type="submit" name="remove" value="Remove" /></form></div></td></tr>';
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		html += jokesTemplate.make(htmlVars);
		context.endWithWebPage(html, {title: "Jokes - Showdown ChatBot"});
	}

	function serveQuotesList(context) {
		let html = '';
		let quotes = App.modules.quote.system.quotes;
		for (let id in quotes) {
			html += '<li style="word-wrap: break-word; padding: 5px;">' + Text.escapeHTML(quotes[id]) + '</li>';
		}
		if (!html) {
			html = "<i>(empty)</i>";
		}
		context.endWithHtml(
			listTemplate.make({
				title: "List of Quotes",
				list: html,
			})
		);
	}

	function serveJokesList(context) {
		let html = '';
		let jokes = App.modules.quote.system.jokes;
		for (let id in jokes) {
			html += '<li style="word-wrap: break-word; padding: 5px;">' + Text.escapeHTML(jokes[id]) + '</li>';
		}
		if (!html) {
			html = "<i>(empty)</i>";
		}
		context.endWithHtml(
			listTemplate.make({
				title: "List of Jokes",
				list: html,
			})
		);
	}
};
