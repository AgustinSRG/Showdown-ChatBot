/**
 * Data Access Manager for raw files stored
 * in the configuration path
 */

'use strict';

const Path = require('path');
const checkDir = Tools('checkdir');
const DataBase = Tools('json-db');
const CryptoDataBase = Tools('crypto-json');
const FileSystem = require('fs');

class DataAccessManager {
	constructor(options) {
		this.path = options.path || Path.resolve(__dirname, '../../config/');
	}

	init(callback) {
		try {
			checkDir(this.path);
			return callback();
		} catch (err) {
			return callback(err);
		}
	}

	getFileContent(filename) {
		return FileSystem.readFileSync(Path.resolve(this.path, filename)).toString();
	}

	setFileContent(filename, content) {
		FileSystem.writeFileSync(Path.resolve(this.path, filename), content);
	}

	getDataBase(filename, options) {
		if (options && options.crypto) {
			return new CryptoDataBase(Path.resolve(this.path, filename), options.key);
		} else {
			return new DataBase(Path.resolve(this.path, filename));
		}
	}

	checkSubpath(subpath) {
		checkDir(Path.resolve(this.path, subpath));
	}

	getFiles(subpath) {
		let files = FileSystem.readdirSync(Path.resolve(this.path, subpath));
		for (let i = 0; i < files.length; i++) {
			files[i] = subpath + "/" + files[i];
		}
		return files;
	}

	removeFile(filename) {
		FileSystem.unlinkSync(Path.resolve(this.path, filename));
	}
}

module.exports = DataAccessManager;
