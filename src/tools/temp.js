/**
 * Temp Manager
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');
const Text = Tools('text');
const EventManager = Tools('events');

/**
 * Represents a temporal files manager
 */
class TempManager {
	/**
	 * @param {Path} path
	 * @param {Number} size
	 */
	constructor(path, size) {
		this.path = path;
		this.files = [];
		for (let i = 0; i < size; i++) {
			this.files.push(null);
		}
		let dir = FileSystem.readdirSync(this.path);
		/* Clean Temp Directory */
		for (let i = 0; i < dir.length; i++) {
			if ((/.*\.tmp/).test(dir[i])) {
				let file = Path.resolve(this.path, dir[i]);
				try {
					FileSystem.unlinkSync(file);
				} catch (e) {}
			}
		}
		this.events = new EventManager();
	}

	/**
	 * @param {String} data
	 * @returns {String} Temporal file key
	 */
	createTempFile(data) {
		let toRemove = this.files.pop();
		if (toRemove) {
			try {
				FileSystem.unlinkSync(toRemove.path);
			} catch (e) {}
		}
		let key;
		do {
			key = Text.randomId(20);
		} while (this.getTempFile(key));
		let file = {
			key: key,
			path: Path.resolve(this.path, key + '.tmp'),
		};
		try {
			FileSystem.writeFileSync(file.path, data);
		} catch (err) {
			this.events.emit('error', err);
			this.files.push(null);
			return null;
		}
		this.files.unshift(file);
		return key;
	}

	/**
	 * @param {String} key
	 * @returns {Path} Temporal file
	 */
	getTempFile(key) {
		for (let i = 0; i < this.files.length; i++) {
			if (this.files[i] && this.files[i].key === key) {
				return this.files[i].path;
			}
		}
		return null;
	}
}

module.exports = TempManager;
