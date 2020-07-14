/**
 * Html maker
 * For bot control pages
 */

'use strict';

const Util = require('util');

/**
 * Generates a dynamic webpage for Showdown ChatBot
 * @param {String} body
 * @param {Object} loginData - Options: name {String}, group {String}, invalid {Boolean}
 * @param {Array<Object>} menu - Menu Option: url {String}, name {String}, selected {Boolean}
 * @param {Object} options - Options: styles {Array<String>}, scripts {Array<String>}, title {String}
 * @returns {String} html source of the webpage
 */
exports.generate = function (body, loginData, menu, options) {
	let buf = '';
	if (!loginData) loginData = {};
	if (!options) options = {};

	buf += '<html>';
	buf += '<head>';
	buf += '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />';

	buf += '<link rel="stylesheet" href="/static/style.css" />';
	if (options.styles) {
		for (let i = 0; i < options.styles.length; i++) {
			buf += Util.format("<link rel=\"stylesheet\" href=\"%s\" />", options.styles[i]);
		}
	}

	buf += '<script type="text/javascript" src="/static/csrf-protect.js"></script>';

	if (options.scripts) {
		for (let i = 0; i < options.scripts.length; i++) {
			buf += Util.format("<script type=\"text/javascript\" src=\"%s\"></script>", options.scripts[i]);
		}
	}

	if (options.title) {
		buf += '<title>' + options.title + '</title>';
	} else {
		buf += '<title>Pokemon Showdown ChatBot</title>';
	}

	buf += '</head>';
	buf += '<body><div align="center">';

	buf += '<div align="center" class="maindiv">';

	buf += '<br /><div class="header">';
	buf += '<table width="100%" border="0"><tr>';
	buf += '<td width="60%"><a class="home-link" href="/"><div class="banner" align="center"><h1>' +
		(options.banner || 'Showdown ChatBot') + '</h1></div></a></td>';

	buf += '<td width="30%"><div align="right">';
	if (loginData.name) {
		/* Logout form */
		buf += '<div style=" margin-bottom:8px;"><strong><big>' +
			loginData.name + '</big></strong></div>';
		if (loginData.group) {
			buf += '<div style=" margin-bottom:8px;"><strong><i>(' +
				loginData.group + ')</i></strong></div>';
		}
		buf += '<div style=" margin-bottom:8px;"><a href="/chpass/"><i>Change Password</i></a></div>';
		buf += '<div style=" margin-bottom:8px;">' +
			'<form class="logoutform" method="POST" action="/">' +
			'<input type="submit" name="logout" value="Logout" /></form></div>';
	} else {
		/* Login form */
		buf += '<form class="loginform" method="POST" action="">' +
			'<div style=" margin-bottom:5px;"><strong>User:</strong>&nbsp;' +
			'<input type="text" name="user" value="' + (loginData.invalid || '') + '" /></div>' +
			'<div style=" margin-bottom:5px;"><strong>Pass:</strong>&nbsp;' +
			'<input type="password" name="password" /></div>' +
			'<div>' + (loginData.invalid ? '<span class="invalid-login">Invalid Credentials</span>&nbsp;' : '') +
			'<input type="submit" name="login" value="Login" />' +
			'</div></form>';
	}
	buf += '</div></td>';

	buf += '</tr></table>';
	buf += '</div>';
	buf += '</div>';

	if (menu) {
		buf += '<div align="center" class="maindiv">';
		buf += '<div class="menu">';
		let levels = [];
		for (let j = 0; j < menu.length; j++) {
			let menuOpts = menu[j].menu;
			let auxMenu = [];
			for (let k = 0; k < menuOpts.length; k++) {
				if (menuOpts[k].selected) {
					auxMenu.push('<a class="menu-option-selected" href="' + menuOpts[k].url + '">' + menuOpts[k].name + '</a>');
				} else {
					auxMenu.push('<a class="menu-option" href="' + menuOpts[k].url + '">' + menuOpts[k].name + '</a>');
				}
			}
			levels.push(auxMenu.join('<span class="menu-separator">&nbsp;| </span>'));
		}
		buf += levels.join('<hr />');
		buf += '</div>';
		buf += '</div>';
	}

	buf += '<div align="center" class="maindiv">';
	buf += '<div align="left" class="page-content">';
	buf += body;
	buf += '</div></div>';

	if (options.package) {
		buf += '<div align="center" class="maindiv">';
		buf += '<div align="center" class="copyright">';
		buf += '<i>This is a Pokemon Showdown Bot for Node JS - ';
		buf += '<a href="' + options.package.homepage + '" target="_blank">Showdown-ChatBot' + '</a> v' + options.package.version;
		buf += '</i></div></div>';
	}
	buf += '</div></body>';
	buf += '</html>';
	return buf;
};
