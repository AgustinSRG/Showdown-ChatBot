/**
 * Server Handler: Zero Tolerance
 */

'use strict';

const Text = Tools.get('text.js');
const check = Tools.get('check.js');

/* Menu Options */

App.server.setMenuOption('zerotol', 'Zero&nbsp;Tolerance', '/zerotol/', 'moderation');

/* Handlers */

App.server.setHandler('zerotol', (context, parts) => {
	/* Permission Check */
	if (!context.user || !context.user.can('moderation')) {
		context.endWith403();
		return;
	}

	/* Actions */
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

	/* Generate Html */
	let html = '';
	html += '<h2>Zero Tolerance</h2>';

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
		html += '<h3>Room: ' + room + '</h3>';
		html += '<form method="post" action="">';
		html += '<input type="hidden" name="room" value="' + room + '" />';
		html += '<p><input type="checkbox" name="incpun" value="true"' +
			(App.modules.moderation.system.data.enableZeroTol[room] ? ' checked="checked"' : '') +
			' />&nbsp;Enable increase punishment mode</p>';
		html += '<p>Zero Tolerance (MIN):</p><p><textarea name="min" cols="80" rows="2">' + minTol.join(', ') + '</textarea></p>';
		html += '<p>Zero Tolerance (LOW):</p><p><textarea name="low" cols="80" rows="2">' + lowTol.join(', ') + '</textarea></p>';
		html += '<p>Zero Tolerance (NORMAL):</p><p><textarea name="normal" cols="80" rows="2">' + normalTol.join(', ') + '</textarea></p>';
		html += '<p>Zero Tolerance (HIGH):</p><p><textarea name="high" cols="80" rows="2">' + highTol.join(', ') + '</textarea></p>';
		html += '<p>Zero Tolerance (MAX):</p><p><textarea name="max" cols="80" rows="2">' + maxTol.join(', ') + '</textarea></p>';
		html += '<p><input type="submit" name="edit" value="Save Changes" /></p>';
		html += '</form>';
		html += '<hr />';
	}

	html += '<form method="post" action=""><input name="room" type="text" size="30" />' +
		'&nbsp;&nbsp;<input type="submit" name="add" value="Add Room" /></form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Zero Tolerance - Showdown ChatBot"});
});

