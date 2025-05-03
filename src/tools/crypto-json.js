/**
 * Encrypted JSON Database
 */

'use strict';

const Crypto = require('crypto');
const FileSystem = require('fs');
const EventsManager = Tools('events');

/**
 * Encrypts a text
 * @param {String} text
 * @param {String} algorithm
 * @param {String} password
 * @returns {String} Encrypted text
 */
function encrypt(text, algorithm, password) {
	const iv = Buffer.from(Crypto.randomBytes(16));
	const hash = Crypto.createHash('sha256');
	hash.update(password);
	let cipher = Crypto.createCipheriv(algorithm, hash.digest(), iv);
	let crypted = cipher.update(text, 'utf8', 'hex');
	crypted += cipher.final('hex');
	return iv.toString("hex") + ":" + crypted;
}

/**
 * Decrypts a text
 * @param {String} text - Encrypted text
 * @param {String} algorithm
 * @param {String} password
 * @returns {String} Decrypted text
 */
function decrypt(text, algorithm, password) {
	if (text.indexOf(":") === -1) {
		let decipher = Crypto.createDecipher(algorithm, password);
		let data = decipher.update(text, 'hex', 'utf8');
		data += decipher.final('utf8');
		return data;
	} else {
		const parts = text.split(":");
		const iv = Buffer.from(parts[0], 'hex');
		const hash = Crypto.createHash('sha256');
		hash.update(password);
		let decipher = Crypto.createDecipheriv(algorithm, hash.digest(), iv);
		let data = decipher.update(parts[1], 'hex', 'utf8');
		data += decipher.final('utf8');
		return data;
	}
}

/**
 * Represents an encrypted JSON database
 */
class JSONDataBase {
	/**
	 * @param {Path} file
	 * @param {String} password
	 * @param {String} algo
	 * @param {function} loadErrorLogFn
	 */
	constructor(file, password, algo, loadErrorLogFn) {
		this.algo = algo || "aes-256-ctr";
		this.password = password;
		this.data = Object.create(null);
		this.file = file;
		this.writePending = false;
		this.writing = false;
		this.events = new EventsManager();
		this.load(loadErrorLogFn);
	}

	write(callback) {
		let data = JSON.stringify(this.data);
		data = encrypt(data, this.algo, this.password);
		let finishWriting = function () {
			this.writing = false;
			this.events.emit('write');
			if (this.writePending) {
				this.writePending = false;
				this.write();
			}
			if (callback && typeof callback === "function") {
				return callback();
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

	load(loadErrorLogFn) {
		if (FileSystem.existsSync(this.file)) {
			let data;

			try {
				data = FileSystem.readFileSync(this.file).toString();
				data = decrypt(data, this.algo, this.password);
			} catch (err) {
				data = "{}";
				if (loadErrorLogFn) {
					loadErrorLogFn(err, "Could not decrypt data of file: " + this.file);
				} else {
					console.error(err);
					console.error("Could not decrypt data of file: " + this.file);
				}
			}

			try {
				this.data = JSON.parseNoPrototype(data);
				this.events.emit('load');
			} catch (err) {
				if (loadErrorLogFn) {
					loadErrorLogFn(err, "JSON data from " + this.file + " is invalid!");
				} else {
					console.error(err);
					console.error("JSON data from " + this.file + " is invalid!");
				}
			}

			if (typeof this.data !== "object" || !this.data || Array.isArray(this.data)) {
				if (loadErrorLogFn) {
					loadErrorLogFn(null, "JSON data from " + this.file + " is invalid!");
				} else {
					console.error("JSON data from " + this.file + " is invalid!");
				}

				this.data = Object.create(null);
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
			} catch (e) { }
			this.events.emit('destroy');
		}
	}
}

module.exports = JSONDataBase;
