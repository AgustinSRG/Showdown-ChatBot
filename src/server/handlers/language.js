/**
 * Server Handler: Bot Language
 */

'use strict';

const Path = require('path');
const Text = Tools.get('text.js');
const check = Tools.get('check.js');
const Template = Tools.get('html-template.js');

const mainTemplate = new Template(Path.resolve(__dirname, 'templates', 'language.html'));

exports.setup = function (App) {
	/* Menu Options */
	App.server.setMenuOption('lang', 'Bot&nbsp;Language', '/lang/', 'bot', 1);

	/* Handlers */
	App.server.setHandler('lang', (context, parts) => {
		if (!context.user || !context.user.can('bot')) {
			context.endWith403();
			return;
		}

		let error = null, ok = null;
		if (context.post.setdefault) {
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

		let htmlVars = {};

		htmlVars.list_a = getLanguageComboBox(App.config.language['default']);
		htmlVars.list_b = getLanguageComboBox();

		htmlVars.rooms = '';
		for (let room in App.config.language.rooms) {
			htmlVars.rooms += '<tr><td>' + room + '</td><td>' + App.config.language.rooms[room] +
			'</td><td><div align="center"><form method="post" action="" style="display:inline;"><input type="hidden" name="room" value="' +
			room + '" /><label><input type="submit" name="deleteroom" value="Use Default" /></label></form></div></td></tr>';
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Bot language - Showdown ChatBot"});
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
};
