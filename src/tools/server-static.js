/**
 * Tool for serving static files
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');

/**
 * Generates standard html error pages
 * @param {Number} errcode
 * @param {String} title - Error Name
 * @param {String} msg - Error description
 * @returns {String} html
 */
function getErrHtml(errcode, title, msg) {
	let html = "";
	html += '<!DOCTYPE html>';
	html += '<head>';
	html += '<title>' + title + '</title>';
	html += '</head>';
	html += '<body>';
	html += '<h1>Error ' + errcode + '</h1>';
	html += '<p>' + msg + '</p>';
	html += '</body></html>';
	return html;
}

/**
 * Serves a static file
 * @param {Path} file
 * @param {ClientRequest} request
 * @param {ServerResponse} response
 */
exports.serveFile = function (file, request, response) {
	let ext = Path.extname(file);
	let contentType = 'text/html; charset=utf-8';
	let binary = false;
	switch (ext) {
	case '.txt':
	case '.log':
		contentType = 'text/plain; charset=utf-8';
		break;
	case '.js':
		contentType = 'text/javascript; charset=utf-8';
		break;
	case '.css':
		contentType = 'text/css; charset=utf-8';
		break;
	case '.json':
		contentType = 'application/json; charset=utf-8';
		break;
	case '.png':
		contentType = 'image/png';
		binary = true;
		break;
	case '.jpg':
		contentType = 'image/jpg';
		binary = true;
		break;
	case '.ico':
		contentType = 'image/ico';
		binary = true;
		break;
	case '.wav':
		contentType = 'audio/wav';
		binary = true;
		break;
	}

	FileSystem.readFile(file, (error, content) => {
		if (error) {
			if (error.code === 'ENOENT') {
				response.writeHead(404, {'Content-Type': 'text/html; charset=utf-8'});
				response.write(getErrHtml(404, 'File not found', 'The file you requested was not found!'));
				response.end();
			} else {
				response.writeHead(500, {'Content-Type': 'text/html; charset=utf-8'});
				response.write(getErrHtml(500, 'Internal server error', 'Internal server error. Error Code: ' + error.code));
				response.end();
			}
		} else {
			response.writeHead(200, {'Content-Type': contentType});
			response.end(content, binary ? 'binary' : 'utf-8');
		}
	});
};
