/**
 * Server Handler: Static
 * Main static path for Showdown-ChatBot
 */

'use strict';

const Path = require('path');

exports.setup = function (App) {
	App.server.setHandler('static', (context, parts) => {
		if (parts.length && parts[0]) {
			let file = Path.resolve(__dirname, '../../../static/', parts.shift().split('?')[0]);
			context.endWithStaticFile(file);
		} else {
			context.endWithError('403', 'Forbidden', 'You have not permission to access this path!');
		}
	});
};
