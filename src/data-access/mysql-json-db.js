/**
 * JSON Database
 */

'use strict';

const EventsManager = Tools('events');

/**
 * Represents a JSON database
 */
class JSONDataBase {
	constructor(dam, file) {
		this.data = Object.create(null);
		this.dam = dam;
		this.file = file;
		this.events = new EventsManager();
		this.load();
	}

	write(callback) {
		let data = JSON.stringify(this.data);
		this.dam.setFileContent(this.file, data);
		this.events.emit('write');
		if (callback && typeof callback === "function") {
			return callback();
		}
	}

	on(event, handler) {
		this.events.on(event, handler);
	}

	removeListener(event, handler) {
		this.events.removeListener(event, handler);
	}

	load() {
		try {
			let data = this.dam.getFileContent(this.file);
			try {
				this.data = JSON.parseNoPrototype(data);
			} catch (err) {
				this.data = JSON.parseNoPrototype(this.dam.getFileContent(this.file, true));
			}
		} catch (err) {
			this.data = Object.create(null);
		}
		this.events.emit('load');
	}

	get() {
		return this.data;
	}

	set(data) {
		this.data = data;
	}

	destroy() {
		this.dam.removeFile(this.file);
	}
}

module.exports = JSONDataBase;
