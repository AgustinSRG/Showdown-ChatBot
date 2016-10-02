/**
 * Server Handler: Quotes and Jokes
 */

'use strict';

const Text = Tools.get('text.js');
const check = Tools.get('check.js');
const SubMenu = Tools.get('submenu.js');

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('quotejoke', 'Permission for managing the quotes and jokes database');

	/* Menu Options */
	App.server.setMenuOption('quotejoke', 'Quotes&nbsp;&amp;&nbsp;Jokes', '/quotejoke/', 'quotejoke', -1);

	/* Handlers */
	App.server.setHandler('quotejoke', (context, parts) => {
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

		html += '<table border="1">';
		html += '<tr><td width="600"><div align="center"><strong>Quote</strong></div></td>' +
		'<td width="150"><div align="center"><strong>Options</strong></div></td></tr>';

		let quotes = App.modules.quote.system.quotes;
		for (let id in quotes) {
			html += '<tr>';
			html += '<td style="word-wrap: break-word;">' + Text.escapeHTML(quotes[id]) + '</td>';
			html += ' <td><div align="center"><form style="display:inline;" method="post" action="">' +
			'<input type="hidden" name="id" value="' + id + '" /><input type="submit" name="remove" value="Remove" /></form></div></td>';
			html += '</tr>';
		}

		html += '</table>';
		html += '<hr />';
		html += '<form method="post" action=""><input name="content" type="text" size="120" maxlength="300" />' +
		'<p><input type="submit" name="add" value="Add New Quote" /></p></form>';

		if (error) {
			html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
		} else if (ok) {
			html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
		}

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

		html += '<table border="1">';
		html += '<tr><td width="600"><div align="center"><strong>Joke</strong></div></td>' +
		'<td width="150"><div align="center"><strong>Options</strong></div></td></tr>';

		let jokes = App.modules.quote.system.jokes;
		for (let id in jokes) {
			html += '<tr>';
			html += '<td style="word-wrap: break-word;">' + Text.escapeHTML(jokes[id]) + '</td>';
			html += ' <td><div align="center"><form style="display:inline;" method="post" action="">' +
			'<input type="hidden" name="id" value="' + id + '" /><input type="submit" name="remove" value="Remove" /></form></div></td>';
			html += '</tr>';
		}

		html += '</table>';
		html += '<hr />';
		html += '<form method="post" action=""><input name="content" type="text" size="120" maxlength="300" />' +
		'<p><input type="submit" name="add" value="Add New Joke" /></p></form>';

		if (error) {
			html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
		} else if (ok) {
			html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
		}

		context.endWithWebPage(html, {title: "Jokes - Showdown ChatBot"});
	}
};
