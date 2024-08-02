/**
 * Get-Server Tool
 */

'use strict';

const Url = require('url');
const Http = require('https');

/**
 * Gets the server, port and serverid of a pokemon showdown client
 * @param {String} url
 * @param {function(String, Number, String)} callback - Server, Port and ServerID
 */
exports.getShowdownServer = function (url, callback) {
	if (url.indexOf('://') !== -1) {
		url = Url.parse(url).host;
	}
	if (url.slice(-1) === '/') {
		url = url.slice(0, -1);
	}
	if (url === "play.pokemonshowdown.com") {
		return callback(null, {
			host: 'sim3.psim.us',
			port: 443,
			id: 'showdown',
			https: true,
		});
	}
	let requestOptions = {
		hostname: 'play.pokemonshowdown.com',
		port: 443,
		path: '/crossdomain.php?host=' + url + '&path=&protocol=https:',
		method: 'GET',
	};
	let request = Http.request(requestOptions, response => {
		response.setEncoding('utf8');
		let str = '';
		response.on('data', chunk => {
			str += chunk;
		});
		response.on('end', () => {
			let search = 'var config = ';
			let index = str.indexOf(search);
			if (index !== -1) {
				let data = str.substr(index);
				data = data.substr(search.length, data.indexOf(';') - search.length);
				while (typeof data === "string") {
					try {
						data = JSON.parseNoPrototype(data);
					} catch (err) {
						return callback(err);
					}
				}
				return callback(null, data);
			} else {
				return callback(new Error("failed to get data"));
			}
		});
		response.on('error', err => {
			callback(err);
		});
	});
	request.on('error', err => {
		callback(err);
	});
	request.end();
};
