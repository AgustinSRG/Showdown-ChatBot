/**
 * Server Handler: Banned Words
 */

'use strict';

const Text = Tools.get('text.js');
const check = Tools.get('check.js');

/* Menu Options */

App.server.setMenuOption('banwords', 'Banned Words', '/banwords/', 'moderation');

/* Handlers */

App.server.setHandler('banwords', (context, parts) => {
	/* Permission Check */
	if (!context.user || !context.user.can('moderation')) {
		context.endWith403();
		return;
	}

	let html = '';

	if (parts[0] === 'room') {
		let room = Text.toRoomid(parts[1]);
		if (room) {
			return roomHandler(context, room, html);
		} else {
			context.endWith404();
			return;
		}
	}

	/* Actions */
	let ok = null, error = null;

	if (context.post.add) {
		let data = App.modules.moderation.system.data.bannedWords;
		let room = Text.toRoomid(context.post.room);
		try {
			check(room, 'You must specify a room');
			check(!data[room], 'Room <strong>' + room + '</strong> already exists in this list.');
		} catch (err) {
			error = err.message;
		}
		if (!error) {
			data[room] = {};
			App.modules.moderation.system.db.write();
			App.logServerAction(context.user.id, "Add Banwords Room: " + room);
			ok = 'Room <strong>' + room + '</strong> added to the banwords feature.';
		}
	}

	/* Generate Html */

	html = '';
	html += '<div align="center"><h2>Banned Words</h2>';

	/* Menu */
	let opts = [];
	for (let room in App.modules.moderation.system.data.bannedWords) {
		opts.push('<a class="submenu-option" href="/banwords/room/' + room + '/">' + room + '</a>');
	}
	html += opts.join(' | ');
	html += '</div>';

	html += '<hr />';

	html += '<form method="post" action=""><input name="room" type="text" size="30" />' +
		'&nbsp;&nbsp;<input type="submit" name="add" value="Add Room" /></form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Banned Words - Showdown ChatBot"});
});

function roomHandler(context, room, html) {
	let config = App.modules.moderation.system.data;
	let ok = null, error = null;

	/* Actions */
	if (context.post.add) {
		let word = (context.post.word || "").trim().toLowerCase();
		let type = Text.toId(context.post.type);
		let punishment = Text.toId(context.post.punishment);
		let strict = !!context.post.strict;
		let nonicks = !!context.post.nonicks;
		try {
			check(word, "You must specify a word");
			check(type in {'banned': 1, 'inap': 1, 'insult': 1}, "Invalid Type");
			check(config.punishments.indexOf(punishment) >= 0, "Invalid punishment");
		} catch (err) {
			error = err.message;
		}

		if (!error) {
			if (!config.bannedWords[room]) config.bannedWords[room] = {};
			config.bannedWords[room][word] = {};
			config.bannedWords[room][word].strict = strict;
			config.bannedWords[room][word].nonicks = nonicks;
			switch (type) {
			case 'banned':
				config.bannedWords[room][word].type = 'b';
				break;
			case 'inap':
				config.bannedWords[room][word].type = 'i';
				break;
			case 'insult':
				config.bannedWords[room][word].type = 'o';
				break;
			}
			config.bannedWords[room][word].val = config.punishments.indexOf(punishment) + 1;
			App.modules.moderation.system.db.write();
			App.logServerAction(context.user.id, "Add Banword. Room: " + room + " | Word: " + word);
			ok = "Added Banword: " + Text.escapeHTML(word);
		}
	} else if (context.post.remove) {
		let word = context.post.word;
		try {
			check(word, "You must specify a word");
			check(config.bannedWords[room] && config.bannedWords[room][word], "Word not found");
		} catch (err) {
			error = err.message;
		}

		if (!error) {
			delete config.bannedWords[room][word];
			App.modules.moderation.system.db.write();
			App.logServerAction(context.user.id, "Delete Banword. Room: " + room + " | Word: " + word);
			ok = "Removed Banword: " + Text.escapeHTML(word);
		}
	}

	html += '<div align="center"><h2>Banned Words</h2>';

	/* Menu */
	let opts = [];
	for (let k in App.modules.moderation.system.data.bannedWords) {
		opts.push('<a class="submenu-option' + (room === k ? '-selected' : '') + '" href="/banwords/room/' + k + '/">' + k + '</a>');
	}
	html += opts.join(' | ');
	html += '</div>';

	html += '<hr />';

	html += '<h3>Banned Words of ' + room + '</h3>';

	html += '<table border="1">';
	html += '<tr><td width="200"><div align="center"><strong>Word</strong></div></td>' +
		'<td width="150"><div align="center"><strong>Punishment</strong></div></td>' +
		'<td width="150"><div align="center"><strong>Type</strong></div></td>' +
		'<td width="150"><div align="center"><strong>Strict Word</strong></div></td>' +
		'<td width="150"><div align="center"><strong>Ignore Nicks</strong></div></td>' +
		'<td width="100"><div align="center"><strong>Options</strong></div></td></tr>';
	let wordsData = App.modules.moderation.system.data.bannedWords[room] || {};
	for (let word in wordsData) {
		html += '<tr>';
		html += '<td>' + Text.escapeHTML(word) + '</td>';
		html += '<td>' + App.modules.moderation.system.modBot.getPunishment(wordsData[word].val) + '</td>';
		switch (wordsData[word].type) {
		case 'i':
			html += '<td>Inappropriate</td>';
			break;
		case 'o':
			html += '<td>Insult</td>';
			break;
		default:
			html += '<td>Banned Word</td>';
			break;
		}
		if (wordsData[word].strict) {
			html += '<td>Yes</td>';
		} else {
			html += '<td>No</td>';
		}
		if (wordsData[word].nonicks) {
			html += '<td>Yes</td>';
		} else {
			html += '<td>No</td>';
		}
		html += '<td><div align="center"><form style="display:inline;" method="post" action="">' +
			'<input type="hidden" name="word" value=' + JSON.stringify(word) +
			' /><input type="submit" name="remove" value="Delete" /></form></div></td>';
		html += '</tr>';
	}
	html += '</table>';

	html += '<br /><hr /><br />';

	html += '<form method="post" action="">';
	html += '<table>';
	html += '<tr><td>Word: </td><td><input name="word" type="text" size="40" /></td></tr>';
	html += '<tr><td>Punishment: </td><td><select name="punishment">';
	let punishments = App.modules.moderation.system.data.punishments;
	for (let i = 0; i < punishments.length; i++) {
		html += ' <option value="' + punishments[i] + '"' + (punishments[i] === 'mute' ? ' selected="selected"' : '') +
			' >' + punishments[i] + '</option>';
	}
	html += '</select></td></tr>';
	html += '<tr><td>Type: </td><td><select name="type"><option value="banned">Banned Word</option>' +
		'<option value="inap">Inappropriate</option><option value="insult">Insult</option></select></td></tr>';
	html += '<tr><td colspan="2"><input type="checkbox" name="strict" value="true" />&nbsp;Ban strict word</td></tr>';
	html += '<tr><td colspan="2"><input type="checkbox" name="nonicks" value="checkbox" />&nbsp;Ignore Nicknames</td></tr>';
	html += '</table>';
	html += '<p><input type="submit" name="add" value="Add Banned Word" /></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Banned Words - Showdown ChatBot"});
}

