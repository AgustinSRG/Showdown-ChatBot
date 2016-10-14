/**
 * Server Handler: Trivia
 */

'use strict';

const Path = require('path');
const check = Tools('check');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'template.html'));
const questionTemplate = new Template(Path.resolve(__dirname, 'template-question.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('trivia', 'Permission for managing the trivia database');

	/* Menu Options */
	App.server.setMenuOption('trivia', 'Trivia', '/trivia/', 'trivia', -1);

	/* Handlers */
	App.server.setHandler('trivia', (context, parts) => {
		if (!context.user || !context.user.can('trivia')) {
			context.endWith403();
			return;
		}

		let mod = App.modules.games.system.templates.trivia;
		let ok = null, error = null;

		if (context.post.add) {
			let text = (context.post.clue || "").trim();
			let ans = (context.post.answers || "").split(',');
			let aux = [];
			for (let i = 0; i < ans.length; i++) {
				let an = ans[i].trim();
				if (an) {
					aux.push(an);
				}
			}

			try {
				check(text, "Question cannot be blank");
				check(text.length < 250, "Question cannot be longer than 250 characters");
				check(aux.length > 0, "You must specify at least one answer");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				mod.addQuestion(text, aux);
				mod.db.write();
				App.logServerAction(context.user.id, "Changed Trivia Questions (Add)");
				ok = "Added trivia question";
			}
		} else if (context.post.edit) {
			let id = parseInt(context.post.id);
			let text = (context.post.clue || "").trim();
			let ans = (context.post.answers || "").split(',');
			let aux = [];
			for (let i = 0; i < ans.length; i++) {
				let an = ans[i].trim();
				if (an) {
					aux.push(an);
				}
			}

			try {
				check(!isNaN(id), "Invalid id");
				check(mod.data[id], "Question not found");
				check(text, "Question can be blank");
				check(text.length < 250, "Question cannot be longer than 250 characters");
				check(aux.length > 0, "You must specify at least one answer");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				mod.data[id].clue = text;
				mod.data[id].answers = aux;
				mod.db.write();
				App.logServerAction(context.user.id, "Changed Trivia Questions (Edit)");
				ok = "Added trivia question";
			}
		} else if (context.post.del) {
			let id = parseInt(context.post.id);

			try {
				check(!isNaN(id), "Invalid id");
				check(mod.data[id], "Question not found");
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				mod.rmQuestion(id);
				mod.db.write();
				App.logServerAction(context.user.id, "Changed Trivia Questions (Delete)");
				ok = "Deleted trivia question";
			}
		}

		let htmlVars = {};

		htmlVars.questions = '';
		for (let id in mod.data) {
			htmlVars.questions += questionTemplate.make({
				id: id,
				clue: mod.data[id].clue,
				answers: mod.data[id].answers.join(', '),
			});
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Trivia - Showdown ChatBot"});
	});
};
