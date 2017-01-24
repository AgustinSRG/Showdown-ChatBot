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
		this.data = {};
		this.dam = dam;
		this.file = file;
		this.events = new EventsManager();
		this.load();
	}

	write() {
		let data = JSON.stringify(this.data);
		this.dam.setFileContent(this.file, data);
		this.events.emit('write');
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
				this.data = JSON.parse(data);
			} catch (err) {
				this.data = JSON.parse(this.dam.getFileContent(this.file, true));
			}
		} catch (err) {
			this.data = {};
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
