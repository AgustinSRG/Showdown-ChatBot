/**
 * Server Handler: Timers
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'template.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('timers', 'Permission for accessing timers/repeats');

	/* Menu Options */
	App.server.setMenuOption('timers', 'Timers', '/timers/', 'timers', -2);

	/* Handlers */
	App.server.setHandler('timers', (context, parts) => {
		if (!context.user || !context.user.can('timers')) {
			context.endWith403();
			return;
		}

		const Mod = App.modules.timers.system;

		let ok = null, error = null;
		if (context.post.cleartimer) {
			let room = Text.toRoomid(context.post.room);
			let name = Text.toId(context.post.name);
			Mod.stopTimer(room, name);
			App.logServerAction(context.user.id, "Clear timer: " + room + " | Name: " + (name || "-"));
			ok = "Timer cleared.";
		} else if (context.post.clearrepeat) {
			let room = Text.toRoomid(context.post.room);
			let ri = parseInt(context.post.ri);
			Mod.cancelRepeatIndex(room, ri);
			App.logServerAction(context.user.id, "Cancel repeat: " + room);
			ok = "Repeat canceled.";
		}

		let htmlVars = Object.create(null);

		htmlVars.timers = "";

		for (let timer of Object.values(Mod.timers)) {
			if (Array.isArray(timer)) {
				for (let timerSingle of timer) {
					htmlVars.timers += '<tr><td class="bold">' + Text.escapeHTML(timerSingle.room) +
						'</td><td>' + Text.escapeHTML(timerSingle.name || "-") +
						'</td><td>' + Text.escapeHTML(Mod.getDiff(timerSingle)) +
						'</td><td><form action="" method="post" style="margin-block-end: 0;">' +
						'<input name="room" type="hidden" value="' + Text.escapeHTML(timerSingle.room) + '" />' +
						'<input name="name" type="hidden" value="' + Text.toId(timerSingle.name || '') + '" />' +
						'<input type="submit" name="cleartimer" value="Clear timer" />' +
						'</form></td></tr>';
				}
			} else {
				htmlVars.timers += '<tr><td class="bold">' + Text.escapeHTML(timer.room) +
					'</td><td>' + Text.escapeHTML(timer.name || "-") +
					'</td><td>' + Text.escapeHTML(Mod.getDiff(timer)) +
					'</td><td><form action="" method="post" style="margin-block-end: 0;">' +
					'<input name="room" type="hidden" value="' + Text.escapeHTML(timer.room) + '" />' +
					'<input name="name" type="hidden" value="' + Text.toId(timer.name || '') + '" />' +
					'<input type="submit" name="cleartimer" value="Clear timer" />' +
					'</form></td></tr>';
			}
		}

		htmlVars.repeats = "";

		for (let repeat of Object.values(Mod.repeats)) {
			if (repeat.active) {
				let i = 0;
				for (let activeRepeat of repeat.active) {
					htmlVars.repeats += '<tr><td class="bold">' + Text.escapeHTML(repeat.room) + '</td><td>' +
						Text.escapeHTML(Mod.getRepeatTime(activeRepeat.interval, repeat.room)) + '</td><td>' +
						Text.escapeHTML(activeRepeat.by || "-") + '</td><td>' +
						Text.escapeHTML(activeRepeat.command ? "Command" : "Text") + '</td><td>' +
						Text.escapeHTML(activeRepeat.text) +
						'</td><td><form action="" method="post" style="margin-block-end: 0;">' +
						'<input name="room" type="hidden" value="' + Text.escapeHTML(repeat.room) + '" />' +
						'<input name="ri" type="hidden" value="' + i + '" />' +
						'<input type="submit" name="clearrepeat" value="Cancel repeat" />' +
						'</form></td></tr>';
					i++;
				}
			}
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), { title: "Timers and Repeats - Showdown ChatBot" });
	});
};
