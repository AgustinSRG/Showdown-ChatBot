/**
 * Server Handler: Trivia
 */

'use strict';

const check = Tools.get('check.js');

/* Permissions */

App.server.setPermission('trivia', 'Permission for managing the trivia database');

/* Menu Options */

App.server.setMenuOption('trivia', 'Trivia', '/trivia/', 'trivia');

/* Handlers */

App.server.setHandler('trivia', (context, parts) => {
	/* Permission check */
	if (!context.user || !context.user.can('trivia')) {
		context.endWith403();
		return;
	}

	let mod = App.modules.games.system.templates.trivia;
	let ok = null, error = null;

	/* Actions */
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
			check(text, "Question can be blank");
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

	/* Generate Html */
	let html = '';
	html += '<h2>Trivia Answers</h2>';

	html += '<form method="post" action=""><p><strong>Question</strong>:&nbsp;<input name="clue" type="text" size="80" /></p>' +
		'<p><strong>Answers</strong>:&nbsp;<input name="answers" type="text" size="80" /></p>' +
		'<p><input type="submit" name="add" value="Add" /></p></form>';

	for (let id in mod.data) {
		html += '<hr />';
		html += '<form method="post" action="">';
		html += '<input type="hidden" name="id" value="' + id + '" />';
		html += '<p><strong>Question</strong>:&nbsp;<input name="clue" type="text" size="80" value="' +
			mod.data[id].clue + '" /></p>';
		html += '<p><strong>Answers</strong>:&nbsp;<input name="answers" type="text" size="80" value="' +
			mod.data[id].answers.join(', ') + '" /></p>';
		html += '<p><input type="submit" name="edit" value="Edit" />&nbsp;&nbsp;' +
			'<input type="submit" name="del" value="Delete" /></p>';
		html += '</form>';
	}

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Trivia - Showdown ChatBot"});
});
