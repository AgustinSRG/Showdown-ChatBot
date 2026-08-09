/**
 * Server Handler: Temp
 * Temporal files system
 */

'use strict';

const Path = require('path');

exports.setup = function (App) {
	const tempDir = Path.resolve(App.dataDir, 'temp');
	App.server.setHandler('temp', (context, parts) => {
		if (parts.length && parts[0]) {
			let file = Path.resolve(tempDir, parts.shift().split('?')[0] + '.tmp');
			if (!file.startsWith(tempDir)) {
				return context.endWithError('403', 'Forbidden', 'You have not permission to access this path!');
			}
			context.endWithStaticFile(file, 600);
		} else {
			context.endWithError('403', 'Forbidden', 'You have not permission to access this path!');
		}
	});
};
