/**
 * Server Handler: Static
 * Main static path for Showdown-ChatBot
 */

'use strict';

const Path = require('path');

exports.setup = function (App) {
	const staticDir = Path.resolve(__dirname, '../../../static/');
	App.server.setHandler('static', (context, parts) => {
		if (parts.length && parts[0]) {
			let file = Path.resolve(staticDir, parts.shift().split('?')[0]);
			if (!file.startsWith(staticDir)) {
				return context.endWithError('403', 'Forbidden', 'You have not permission to access this path!');
			}
			context.endWithStaticFile(file, 31536000);
		} else {
			context.endWithError('403', 'Forbidden', 'You have not permission to access this path!');
		}
	});
};
