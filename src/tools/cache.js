/**
 * Cache Sytems
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');
const Text = Tools('text');
const DataBase = Tools('json-db');
const EventManager = Tools('events');

/**
 * Represents a limited cache
 * stored in RAM
 */
class BufferCache {
	/**
	 * @param {Number} length
	 * @param {Number} expiration
	 */
	constructor(length, expiration) {
		this.data = [];
		this.length = length;
		for (let i = 0; i < length; i++) {
			this.data.push(null);
		}
		this.expiration = expiration || 0;
	}

	/**
	 * @param {String} key
	 * @param {Object|Number|String} value
	 */
	cache(key, value) {
		this.data.pop();
		this.data.unshift({key: key, value: value, time: Date.now()});
	}

	/**
	 * @param {String} key
	 * @returns {Boolean}
	 */
	has(key) {
		for (let i = 0; i < this.length; i++) {
			if (this.expiration && this.data[i] && (Date.now() - this.data[i].time) > this.expiration) {
				this.remove(this.data[i].key);
			}
			if (this.data[i] && this.data[i].key === key) return true;
		}
		return false;
	}

	/**
	 * @param {String} key
	 * @returns {Object|Number|String} Cached value, null if not exits
	 */
	get(key) {
		for (let i = 0; i < this.length; i++) {
			if (this.data[i] && this.data[i].key === key) {
				return this.data[i].value;
			}
		}
		return null;
	}

	/**
	 * @param {String} key
	 */
	remove(key) {
		for (let i = 0; i < this.length; i++) {
			if (this.data[i] && this.data[i].key === key) {
				this.data[i] = null;
			}
		}
	}
}

/**
 * Represents an unlimited cache
 * stored in the hard disk
 */
class WebCache {
	/**
	 * @param {Path} path - Directory where the cached files are located
	 */
	constructor(path) {
		this.path = path;
		this.db = new DataBase(Path.resolve(path, 'cache.json'));
		this.data = this.db.data;
		this.events = new EventManager();
	}

	write() {
		this.db.write();
	}

	/**
	 * @returns {String} Free cache key
	 */
	getFreeCache() {
		let id, rep;
		do {
			id = Text.randomId(6);
			rep = false;
			for (let k in this.data) {
				if (this.data[k].cache === id) {
					rep = true;
					break;
				}
			}
		} while (rep);
		return id;
	}

	/**
	 * @param {String} url
	 * @param {String} data
	 * @param {Number} expires
	 * @param {Object} marks
	 */
	cache(url, data, expires, marks) {
		let cacheFile = this.getFreeCache();
		this.data[url] = {
			cache: cacheFile,
			date: Date.now(),
			expires: (expires || 0),
			marks: (marks || {}),
		};
		FileSystem.writeFile(Path.resolve(this.path, cacheFile), data, function (err) {
			if (err) {
				delete this.data[url];
				this.events.emit('error', err, url);
			}
			this.write();
		}.bind(this));
	}

	/**
	 * @param {String} url
	 */
	has(url) {
		return !!this.data[url];
	}

	/**
	 * @param {String} url
	 * @returns {String} Cached data
	 */
	get(url) {
		if (this.data[url]) {
			try {
				return {
					data: FileSystem.readFileSync(Path.resolve(this.path, this.data[url].cache)).toString(),
					marks: this.data[url].marks,
				};
			} catch (err) {
				this.uncache(url);
				this.write();
				return null;
			}
		} else {
			return null;
		}
	}

	/**
	 * @param {String} url
	 * @returns {Object} Cache marks
	 */
	getMarks(url) {
		if (this.data[url]) {
			return this.data[url].marks;
		} else {
			return null;
		}
	}

	sweep() {
		let mod = false;
		for (let url in this.data) {
			if (this.data[url].expires <= 0) continue;
			if (Date.now() - this.data[url].date > this.data[url].expires) {
				this.uncache(url);
				mod = true;
			}
		}
		if (mod) this.write();
	}

	/**
	 * @param {String} url
	 */
	uncache(url) {
		if (this.data[url]) {
			try {
				FileSystem.unlinkSync(Path.resolve(this.path, this.data[url].cache));
			} catch (err) {}
			delete this.data[url];
		}
	}

	/**
	 * @param {String} mark
	 */
	uncacheAll(mark) {
		for (let url in this.data) {
			if (this.data[url].marks && this.data[url].marks[mark]) {
				this.uncache(url);
			}
		}
	}
}

exports.BufferCache = BufferCache;
exports.WebCache = WebCache;
