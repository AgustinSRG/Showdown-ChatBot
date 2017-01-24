/**
 * Encrypted JSON Database
 */

'use strict';

const Crypto = require('crypto');
const EventsManager = Tools('events');

/**
 * Encrypts a text
 * @param {String} text
 * @param {String} algorithm
 * @param {String} password
 * @returns {String} Encrypted text
 */
function encrypt(text, algorithm, password) {
	let cipher = Crypto.createCipher(algorithm, password);
	let crypted = cipher.update(text, 'utf8', 'hex');
	crypted += cipher.final('hex');
	return crypted;
}

/**
 * Decrypts a text
 * @param {String} text - Encrypted text
 * @param {String} algorithm
 * @param {String} password
 * @returns {String} Decrypted text
 */
function decrypt(text, algorithm, password) {
	let decipher = Crypto.createDecipher(algorithm, password);
	let data = decipher.update(text, 'hex', 'utf8');
	data += decipher.final('utf8');
	return data;
}

/**
 * Represents an encrypted JSON database
 */
class JSONDataBase {
	constructor(dam, file, password, algo) {
		this.dam = dam;
		this.algo = algo || "aes-256-ctr";
		this.password = password;
		this.data = {};
		this.file = file;
		this.events = new EventsManager();
		this.load();
	}

	write() {
		let data = JSON.stringify(this.data);
		data = encrypt(data, this.algo, this.password);
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
				this.data = JSON.parse(decrypt(data, this.algo, this.password));
			} catch (err) {
				this.data = JSON.parse(decrypt(this.dam.getFileContent(this.file, true), this.algo, this.password));
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
