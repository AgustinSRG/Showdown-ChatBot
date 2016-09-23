/**
 * Line Splutter
 * Slits a message in multiple lines in order to be
 * sent to Pokemon Showdown
 */

'use strict';

const Default_Line_length = 300;

/**
 * Represents a multi-line message
 */
class LineSplitter {
	/**
	 * @param {Number} lineLength
	 */
	constructor(lineLength) {
		this.lineLength = lineLength || Default_Line_length;
		this.txt = "";
		this.lines = [];
	}

	/**
	 * @param {String} str
	 */
	add(str) {
		while (str.length > this.lineLength) {
			let toAdd = str.substr(0, this.lineLength);
			str = str.substr(this.lineLength);
			this.add(toAdd);
		}
		if ((str.length + this.txt.length) > this.lineLength) {
			this.lines.push(this.txt);
			this.txt = "";
		}
		this.txt += str;
	}

	/**
	 * @returns {String}
	 */
	getLines() {
		if (this.txt.length > 0) {
			this.lines.push(this.txt);
			this.txt = "";
		}
		return this.lines.slice();
	}
}

module.exports = LineSplitter;
