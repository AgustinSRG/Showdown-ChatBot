/**
 * Html maker
 * For bot control pages
 */

'use strict';

const Util = require('util');

/**
 * Wraps HTML
 * @param {String} body The HTML body
 * @param {String} title The HTML title (must be escaped)
 * @returns The final HTML
 */
exports.wrapHTML = function (body, title) {
        let html = "<!DOCTYPE html><html>";

        html += "<head>";

        html += "<html>";

        if (title) {
                html += '<title>' + title + '</title>';
        }

        html += '<link rel="stylesheet" href="/static/style.css" />';

        html += "</head>";

        html += "<body>" + body + "</body>";

        html += "</html>";
        return html;
};

/**
 * Generates a dynamic webpage for Showdown ChatBot
 * @param {String} body
 * @param {Object} loginData - Options: name {String}, group {String}, invalid {Boolean}
 * @param {Array<Object>} menu - Menu Option: url {String}, name {String}, selected {Boolean}
 * @param {Object} options - Options: styles {Array<String>}, scripts {Array<String>}, title {String}
 * @returns {String} html source of the webpage
 */
exports.generate = function (body, loginData, menu, options) {
        let buf = '<!DOCTYPE html>';
        if (!loginData) loginData = Object.create(null);
        if (!options) options = Object.create(null);

        buf += '<html lang="en">';
        buf += '<head>';
        buf += '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />';

        buf += '<link rel="stylesheet" href="/static/style.css" />';
        if (options.styles) {
                for (let i = 0; i < options.styles.length; i++) {
                        buf += Util.format("<link rel=\"stylesheet\" href=\"%s\" />", options.styles[i]);
                }
        }

        buf += '<script type="text/javascript" src="/static/common.js"></script>';

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

        if (options.theme === "l") {
                buf += '<body class="light">';
        } else if (options.theme === "d") {
                buf += '<body class="dark">';
        } else {
                buf += '<body>';
        }

        buf += '<div align="center">';

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
                        '<input type="text" name="user" id="login-username" value="' + (loginData.invalid || '') + '" /></div>' +
                        '<div style=" margin-bottom:5px;"><strong>Pass:</strong>&nbsp;' +
                        '<div style="position:relative; display:inline-block;">' +
                        '<input type="password" name="password" id="login-password" style="width:auto;" />' +
                        '<span id="toggle-password" style="position:absolute; right:5px; top:2px; cursor:pointer;" onclick="togglePasswordVisibility()">' +
                        '<span id="eye-icon-hidden">' +
                        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>' +
                        '</span>' +
                        '<span id="eye-icon-visible" style="display:none;">' +
                        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' +
                        '</span>' +
                        '</span>' +
                        '</div></div>' +
                        '<div>' + (loginData.invalid ? '<span class="invalid-login">Invalid Credentials</span>&nbsp;' : '') +
                        '<input type="submit" name="login" value="Login" />' +
                        '</div>' +
                        '<div style="margin-top:5px;"><button type="button" onclick="quickLogin()">Quick Login</button></div>' +
                        '<script>' +
                        'function quickLogin() {' +
                        '  document.getElementById("login-username").value = "admin";' +
                        '  document.getElementById("login-password").value = "admin";' +
                        '  var form = document.querySelector(".loginform");' +
                        '  form.action = "/?quick=1";' +
                        '  form.submit();' +
                        '}' +
                        'function togglePasswordVisibility() {' +
                        '  var passwordInput = document.getElementById("login-password");' +
                        '  var hiddenIcon = document.getElementById("eye-icon-hidden");' +
                        '  var visibleIcon = document.getElementById("eye-icon-visible");' +
                        '  if (passwordInput.type === "password") {' +
                        '    passwordInput.type = "text";' +
                        '    hiddenIcon.style.display = "none";' +
                        '    visibleIcon.style.display = "block";' +
                        '  } else {' +
                        '    passwordInput.type = "password";' +
                        '    hiddenIcon.style.display = "block";' +
                        '    visibleIcon.style.display = "none";' +
                        '  }' +
                        '}' +
                        '</script>' +
                        '</form>';
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
                buf += '</i>';
                buf += ' - Theme: <select class="theme-select" value="">';
                buf += '<option value="">Device</option>';
                buf += '<option value="d">Dark</option>';
                buf += '<option value="l">Light</option>';
                buf += '</select>';
                buf += '</div></div>';
        }
        buf += '</div></body>';
        buf += '</html>';
        return buf;
};
