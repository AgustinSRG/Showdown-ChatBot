/**
 * Cache Sytems
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');
const Text = Tools.get('text.js');
const DataBase = Tools.get('json-db.js');

class BufferCache {
	constructor(length) {
		this.data = [];
		this.length = length;
		for (let i = 0; i < length; i++) {
			this.data.push(null);
		}
	}

	cache(key, value) {
		this.data.pop();
		this.data.unshift({key: key, value: value});
	}

	has(key) {
		for (let i = 0; i < this.length; i++) {
			if (this.data[i] && this.data[i].key === key) return true;
		}
		return false;
	}

	get(key) {
		for (let i = 0; i < this.length; i++) {
			if (this.data[i] && this.data[i].key === key) {
				return this.data[i].value;
			}
		}
		return null;
	}
}

class WebCache {
	constructor(path) {
		this.path = path;
		this.db = new DataBase(Path.resolve(path, 'cache.json'));
		this.data = this.db.data;
	}

	write() {
		this.db.write();
	}

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
				App.log("Error (" + err.code + ") " + err.message + " | Cache " + url);
			}
			this.write();
		}.bind(this));
	}

	has(url) {
		return !!this.data[url];
	}

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

	uncache(url) {
		if (this.data[url]) {
			try {
				FileSystem.unlinkSync(Path.resolve(this.path, this.data[url].cache));
			} catch (err) {}
			delete this.data[url];
		}
	}
}

exports.BufferCache = BufferCache;
exports.WebCache = WebCache;
