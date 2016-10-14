/**
 * Server Handler: Anagrams / Hangman
 */

'use strict';

const Path = require('path');
const check = Tools('check');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'template.html'));
const groupTemplate = new Template(Path.resolve(__dirname, 'template-group.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('wordgames', 'Permission for managing the words database for the games');

	/* Menu Options */
	App.server.setMenuOption('wordgames', 'Word-Games', '/wordgames/', 'wordgames', -1);

	/* Handlers */
	App.server.setHandler('wordgames', (context, parts) => {
		if (!context.user || !context.user.can('wordgames')) {
			context.endWith403();
			return;
		}

		let mod = App.modules.games.system.templates.wordgames;
		let ok = null, error = null;
		let errAdd = false;

		if (context.post.add) {
			let group = (context.post.wordgroup || "").replace(/\"/, '').trim();
			let aux = (context.post.words || "").split(',');
			let words = [];
			for (let i = 0; i < aux.length; i++) {
				let word = aux[i].trim();
				if (word) {
					words.push(word);
				}
			}

			try {
				check(group, "You must specify a group");
				check(!mod.data[group], "Group already exists");
				check(words.length > 0, "You must specify at least one word");
			} catch (err) {
				error = err.message;
				errAdd = true;
			}

			if (!error) {
				mod.data[group] = words;
				mod.db.write();
				App.logServerAction(context.user.id, "Words of Games: Add");
				ok = "Group <strong>" + group + "</strong> added sucessfully.";
			}
		} else if (context.post.delgroup) {
			let group = (context.post.wordgroup || "");
			try {
				check(group, "You must specify a group");
				check(mod.data[group], "Group not found");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				delete mod.data[group];
				mod.db.write();
				App.logServerAction(context.user.id, "Words of Games: Delete");
				ok = "Group <strong>" + group + "</strong> deleted sucessfully.";
			}
		} else if (context.post.edit) {
			let group = (context.post.wordgroup || "");
			let aux = (context.post.words || "").split(',');
			let words = [];
			for (let i = 0; i < aux.length; i++) {
				let word = aux[i].trim();
				if (word) {
					words.push(word);
				}
			}

			try {
				check(group, "You must specify a group");
				check(mod.data[group], "Group not found");
				check(words.length > 0, "You must specify at least one word");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				mod.data[group] = words;
				mod.db.write();
				App.logServerAction(context.user.id, "Words of Games: Edit");
				ok = "Group <strong>" + group + "</strong> sucessfully modified.";
			}
		}

		let htmlVars = {};

		htmlVars.groups = '';
		for (let group in mod.data) {
			htmlVars.groups += groupTemplate.make({
				group: group,
				jsongroup: JSON.stringify(group),
				words: mod.data[group].join(', '),
			});
		}

		htmlVars.words = (errAdd ? (context.post.words || "") : '');
		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Words for Games - Showdown ChatBot"});
	});
};
