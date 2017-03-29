/**
 * Data Access Manager for MYSQL databases
 * simulates a basic file system using a database
 */

'use strict';

const Table_Name = "SHOWDOWN_CHATBOT_CONFIG";
const Table_Create_Sentence = "CREATE TABLE " + Table_Name + " (file varchar(64), id int, block int, data varchar(1024));";

try {
	require('mysql');
} catch (err) {
	console.log('Installing dependencies... (mysql)');
	require('child_process').spawnSync('sh', ['-c', 'npm install mysql'], {stdio: 'inherit'});
}

const MYSQL = require('mysql');
const Path = require('path');
const DataBase = require(Path.resolve(__dirname, 'mysql-json-db.js'));
const CryptoDataBase = require(Path.resolve(__dirname, 'mysql-json-db-crypto.js'));

function splitDataInRows(file, id, data) {
	let rows = [];
	while (data.length > 1024) {
		rows.push({file: file, id: id, block: rows.length, data: data.substr(0, 1024)});
		data = data.substr(1024);
	}
	if (data.length > 0 || rows.length > 0) {
		rows.push({file: file, id: id, block: rows.length, data: data});
	}
	return rows;
}

class DataAccessManager {
	constructor(options) {
		this.type = "MYSQL";
		this.pool = MYSQL.createPool(options.MYSQL);
		this.data = [];
		this.running = {};
		this.waiting = {};
	}

	init(callback) {
		this.pool.query('SELECT * FROM ' + Table_Name + ';', function (error, results, fields) {
			if (error) {
				this.data = [];
				if (error.code === 'ER_NO_SUCH_TABLE') {
					this.pool.query(Table_Create_Sentence, function (error) {
						if (error) {
							return callback(error);
						} else {
							return callback();
						}
					});
				} else {
					return callback(error);
				}
			} else {
				this.data = results;
				return callback();
			}
		}.bind(this));
	}

	getFileContent(filename, locked_id) {
		let files = {};
		for (let row of this.data) {
			if (row.file === filename) {
				if (!files[row.id]) {
					files[row.id] = [];
				}
				files[row.id].push(row);
			}
		}
		let file = null;
		for (let id in files) {
			if (file === null || file.id < id) {
				file = files[id];
			}
		}
		if (locked_id && file !== null) {
			let locked_file = file;
			file = null;
			for (let id in files) {
				if (id !== locked_file.id && (file === null || file.id < id)) {
					file = files[id];
				}
			}
		}
		if (!file) {
			throw new Error("The file with name \"" + filename + "\" does not exists");
		} else {
			let data = '';
			file = file.sort((a, b) => {
				if (a.block < b.block) {
					return -1;
				} else {
					return 1;
				}
			});
			for (let row of file) {
				data += row.data;
			}
			return data;
		}
	}

	setFileContent(filename, content) {
		let lastId = -1;
		for (let row of this.data) {
			if (row.file === filename && row.id > lastId) {
				lastId = row.id;
			}
		}
		let id = lastId + 1;
		let rows = splitDataInRows(filename, id, content);
		this.data = this.data.concat(rows).filter(row => {
			if (row.file === filename && row.id !== id) {
				return false;
			} else {
				return true;
			}
		});
		/* Sync */
		if (this.running[filename]) {
			this.waiting[filename] = new UpdateSyncManager(this, filename, id, rows);
		} else {
			this.running[filename] = new UpdateSyncManager(this, filename, id, rows);
			this.running[filename].run();
		}
	}

	removeFile(filename) {
		this.data = this.data.filter(row => {
			if (row.file === filename) {
				return false;
			} else {
				return true;
			}
		});
		/* Sync */
		if (this.running[filename]) {
			this.waiting[filename] = new DeleteSyncManager(this, filename);
		} else {
			this.running[filename] = new DeleteSyncManager(this, filename);
			this.running[filename].run();
		}
	}

	checkSubpath(subpath) {
		return;
	}

	getFiles(subpath) {
		let files = {};
		for (let row of this.data) {
			if (row.file.indexOf(subpath + '/') === 0) {
				files[row.file] = true;
			}
		}
		return Object.keys(files);
	}

	getDataBase(filename, options) {
		if (options && options.crypto) {
			return new CryptoDataBase(this, filename, options.key);
		} else {
			return new DataBase(this, filename);
		}
	}
}

class UpdateSyncManager {
	constructor(dam, file, id, rows) {
		this.dam = dam;
		this.pool = this.dam.pool;
		this.file = file;
		this.id = id;
		this.rows = rows;
		this.curr = -1;
	}

	run() {
		this.curr = -1;
		this.next();
	}

	next() {
		this.curr++;
		let row = this.rows[this.curr];
		if (row) {
			this.pool.query("INSERT INTO " + Table_Name + " VALUES (?, ?, ?, ?);", [row.file, row.id, row.block, row.data], function (error) {
				if (error) {
					delete this.dam.running[this.file];
					delete this.dam.waiting[this.file];
					throw error;
				}
				this.next();
			}.bind(this));
		} else {
			this.finalize();
		}
	}

	finalize() {
		this.pool.query("DELETE FROM " + Table_Name + " WHERE file = ? AND id < ?", [this.file, this.id], function (error) {
			delete this.dam.running[this.file];
			if (this.dam.waiting[this.file]) {
				this.dam.running[this.file] = this.dam.waiting[this.file];
				delete this.dam.waiting[this.file];
				this.dam.running[this.file].run();
			}
			if (error) throw error;
		}.bind(this));
	}
}
class DeleteSyncManager {
	constructor(dam, file) {
		this.dam = dam;
		this.pool = this.dam.pool;
		this.file = file;
	}

	run() {
		this.pool.query("DELETE FROM " + Table_Name + " WHERE file = ?", [this.file], function (error) {
			delete this.dam.running[this.file];
			if (this.dam.waiting[this.file]) {
				this.dam.running[this.file] = this.dam.waiting[this.file];
				delete this.dam.waiting[this.file];
				this.dam.running[this.file].run();
			}
			if (error) throw error;
		}.bind(this));
	}
}

module.exports = DataAccessManager;
