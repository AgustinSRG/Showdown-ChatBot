/**
 * Server Handler: Banned Words
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'templates', 'bannedwords.html'));
const roomTemplate = new Template(Path.resolve(__dirname, 'templates', 'bannedwords-room.html'));

exports.setup = function (App) {
	/* Menu Options */
	App.server.setMenuOption('banwords', 'Banned&nbsp;Words', '/banwords/', 'moderation', 0);

	/* Handlers */
	App.server.setHandler('banwords', (context, parts) => {
		if (!context.user || !context.user.can('moderation')) {
			context.endWith403();
			return;
		}

		if (parts[0] === 'room') {
			let room = Text.toRoomid(parts[1]);
			if (room) {
				return roomHandler(context, room);
			} else {
				context.endWith404();
				return;
			}
		}

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

		let htmlVars = {};

		let opts = [];
		for (let room in App.modules.moderation.system.data.bannedWords) {
			opts.push('<a class="submenu-option" href="/banwords/room/' + room + '/">' + room + '</a>');
		}
		htmlVars.submenu = opts.join(' | ');

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Banned Words - Showdown ChatBot"});
	});

	function roomHandler(context, room) {
		let config = App.modules.moderation.system.data;
		let ok = null, error = null;

		if (context.post.add) {
			let word = (context.post.word || "").trim().toLowerCase();
			let type = Text.toId(context.post.type);
			let punishment = Text.toId(context.post.punishment);
			let strict = !!context.post.strict;
			let nonicks = !!context.post.nonicks;
			try {
				check(word, "You must specify a word");
				check(type in {'banned': 1, 'inap': 1, 'insult': 1, 'emote': 1}, "Invalid Type");
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
				case 'emote':
					config.bannedWords[room][word].type = 'e';
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
				if (Object.keys(config.bannedWords[room]).length === 0) {
					delete config.bannedWords[room];
				}
				App.modules.moderation.system.db.write();
				App.logServerAction(context.user.id, "Delete Banword. Room: " + room + " | Word: " + word);
				ok = "Removed Banword: " + Text.escapeHTML(word);
			}
		}

		let htmlVars = {};
		htmlVars.room = room;
		htmlVars.name = Text.escapeHTML(App.parser.getRoomTitle(room));

		let opts = [];
		for (let k in App.modules.moderation.system.data.bannedWords) {
			opts.push('<a class="submenu-option' + (room === k ? '-selected' : '') + '" href="/banwords/room/' + k + '/">' + k + '</a>');
		}
		htmlVars.submenu = opts.join(' | ');

		htmlVars.words = '';
		let wordsData = App.modules.moderation.system.data.bannedWords[room] || {};
		for (let word in wordsData) {
			htmlVars.words += '<tr>';
			htmlVars.words += '<td>' + Text.escapeHTML(word) + '</td>';
			htmlVars.words += '<td>' + App.modules.moderation.system.modBot.getPunishment(wordsData[word].val) + '</td>';
			switch (wordsData[word].type) {
			case 'i':
				htmlVars.words += '<td>Inappropriate</td>';
				break;
			case 'o':
				htmlVars.words += '<td>Insult</td>';
				break;
			case 'e':
				htmlVars.words += '<td>Banned Emoticon / Character</td>';
				break;
			default:
				htmlVars.words += '<td>Banned Word</td>';
				break;
			}
			if (wordsData[word].strict) {
				htmlVars.words += '<td>Yes</td>';
			} else {
				htmlVars.words += '<td>No</td>';
			}
			if (wordsData[word].nonicks) {
				htmlVars.words += '<td>Yes</td>';
			} else {
				htmlVars.words += '<td>No</td>';
			}
			htmlVars.words += '<td><div align="center"><form style="display:inline;" method="post" action="">' +
			'<input type="hidden" name="word" value=' + JSON.stringify(word) +
			' /><input type="submit" name="remove" value="Delete" /></form></div></td>';
			htmlVars.words += '</tr>';
		}

		htmlVars.punishments = '<select name="punishment">';
		let punishments = App.modules.moderation.system.data.punishments;
		for (let i = 0; i < punishments.length; i++) {
			htmlVars.punishments += ' <option value="' + punishments[i] + '"' + (punishments[i] === 'mute' ? ' selected="selected"' : '') +
			' >' + punishments[i] + '</option>';
		}
		htmlVars.punishments += '</select>';

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(roomTemplate.make(htmlVars), {title: "Banned Words - Showdown ChatBot"});
	}
};
