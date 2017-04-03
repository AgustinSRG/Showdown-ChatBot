/**
 * Abuse Monitor
 * A tool to avoid potential DDos or command flood
 */

'use strict';

const EventsManager = Tools('events');

/**
 * Represents an abuse monitor
 */
class AbuseMonitor {
	/**
	 * @param {Number} maxFlood - Max number of hits
	 * @param {Number} intervalFlood - Interval of time
	 */
	constructor(maxFlood, intervalFlood, expireTime) {
		this.events = new EventsManager();
		this.usage = {};
		this.times = {};
		this.locked = {};
		this.maxFlood = maxFlood;
		this.intervalFlood = intervalFlood;
		this.expireTime = expireTime || 0;
	}

	/**
	 * @param {String} event
	 * @param {function} handler
	 */
	on(event, handler) {
		this.events.on(event, handler);
	}

	/**
	 * @param {String} event
	 * @param {function} handler
	 */
	removeListener(event, handler) {
		this.events.removeListener(event, handler);
	}

	/**
	 * @param {String} user
	 * @returns {Boolean}
	 */
	isLocked(user) {
		if (this.expireTime) {
			for (let u in this.locked) {
				if (Date.now() - this.locked[u].time > this.expireTime) {
					delete this.locked[u];
					this.events.emit('unlock', u);
				}
			}
		}
		return !!this.locked[user];
	}

	/**
	 * @param {String} user
	 * @param {String} reason
	 */
	lock(user, reason) {
		this.locked[user] = {time: Date.now()};
		this.events.emit('lock', user, reason);
	}

	/**
	 * @param {String} user
	 */
	unlock(user) {
		delete this.locked[user];
		this.events.emit('unlock', user);
	}

	/**
	 * @param {String} user
	 */
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
				this.lock(user, 'User ' + user + ' has been locked (flood: ' + this.usage[user] +
					' hits in the last ' + (duration / 1000) + ' seconds)');
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
