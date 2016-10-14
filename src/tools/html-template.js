/**
 * Generates simple HTML templates
 */

'use strict';

const FileSystem = require('fs');

/**
 * Represents an html template
 */
class HTMLTemplate {
	/**
	 * @param {Path} file
	 */
	constructor(file) {
		this.file = file;
		this.html = FileSystem.readFileSync(file).toString().replace(/[\n\t]/g, '');
	}

	/**
	 * Creates html using this template
	 * @param {Object} vars
	 * @retuns {String}
	 */
	 make(vars) {
		return this.html.replace(/\$\{[a-z0-9_]+\}/gi, key => {
			return ('' + vars[(key.toLowerCase().replace(/[^a-z0-9_]/g, ''))]);
		});
	 }

	 /**
	  * Returns the html file content
	  * @returns {String}
	  */
	  get() {
		  return this.html;
	  }
}

module.exports = HTMLTemplate;
