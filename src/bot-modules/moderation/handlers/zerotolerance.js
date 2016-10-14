/**
 * Server Handler: Zero Tolerance
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'templates', 'zerotolerance.html'));
const roomTemplate = new Template(Path.resolve(__dirname, 'templates', 'zerotolerance-room.html'));

exports.setup = function (App) {
	/* Menu Options */
	App.server.setMenuOption('zerotol', 'Zero&nbsp;Tolerance', '/zerotol/', 'moderation', 0);

	/* Handlers */
	App.server.setHandler('zerotol', (context, parts) => {
		if (!context.user || !context.user.can('moderation')) {
			context.endWith403();
			return;
		}

		let ok = null, error = null;
		if (context.post.edit) {
			let data = App.modules.moderation.system.data.zeroTolerance;
			let room = Text.toRoomid(context.post.room);
			try {
				check(room, 'You must specify a room');
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				let minTol = (context.post.min || "").split(',');
				let lowTol = (context.post.low || "").split(',');
				let normalTol = (context.post.normal || "").split(',');
				let highTol = (context.post.high || "").split(',');
				let maxTol = (context.post.max || "").split(',');
				let zt = {};
				for (let i = 0; i < minTol.length; i++) {
					let user = Text.toId(minTol[i]);
					if (user) {
						zt[user] = 'min';
					}
				}
				for (let i = 0; i < lowTol.length; i++) {
					let user = Text.toId(lowTol[i]);
					if (user) {
						zt[user] = 'low';
					}
				}
				for (let i = 0; i < normalTol.length; i++) {
					let user = Text.toId(normalTol[i]);
					if (user) {
						zt[user] = 'normal';
					}
				}
				for (let i = 0; i < highTol.length; i++) {
					let user = Text.toId(highTol[i]);
					if (user) {
						zt[user] = 'high';
					}
				}
				for (let i = 0; i < maxTol.length; i++) {
					let user = Text.toId(maxTol[i]);
					if (user) {
						zt[user] = 'max';
					}
				}
				if (Object.keys(zt).length === 0) {
					delete data[room];
				} else {
					data[room] = zt;
				}
				App.modules.moderation.system.data.enableZeroTol[room] = !!context.post.incpun;
				if (!App.modules.moderation.system.data.enableZeroTol[room]) {
					delete App.modules.moderation.system.data.enableZeroTol[room];
				}
				App.modules.moderation.system.db.write();
				App.logServerAction(context.user.id, "Edit Zero Tolerance. Room: " + room);
				ok = 'Zero Tolerance list for room <strong>' + room + '</strong> saved.';
			}
		} else if (context.post.add) {
			let data = App.modules.moderation.system.data.zeroTolerance;
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
				App.logServerAction(context.user.id, "Add Zero Tolerance Room: " + room);
				ok = 'Room <strong>' + room + '</strong> added to the zero tolerance feature.';
			}
		}

		let htmlVars = {};

		htmlVars.rooms = '';
		let data = App.modules.moderation.system.data.zeroTolerance;
		for (let room in data) {
			let minTol = [], lowTol = [], normalTol = [], highTol = [], maxTol = [];
			for (let user in data[room]) {
				switch (data[room][user]) {
				case 'min':
					minTol.push(user);
					break;
				case 'low':
					lowTol.push(user);
					break;
				case 'normal':
					normalTol.push(user);
					break;
				case 'high':
					highTol.push(user);
					break;
				case 'max':
					maxTol.push(user);
					break;
				}
			}
			htmlVars.rooms += roomTemplate.make({
				room: room,
				name: Text.escapeHTML(App.parser.getRoomTitle(room)),
				enabled: (App.modules.moderation.system.data.enableZeroTol[room] ? ' checked="checked"' : ''),
				min: minTol.join(', '),
				low: lowTol.join(', '),
				normal: normalTol.join(', '),
				high: highTol.join(', '),
				max:  maxTol.join(', '),
			});
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), {title: "Zero Tolerance - Showdown ChatBot"});
	});
};
