/**
 * Temp Manager
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');

const Text = Tools.get('text.js');

class TempManager {
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
	}

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
			App.reportCrash(err);
			this.files.push(null);
			return null;
		}
		this.files.unshift(file);
		return key;
	}

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
