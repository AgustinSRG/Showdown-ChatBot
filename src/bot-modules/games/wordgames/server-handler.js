/**
 * Server Handler: Anagrams / Hangman
 */

'use strict';

const check = Tools.get('check.js');

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

		let html = '';

		html += '<script type="text/javascript">function removeGroup(group) {var elem = document.getElementById(\'confirm-\' + group);' +
		'if (elem) {elem.innerHTML = \'<form style="display:inline;" method="post" action="">' +
		'<input type="hidden" name="wordgroup" value="\' + group + \'" />Are you sure?&nbsp;' +
		'<input type="submit" name="delgroup" value="Confirm Delete" /></form>\';}return false;}</script>';

		html += '<h2>Words for Games</h2>';

		for (let group in mod.data) {
			html += '<form method="post" action="">';
			html += '<p>Group <strong>' + group + '</strong> (words separated by commas)</p>';
			html += '<input type="hidden" name="wordgroup" value=' + JSON.stringify(group) + ' />';
			html += '<p><textarea name="words" cols="100" rows="3">';
			html += mod.data[group].join(', ');
			html += '</textarea></p>';
			html += '<p><input type="submit" name="edit" value="Edit Group" /></p>';
			html += '</form>';
			html += '<p><button onclick="removeGroup(\'' + group +
			'\');">Delete</button>&nbsp;<span id="confirm-' + group + '">&nbsp;</span></p>';
			html += '<hr />';
		}

		html += '<form method="post" action=""><p><strong>Group Name</strong>:&nbsp;' +
		'<input name="wordgroup" type="text" size="30" /></p><p><textarea name="words" cols="100" rows="3">' +
		(errAdd ? (context.post.words || '') : '') + '</textarea></p>' +
		'<p><input type="submit" name="add" value="Add Group" />  (words separated by commas)</p></form>';

		if (error) {
			html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
		} else if (ok) {
			html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
		}

		context.endWithWebPage(html, {title: "Words for Games - Showdown ChatBot"});
	});
};
