// Scheduled Announcements add-on for Showdown-ChatBot
// -----------------------------------------------------
// Adds wall-clock-based recurring announcements that survive bot restarts.
// Unlike the built-in repeat command (countdown-based), events fire at a
// specific time each day or on a specific day of the week.
//
// Added commands:
//   .sched                              - List upcoming events for this room
//   .sched next                         - Show the next event and when it fires
//   .sched add, <name>, <day>, <HH:MM>, <message>
//   .sched remove, <name>
//   .sched timezone, <timezone>         - Set room timezone (default: UTC)
//
// Control panel section: "Scheduled Announcements"
//   Full add / delete UI with Early Warning support (fires N minutes before).
//
// Permission to add/remove/timezone: schedadmin (mod by default)
// Permission for control panel:      schedannounce (mod by default)

'use strict';

const Path = require('path');
const Text = Tools('text');
const DataBase = Tools('json-db');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// How often to check for due events (ms). Aligned to next full minute on start.
const CHECK_INTERVAL = 60 * 1000;

exports.setup = function (App) {
	const db = new DataBase(Path.resolve(App.confDir, 'scheduled-announcements.json'));
	const data = db.data;
	if (!data.rooms) data.rooms = {};

	// Prevent double-firing within the same minute: eventKey → "YYYY-MM-DD HH:MM"
	const lastFired = Object.create(null);

	let checkTimer = null;
	let alignTimer = null;

	function saveData() {
		db.write();
	}

	function generateId() {
		return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
	}

	function getRoomConfig(room) {
		if (!data.rooms[room]) {
			data.rooms[room] = { timezone: 'UTC', events: [] };
		}
		return data.rooms[room];
	}

	// Returns current time info in the given IANA timezone.
	function getNowInTimezone(tz) {
		const now = new Date();
		let parts;
		try {
			const fmt = new Intl.DateTimeFormat('en-US', {
				timeZone: tz,
				hour12: false,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				weekday: 'long',
				hour: '2-digit',
				minute: '2-digit',
			});
			parts = {};
			for (const p of fmt.formatToParts(now)) {
				parts[p.type] = p.value;
			}
		} catch (e) {
			// Fallback to UTC on invalid timezone
			const fmt = new Intl.DateTimeFormat('en-US', {
				timeZone: 'UTC',
				hour12: false,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				weekday: 'long',
				hour: '2-digit',
				minute: '2-digit',
			});
			parts = {};
			for (const p of fmt.formatToParts(now)) {
				parts[p.type] = p.value;
			}
		}
		let hour = parseInt(parts.hour);
		if (hour === 24) hour = 0; // Some engines return 24 for midnight
		return {
			dayOfWeek: DAYS.indexOf(parts.weekday), // 0 = Sunday
			hour: hour,
			minute: parseInt(parts.minute),
			dateStr: parts.year + '-' + parts.month + '-' + parts.day,
		};
	}

	// Returns a human-readable string for when the event next fires.
	function getNextOccurrence(event, timezone) {
		const now = getNowInTimezone(timezone || 'UTC');
		const [evH, evM] = event.time.split(':').map(Number);
		const nowTotalMin = now.hour * 60 + now.minute;
		const evTotalMin = evH * 60 + evM;

		if (event.day === -1) {
			// Daily
			if (nowTotalMin < evTotalMin) {
				return 'today at ' + event.time;
			} else {
				return 'tomorrow at ' + event.time;
			}
		} else {
			const dayDiff = ((event.day - now.dayOfWeek) + 7) % 7;
			if (dayDiff === 0) {
				if (nowTotalMin < evTotalMin) {
					return 'today at ' + event.time;
				} else {
					return 'next ' + DAYS[event.day] + ' at ' + event.time;
				}
			} else {
				return (dayDiff === 1 ? 'tomorrow' : 'next ' + DAYS[event.day]) + ' at ' + event.time;
			}
		}
	}

	// Returns minutes until the event fires (always positive, wraps around week/day).
	function minutesUntil(event, timezone) {
		const now = getNowInTimezone(timezone || 'UTC');
		const [evH, evM] = event.time.split(':').map(Number);
		const nowTotalMin = now.hour * 60 + now.minute;
		const evTotalMin = evH * 60 + evM;

		if (event.day === -1) {
			let diff = evTotalMin - nowTotalMin;
			if (diff <= 0) diff += 24 * 60;
			return diff;
		} else {
			let dayDiff = ((event.day - now.dayOfWeek) + 7) % 7;
			let diff = dayDiff * 24 * 60 + evTotalMin - nowTotalMin;
			if (diff <= 0) diff += 7 * 24 * 60;
			return diff;
		}
	}

	function checkAndFire() {
		for (const room of Object.keys(data.rooms)) {
			const roomConfig = data.rooms[room];
			const tz = roomConfig.timezone || 'UTC';
			const now = getNowInTimezone(tz);
			const fireKey = now.dateStr + ' ' + String(now.hour).padStart(2, '0') + ':' + String(now.minute).padStart(2, '0');

			for (const event of (roomConfig.events || [])) {
				const [evH, evM] = event.time.split(':').map(Number);

				// --- Main event fire ---
				const isEventDay = event.day === -1 || event.day === now.dayOfWeek;
				const isEventTime = isEventDay && now.hour === evH && now.minute === evM;
				const mainKey = room + ':' + event.id + ':main';

				if (isEventTime && lastFired[mainKey] !== fireKey) {
					lastFired[mainKey] = fireKey;
					if (App.bot.rooms[room]) {
						App.bot.sendTo(room, event.message);
					}
				}

				// --- Early warning fire ---
				if (event.earlyWarning && event.earlyWarning > 0) {
					const totalMinutesNow = now.hour * 60 + now.minute;
					const totalMinutesEvent = evH * 60 + evM;
					const diff = totalMinutesEvent - totalMinutesNow;
					const isEarlyDay = event.day === -1 || event.day === now.dayOfWeek;
					const isEarlyTime = isEarlyDay && diff === event.earlyWarning;
					const earlyKey = room + ':' + event.id + ':early';

					if (isEarlyTime && lastFired[earlyKey] !== fireKey) {
						lastFired[earlyKey] = fireKey;
						if (App.bot.rooms[room]) {
							App.bot.sendTo(room, event.earlyWarning + ' minutes until: ' + event.message);
						}
					}
				}
			}
		}
	}

	function startTimer() {
		stopTimer();
		// Align first check to the top of the next minute so we don't miss or double-fire.
		const now = new Date();
		const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 500;
		alignTimer = setTimeout(function () {
			alignTimer = null;
			checkAndFire();
			checkTimer = setInterval(checkAndFire, CHECK_INTERVAL);
		}, msUntilNextMinute);
	}

	function stopTimer() {
		if (alignTimer) {
			clearTimeout(alignTimer);
			alignTimer = null;
		}
		if (checkTimer) {
			clearInterval(checkTimer);
			checkTimer = null;
		}
	}

	// --- Argument helpers ---

	function parseDay(str) {
		str = (str + '').toLowerCase().trim();
		if (str === 'daily' || str === 'everyday' || str === 'every' || str === 'all') return -1;
		for (let i = 0; i < DAYS.length; i++) {
			if (DAYS[i].toLowerCase().startsWith(str) || SHORT_DAYS[i].toLowerCase() === str) return i;
		}
		const n = parseInt(str);
		if (!isNaN(n) && n >= 0 && n <= 6) return n;
		return null; // invalid
	}

	function isValidTime(str) {
		if (!/^\d{1,2}:\d{2}$/.test(str)) return false;
		const [h, m] = str.split(':').map(Number);
		return h >= 0 && h <= 23 && m >= 0 && m <= 59;
	}

	function normalizeTime(str) {
		const [h, m] = str.split(':').map(Number);
		return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
	}

	// --- Control panel HTML ---

	function renderControlPanel(context, ok, error) {
		let html = '';

		html += '<h2>Scheduled Announcements</h2>';
		html += '<p>Schedule recurring announcements for your rooms. Events fire at the specified wall-clock time and survive bot restarts. ' +
			'Timing is based on room timezone (default UTC). Day can be a day of the week or <b>Daily</b>.</p>';

		if (ok) html += '<p><span class="ok-msg">' + Text.escapeHTML(ok) + '</span></p>';
		if (error) html += '<p><span class="error-msg">' + Text.escapeHTML(error) + '</span></p>';

		// --- Add new event form ---
		html += '<h3>Add New Event</h3>';
		html += '<form method="post" action="">';
		html += '<table border="0" cellpadding="5" style="max-width:700px;">';

		html += '<tr><td><b>Room ID</b></td><td>' +
			'<input type="text" name="add_room" placeholder="e.g. lobby" style="width:180px;" /></td></tr>';

		html += '<tr><td><b>Event Name</b></td><td>' +
			'<input type="text" name="add_name" placeholder="e.g. Weekly OU Tournament" style="width:280px;" /></td></tr>';

		html += '<tr><td><b>Day</b></td><td><select name="add_day">' +
			'<option value="-1">Daily</option>';
		for (let i = 0; i < DAYS.length; i++) {
			html += '<option value="' + i + '">' + DAYS[i] + '</option>';
		}
		html += '</select></td></tr>';

		html += '<tr><td><b>Time (24h HH:MM)</b></td><td>' +
			'<input type="text" name="add_time" placeholder="17:00" style="width:80px;" /></td></tr>';

		html += '<tr><td><b>Timezone</b></td><td>' +
			'<input type="text" name="add_tz" placeholder="UTC" value="UTC" style="width:160px;" />' +
			'&nbsp;<small>IANA timezone, e.g. America/New_York, Europe/London</small></td></tr>';

		html += '<tr><td><b>Early Warning</b></td><td>' +
			'<input type="number" name="add_early" placeholder="0" min="0" max="120" style="width:70px;" />' +
			'&nbsp;<small>minutes before (0 = off)</small></td></tr>';

		html += '<tr><td><b>Message</b></td><td>' +
			'<input type="text" name="add_msg" placeholder="Announcement text..." style="width:400px;" /></td></tr>';

		html += '</table>';
		html += '<p><input type="submit" name="add_event" value="Add Event" /></p>';
		html += '</form>';

		// --- Existing events table ---
		html += '<h3>Current Scheduled Events</h3>';

		let hasAny = false;
		const rooms = Object.keys(data.rooms).sort();

		for (const room of rooms) {
			const roomConfig = data.rooms[room];
			if (!roomConfig.events || roomConfig.events.length === 0) continue;
			hasAny = true;
			const tz = roomConfig.timezone || 'UTC';

			html += '<h4>Room: <b>' + Text.escapeHTML(room) + '</b>' +
				'&nbsp;<span style="font-weight:normal; font-size:0.9em;">(Timezone: ' + Text.escapeHTML(tz) + ')</span></h4>';

			html += '<table border="1" cellpadding="5" cellspacing="0" style="width:100%; max-width:960px; margin-bottom:16px; border-collapse:collapse;">';
			html += '<tr style="background:#f0f0f0;">' +
				'<th>Name</th><th>Day</th><th>Time</th><th>Early Warning</th><th>Message</th><th>Next Occurrence</th><th>Delete</th>' +
				'</tr>';

			for (const event of roomConfig.events) {
				const dayLabel = event.day === -1 ? 'Daily' : (DAYS[event.day] || '?');
				let nextOcc = '';
				try { nextOcc = getNextOccurrence(event, tz); } catch (e) { nextOcc = 'N/A'; }

				html += '<tr>';
				html += '<td><b>' + Text.escapeHTML(event.name) + '</b></td>';
				html += '<td>' + Text.escapeHTML(dayLabel) + '</td>';
				html += '<td style="font-family:monospace;">' + Text.escapeHTML(event.time) + '</td>';
				html += '<td>' + (event.earlyWarning ? event.earlyWarning + ' min' : 'Off') + '</td>';
				html += '<td>' + Text.escapeHTML(event.message) + '</td>';
				html += '<td><i>' + Text.escapeHTML(nextOcc) + '</i></td>';
				html += '<td style="text-align:center;">';
				html += '<form method="post" action="" style="display:inline;margin:0;">';
				html += '<input type="hidden" name="del_room" value="' + Text.escapeHTML(room) + '" />';
				html += '<input type="hidden" name="del_id" value="' + Text.escapeHTML(event.id) + '" />';
				html += '<input type="submit" name="del_event" value="Delete" />';
				html += '</form>';
				html += '</td>';
				html += '</tr>';
			}

			html += '</table>';
		}

		if (!hasAny) {
			html += '<p><i>No scheduled events configured yet.</i></p>';
		}

		context.endWithWebPage(html, { title: 'Scheduled Announcements - Showdown ChatBot' });
	}

	// --- Install ---

	return Tools('add-on').forApp(App).install({
		commands: {
			'schedule': 'sched',
			'events': 'sched',
			'sched': function (App) {
				const room = this.room;
				const sub = Text.toId(this.args[0] || '');

				// .sched  or  .sched list  — show this room's events
				if (!sub || sub === 'list') {
					const rc = data.rooms[room];
					if (!rc || !rc.events || rc.events.length === 0) {
						return this.reply('No scheduled announcements for this room.');
					}
					const tz = rc.timezone || 'UTC';
					const lines = ['Scheduled announcements (Timezone: ' + tz + '):'];
					for (const event of rc.events) {
						const dayLabel = event.day === -1 ? 'daily' : DAYS[event.day];
						let next = '';
						try { next = getNextOccurrence(event, tz); } catch (e) { next = '?'; }
						lines.push('• ' + event.name + ' — ' + dayLabel + ' at ' + event.time +
							(event.earlyWarning ? ' (+' + event.earlyWarning + 'min warning)' : '') +
							' — Next: ' + next);
					}
					return this.restrictReply(lines.join('\n'), 'sched');
				}

				// .sched next  — show the soonest upcoming event
				if (sub === 'next') {
					const rc = data.rooms[room];
					if (!rc || !rc.events || rc.events.length === 0) {
						return this.reply('No scheduled announcements for this room.');
					}
					const tz = rc.timezone || 'UTC';
					let soonest = null;
					let soonestMin = Infinity;
					for (const event of rc.events) {
						let m;
						try { m = minutesUntil(event, tz); } catch (e) { continue; }
						if (m < soonestMin) { soonestMin = m; soonest = event; }
					}
					if (!soonest) return this.reply('No upcoming events found.');
					const next = getNextOccurrence(soonest, tz);
					return this.reply('Next announcement: ' + soonest.name + ' — ' + next);
				}

				// Everything below requires staff permission
				if (!this.can('schedadmin', room)) return this.replyAccessDenied('schedadmin');

				// .sched add, <name>, <day>, <HH:MM>, <message>
				if (sub === 'add') {
					if (this.args.length < 5) {
						return this.errorReply('Usage: ' + this.token + 'sched add, <name>, <day/daily>, <HH:MM>, <message>');
					}
					const name = (this.args[1] || '').trim();
					const dayStr = (this.args[2] || '').trim();
					const timeStr = (this.args[3] || '').trim();
					const message = this.args.slice(4).join(',').trim();

					if (!name) return this.errorReply('Event name cannot be empty.');
					const day = parseDay(dayStr);
					if (day === null) {
						return this.errorReply('Invalid day. Use: daily, Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday.');
					}
					if (!isValidTime(timeStr)) return this.errorReply('Invalid time format. Use HH:MM (24h).');
					if (!message) return this.errorReply('Message cannot be empty.');

					const rc = getRoomConfig(room);
					if (rc.events.some(e => Text.toId(e.name) === Text.toId(name))) {
						return this.errorReply('An event with that name already exists. Remove it first.');
					}
					rc.events.push({ id: generateId(), name: name, day: day, time: normalizeTime(timeStr), message: message, earlyWarning: 0 });
					saveData();
					const dayLabel = day === -1 ? 'daily' : DAYS[day];
					return this.reply('Scheduled "' + name + '" added — fires ' + dayLabel + ' at ' + normalizeTime(timeStr) + '.');
				}

				// .sched remove, <name>
				if (sub === 'remove' || sub === 'delete' || sub === 'del' || sub === 'rm') {
					const name = this.args.slice(1).join(',').trim();
					if (!name) return this.errorReply('Usage: ' + this.token + 'sched remove, <name>');
					const rc = data.rooms[room];
					if (!rc || !rc.events) return this.errorReply('No scheduled events for this room.');
					const before = rc.events.length;
					rc.events = rc.events.filter(e => Text.toId(e.name) !== Text.toId(name));
					if (rc.events.length === before) return this.errorReply('No event found with that name.');
					saveData();
					return this.reply('Scheduled event "' + name + '" removed.');
				}

				// .sched timezone, <tz>
				if (sub === 'timezone' || sub === 'tz') {
					const tz = this.args.slice(1).join(',').trim();
					if (!tz) return this.errorReply('Usage: ' + this.token + 'sched timezone, <IANA timezone>');
					try {
						getNowInTimezone(tz); // validate
						const rc = getRoomConfig(room);
						rc.timezone = tz;
						saveData();
						return this.reply('Timezone set to ' + tz + ' for this room.');
					} catch (e) {
						return this.errorReply('Invalid timezone: ' + tz + '. Use an IANA name, e.g. America/New_York.');
					}
				}

				return this.errorReply('Usage: ' + this.token + 'sched [list | next | add | remove | timezone]');
			},
		},

		commandPermissions: {
			'sched': { group: 'user' },
			'schedadmin': { group: 'mod' },
		},

		serverHandlers: {
			'schedannounce': function (context, parts) {
				if (!context.user || !context.user.can('schedannounce')) {
					context.endWith403();
					return;
				}

				let ok = null, error = null;

				if (context.post.add_event) {
					const room = Text.toRoomid((context.post.add_room || '').trim());
					const name = (context.post.add_name || '').trim();
					const day = parseInt(context.post.add_day);
					const time = (context.post.add_time || '').trim();
					const tz = (context.post.add_tz || 'UTC').trim() || 'UTC';
					const earlyWarning = Math.max(0, parseInt(context.post.add_early) || 0);
					const message = (context.post.add_msg || '').trim();

					if (!room) {
						error = 'Room ID is required.';
					} else if (!name) {
						error = 'Event name is required.';
					} else if (isNaN(day) || day < -1 || day > 6) {
						error = 'Invalid day selection.';
					} else if (!isValidTime(time)) {
						error = 'Invalid time format. Use HH:MM.';
					} else if (!message) {
						error = 'Message is required.';
					} else {
						try { getNowInTimezone(tz); } catch (e) { error = 'Invalid timezone: ' + tz; }

						if (!error) {
							const rc = getRoomConfig(room);
							if (rc.events.some(e => Text.toId(e.name) === Text.toId(name))) {
								error = 'An event with that name already exists in room "' + room + '". Remove it first.';
							} else {
								rc.timezone = tz;
								rc.events.push({
									id: generateId(),
									name: name,
									day: day,
									time: normalizeTime(time),
									message: message,
									earlyWarning: earlyWarning,
								});
								saveData();
								App.logServerAction(context.user.id, 'Added scheduled announcement: ' + room + ' / ' + name);
								const dayLabel = day === -1 ? 'daily' : DAYS[day];
								ok = 'Event "' + name + '" added to room "' + room + '" — fires ' + dayLabel + ' at ' + normalizeTime(time) + '.';
							}
						}
					}
				} else if (context.post.del_event) {
					const room = Text.toRoomid((context.post.del_room || '').trim());
					const id = (context.post.del_id || '').trim();

					if (room && id && data.rooms[room]) {
						const before = data.rooms[room].events.length;
						data.rooms[room].events = data.rooms[room].events.filter(e => e.id !== id);
						if (data.rooms[room].events.length < before) {
							saveData();
							App.logServerAction(context.user.id, 'Deleted scheduled announcement in ' + room + ' (id: ' + id + ')');
							ok = 'Event deleted successfully.';
						} else {
							error = 'Event not found.';
						}
					} else {
						error = 'Invalid request.';
					}
				}

				renderControlPanel(context, ok, error);
			},
		},

		serverPermissions: {
			'schedannounce': 'Permission to manage scheduled announcements',
		},

		serverMenuOptions: {
			'schedannounce': { name: 'Scheduled Announcements', url: '/schedannounce/', permission: 'schedannounce', level: -2 },
		},

		customInstall: function () {
			startTimer();
		},

		customUninstall: function () {
			stopTimer();
		},
	});
};
