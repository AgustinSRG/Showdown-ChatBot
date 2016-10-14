/**
 * Creates a sub-menu for
 * Showdown-ChatBot control panel
 */

'use strict';

/**
 * Represents an html sub-menu
 */
class SubMenu {
	/**
	 * @param {String} title
	 * @param {Array<String>} parts
	 * @param {RequestContext} context
	 * @param {Array<Object>} options
	 * @param {String} defaultOption
	 */
	constructor(title, parts, context, options, defaultOption) {
		this.title = title;
		this.parts = parts;
		this.context = context;
		this.options = options;
		this.defaultOption = defaultOption;
	}

	run() {
		let html = '';
		let opt = '';
		let handler = null;
		if (this.parts[0]) {
			opt = this.parts.shift();
		}
		if (opt === '') {
			opt = this.defaultOption;
		}
		html += '<div align="center"><h2>' + this.title + '</h2>';
		let submenu = [];
		for (let option of this.options) {
			submenu.push('<a class="submenu-option' + (option.id === opt ? '-selected' : '') +
				'" href="' + option.url + '">' + option.title + '</a>');
			if (option.id === opt && !handler) {
				handler = option.handler;
			}
		}
		html += submenu.join('&nbsp;| ');
		html += '</div><hr />';

		if (handler) {
			handler(this.context, html, this.parts);
		} else {
			this.context.endWith404();
		}
	}
}

module.exports = SubMenu;
