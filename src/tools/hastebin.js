/**
 * Hastebin requests manager
 */

'use strict';

const Util = require('util');
const Https = require('https');

const Hastebin_Request_Options = {hostname: "hastebin.com", method: "POST", path: '/documents'};

/**
 * Uploads a document to hastebin
 * @param {String} data
 * @param {function(String, Error)} callback - function (link, error)
 */
exports.upload = function (data, callback) {
	if (typeof callback !== "function") throw new Error("callback must be a function");
	let request = Https.request(Hastebin_Request_Options, response => {
		response.on('data', chunk => {
			try {
				let key = JSON.parse(chunk.toString())['key'];
				return callback(Util.format('https://hastebin.com/%s', key));
			} catch (err) {
				return callback(null, err);
			}
		});
		response.on('error', err => {
			return callback(null, err);
		});
	});
	request.on('error', err => {
		return callback(null, err);
	});
	request.write(data);
	request.end();
};

/**
 * Downloads a document from hastebin
 * @param {String} key
 * @param {function(String, Error)} callback - function (data, error)
 */
exports.download = function (key, callback) {
	if (typeof callback !== "function") throw new Error("callback must be a function");
	let url = Util.format('https://hastebin.com/raw/%s', key);
	Https.get(url, response => {
		let data = '';
		response.on('data', chunk => {
			data += chunk;
		});
		response.on('end', () => {
			callback(data);
		});
		response.on('error', err => {
			callback(null, err);
		});
	}).on('error', err => {
		callback(null, err);
	});
};
