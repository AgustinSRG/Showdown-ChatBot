/**
 * Server Handler: Bot Language
 */

'use strict';

const Text = Tools.get('text.js');
const check = Tools.get('check.js');

/* Menu Options */

App.server.setMenuOption('lang', 'Bot Language', '/lang/', 'bot');

/* Handlers */

App.server.setHandler('lang', (context, parts) => {
	/* Permission check */
	if (!context.user || !context.user.can('bot')) {
		context.endWith403();
		return;
	}

	/* Actions */
	let error = null, ok = null;
	if (context.post.setdefault) {
		/* Set default language */
		let lang = Text.toId(context.post.language);
		try {
			check(lang && App.languages[lang], "Invalid Language.");
		} catch (err) {
			error = err.message;
		}
		if (!error) {
			App.config.language['default'] = lang;
			App.db.write();
			App.logServerAction(context.user.id, "Set Default language");
			ok = "Default language set to <strong>" + App.languages[lang] + "</strong>";
		}
	} else if (context.post.addroom) {
		let lang = Text.toId(context.post.language);
		let room = Text.toRoomid(context.post.room);
		try {
			check(lang && App.languages[lang], "Invalid Language.");
			check(room, "You must specify a room.");
		} catch (err) {
			error = err.message;
		}
		if (!error) {
			App.config.language.rooms[room] = lang;
			App.db.write();
			App.logServerAction(context.user.id, "Set Room language. Room: " + room);
			ok = "Language for room " + room + " set to <strong>" + App.languages[lang] + "</strong>";
		}
	} else if (context.post.deleteroom) {
		let room = Text.toRoomid(context.post.room);
		try {
			check(room, "You must specify a room.");
			check(App.config.language.rooms[room], "Invalid room.");
		} catch (err) {
			error = err.message;
		}
		if (!error) {
			delete App.config.language.rooms[room];
			App.db.write();
			App.logServerAction(context.user.id, "Set Room language to default. Room: " + room);
			ok = "Language for room " + room + " set to default";
		}
	}

	/* Generate HTML */
	let html = '';
	html += '<h2>Bot Language Configuration</h2>';
	html += '<form  method="post" action="">';
	html += '<strong>Default Language</strong>:&nbsp;<label>' + getLanguageComboBox(App.config.language['default']) + '</label>';
	html += '<p><label><input type="submit" name="setdefault" value="Set Default Language" /></label></p>';
	html += '</form>';
	html += '<hr />';

	html += '<table border="1">';
	html += '<tr><td width="200px"><div align="center"><strong>Room</strong></div></td><td width="200px">' +
		'<div align="center"><strong>Language</strong></div></td>' +
		'<td width="150px"><div align="center"><strong>Options</strong></div></td></tr>';
	for (let room in App.config.language.rooms) {
		html += '<tr><td>' + room + '</td><td>' + App.config.language.rooms[room] +
			'</td><td><div align="center"><form method="post" action="" style="display:inline;"><input type="hidden" name="room" value="' +
			room + '" /><label><input type="submit" name="deleteroom" value="Use Default" /></label></form></div></td></tr>';
	}
	html += '</table>';
	html += '<hr />';
	html += '<form method="post" action="">';
	html += '<table border="0">';
	html += '<tr><td><strong>Room</strong>:&nbsp;</td><td><label><input name="room" type="text" size="30" /></label></td></tr>';
	html += '<tr><td><strong>Language</strong>:&nbsp;</td><td>' + getLanguageComboBox() + '</td></tr>';
	html += '</table>';
	html += '<p><label><input type="submit" name="addroom" value="Set Room Language" /></label></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Bot language - Showdown ChatBot"});
});

/* Auxiliar Functions */

function getLanguageComboBox(selected) {
	let html = '';
	html += '<select name="language">';
	for (let lang in App.languages) {
		html += '<option value="' + lang + '" ' + (lang === selected ? 'selected="selected"' : '') + '>' + App.languages[lang] + '</option>';
	}
	html += '</select>';
	return html;
}
