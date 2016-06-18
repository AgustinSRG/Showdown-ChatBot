/**
 * Abuse Monitor
 * A tool to avoid potential DDos or command flood
 */

'use strict';

const EventsManager = Tools.get('events.js');

class AbuseMonitor {
	constructor(maxFlood, intervalFlood) {
		this.events = new EventsManager();
		this.usage = {};
		this.times = {};
		this.locked = {};
		this.maxFlood = maxFlood;
		this.intervalFlood = intervalFlood;
	}

	on(event, handler) {
		this.events.on(event, handler);
	}

	removeListener(event, handler) {
		this.events.removeListener(event, handler);
	}

	isLocked(user) {
		return !!this.locked[user];
	}

	lock(user, reason) {
		this.locked[user] = true;
		this.events.emit('lock', user, reason);
	}

	unlock(user) {
		delete this.locked[user];
		this.events.emit('unlock', user);
	}

	count(user) {
		let now = Date.now();
		if (!this.times[user]) {
			this.usage[user] = 1;
			this.times[user] = now;
			return false;
		}
		let duration = now - this.times[user];
		if (user in this.usage && duration < this.intervalFlood) {
			this.usage[user]++;
			if (this.usage[user] >= this.maxFlood) {
				this.lock(user, 'User ' + user + ' has been locked (flood: ' + this.usage[user] + ' hits in the last ' + duration.duration() + ')');
				return true;
			}
		} else {
			this.usage[user] = 1;
			this.times[user] = now;
		}
		return false;
	}
}

module.exports = AbuseMonitor;
