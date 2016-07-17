/**
 * Html maker
 * For bot control pages
 */

'use strict';

const Util = require('util');

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
		(App.config.apptitle || 'Showdown ChatBot') + '</h1></div></a></td>';

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
			'<form class="logoutform" method="POST" action="">' +
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
		for (let j = 0; j < menu.length; j++) {
			if (menu[j].selected) {
				buf += '<a class="menu-option-selected" href="' + menu[j].url + '">';
			} else {
				buf += '<a class="menu-option" href="' + menu[j].url + '">';
			}
			buf += menu[j].name;
			buf += '</a>';
			if (j < menu.length - 1) {
				buf += '<span class="menu-separator"> | </span>';
			}
		}
		buf += '</div>';
		buf += '</div>';
	}

	buf += '<div align="center" class="maindiv">';
	buf += '<div align="left" class="page-content">';
	buf += body;
	buf += '</div></div>';

	buf += '<div align="center" class="maindiv">';
	buf += '<div align="center" class="copyright">';
	buf += '<i>This is a Pokemon Showdown Bot for Node JS - ';
	if (Package.homepage) {
		buf += '<a href="' + Package.homepage + '" target="_blank">Showdown-ChatBot' + '</a> v' + Package.version;
	} else {
		buf += 'Showdown-ChatBot v' + Package.version;
	}
	buf += '</i>';
	buf += '</div>';
	buf += '</div></div></body>';
	buf += '</html>';
	return buf;
};
