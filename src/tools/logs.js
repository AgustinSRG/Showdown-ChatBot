/**
 * Logger System
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');
const Util = require('util');

function getMonthString(n) {
	let table = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
		'August', 'September', 'October', 'November', 'December'];
	return table[parseInt(n) - 1];
}

function addLeftZero(num, nz) {
	let str = num.toString();
	while (str.length < nz) str = "0" + str;
	return str;
}

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

class Logger {
	constructor(path, id, maxOld) {
		this.id = id || "log";
		this.path = path;
		this.stream = null;
		this.file = null;
		this.maxOld = maxOld || 0;
	}

	getFile() {
		let date = new Date();
		return Util.format("%s_%s_%s_%s.log",
			this.id, addLeftZero(date.getFullYear(), 4),
			addLeftZero(date.getMonth() + 1, 2), addLeftZero(date.getDate(), 2));
	}

	getTime() {
		let date = new Date();
		return Util.format("[%s:%s:%s]",
			addLeftZero(date.getHours(), 2), addLeftZero(date.getMinutes(), 2), addLeftZero(date.getSeconds(), 2));
	}

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
		return list;
	}

	destroy() {
		if (this.stream) {
			this.stream.close();
			this.stream = null;
		}
	}
}

module.exports = Logger;
