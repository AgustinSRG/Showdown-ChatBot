/**
 * Logger System
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');
const Util = require('util');

/**
 * Gets the month name
 * @param {Number} n - Month number (1 - 12)
 * @returns {String} Month name
 */
function getMonthString(n) {
	let table = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
		'August', 'September', 'October', 'November', 'December'];
	return table[parseInt(n) - 1];
}

/**
 * Adds "0" at left to complete a string
 * @param {Number} num
 * @param {Number} nz - Number of zeros
 * @returns {String}
 */
function addLeftZero(num, nz) {
	let str = num.toString();
	while (str.length < nz) str = "0" + str;
	return str;
}

/**
 * Gets the difference between two dates
 * @param {Object} date1 - Date(day, month, year)
 * @param {Object} date2 - Date(day, month, year)
 * @returns {Number} days
 */
function dateDifference(date1, date2) {
	if (!date1 || !date1.day || !date1.month || !date1.year) return 0;
	if (!date2 || !date2.day || !date2.month || !date2.year) return 0;
	let dif = 0;
	dif += 365 * (date1.year - date2.year);
	let days = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	let daysA = 0, daysB = 0;
	for (let i = 1; i < date1.month; i++) daysA += days[i];
	daysA += date1.day;
	for (let i = 1; i < date2.month; i++) daysB += days[i];
	daysB += date2.day;
	dif += (daysA - daysB);
	dif = Math.abs(dif);
	return dif;
}

/**
 * Represents a logger
 */
class Logger {
	/**
	 * @param {Path} path
	 * @param {String} id
	 * @param {Number} maxOld - In days
	 */
	constructor(path, id, maxOld) {
		this.id = id || "log";
		this.path = path;
		this.stream = null;
		this.file = null;
		this.maxOld = maxOld || 0;
	}

	/**
	 * @returns {String} Current log filename
	 */
	getFile() {
		let date = new Date();
		return Util.format("%s_%s_%s_%s.log",
			this.id, addLeftZero(date.getFullYear(), 4),
			addLeftZero(date.getMonth() + 1, 2), addLeftZero(date.getDate(), 2));
	}

	/**
	 * @returns {String} Current time prefix
	 */
	getTime() {
		let date = new Date();
		return Util.format("[%s:%s:%s]",
			addLeftZero(date.getHours(), 2), addLeftZero(date.getMinutes(), 2), addLeftZero(date.getSeconds(), 2));
	}

	/**
	 * @param {String} str
	 */
	write(str) {
		let file = this.getFile();
		if (file !== this.file) {
			if (this.stream) {
				this.stream.close();
				this.stream = null;
			}
			this.stream = FileSystem.createWriteStream(Path.resolve(this.path, "./" + file), {flags: 'a+'});
			this.file = file;
			setImmediate(this.sweep.bind(this)); /* Remove old logs */
		}
		this.stream.write(str + "\n");
	}

	/**
	 * @param {String} str
	 */
	log(str) {
		this.write(this.getTime() + " " + str);
	}

	sweep() {
		if (this.maxOld < 1) return;
		let dir = FileSystem.readdirSync(this.path);
		let date = new Date();
		date = {
			day: date.getDate(),
			month: date.getMonth() + 1,
			year: date.getFullYear(),
		};
		for (let i = 0; i < dir.length; i++) {
			if (/^[a-zA-Z0-9]*_[0-9][0-9][0-9][0-9]_[0-9][0-9]_[0-9][0-9]\.log$/.test(dir[i])) {
				let splited = dir[i].split('.')[0].split("_");
				let logDate = {
					day: parseInt(splited[3]),
					month: parseInt(splited[2]),
					year: parseInt(splited[1]),
				};
				if (dateDifference(logDate, date) > this.maxOld) {
					try {
						FileSystem.unlinkSync(Path.resolve(this.path, "./" + dir[i]));
					} catch (e) {}
				}
			}
		}
	}

	/**
	 * @returns {Array<Object>} Log files list
	 */
	getFilesList() {
		let list = [];
		let dir = FileSystem.readdirSync(this.path);
		for (let i = 0; i < dir.length; i++) {
			if (/^[a-zA-Z0-9]*_[0-9][0-9][0-9][0-9]_[0-9][0-9]_[0-9][0-9]\.log$/.test(dir[i])) {
				let file = {};
				file.file = dir[i];
				let splitFile = dir[i].split('.')[0].split("_");
				file.date = getMonthString(splitFile[2]) + " " + splitFile[3] + ", " + splitFile[1];
				let stats = FileSystem.statSync(Path.resolve(this.path, dir[i]));
				file.size = Math.floor((stats.size / 1024) * 100) / 100; // In KB
				list.push(file);
			}
		}
		return list.sort(function (a, b) {
			if (a.file < b.file) {
				return -1;
			} else if (a.file > b.file) {
				return 1;
			} else {
				return 0;
			}
		}).reverse();
	}

	destroy() {
		if (this.stream) {
			this.stream.close();
			this.stream = null;
		}
	}
}

module.exports = Logger;
