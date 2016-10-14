/**
 * JSON Database
 */

'use strict';

const FileSystem = require('fs');
const EventsManager = Tools('events');

/**
 * Represents a JSON database
 */
class JSONDataBase {
	/**
	 * @param {Path} file
	 */
	constructor(file) {
		this.data = {};
		this.file = file;
		this.writePending = false;
		this.writing = false;
		this.events = new EventsManager();
		this.load();
	}

	write() {
		let data = JSON.stringify(this.data);
		let finishWriting = function () {
			this.writing = false;
			this.events.emit('write');
			if (this.writePending) {
				this.writePending = false;
				this.write();
			}
		}.bind(this);
		if (this.writing) {
			this.writePending = true;
			return;
		}
		this.writing = true;
		FileSystem.writeFile(this.file + '.0', data, function () {
			// rename is atomic on POSIX, but will throw an error on Windows
			FileSystem.rename(this.file + '.0', this.file, function (err) {
				if (err) {
					// This should only happen on Windows.
					FileSystem.writeFile(this.file, data, finishWriting);
					return;
				}
				finishWriting();
			}.bind(this));
		}.bind(this));
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

	load() {
		if (FileSystem.existsSync(this.file)) {
			let data = FileSystem.readFileSync(this.file).toString();
			try {
				this.data = JSON.parse(data);
				this.events.emit('load');
			} catch (err) {
				this.events.emit('error', err);
			}
		}
	}

	/**
	 * @returns {Object} Database main object
	 */
	get() {
		return this.data;
	}

	/**
	 * @param {Object} data
	 */
	set(data) {
		this.data = data;
	}

	/**
	 * Deletes the database file
	 */
	destroy() {
		if (FileSystem.existsSync(this.file)) {
			try {
				FileSystem.unlinkSync(this.file);
			} catch (e) {}
			this.events.emit('destroy');
		}
	}
}

module.exports = JSONDataBase;
