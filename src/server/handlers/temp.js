/**
 * Server Handler: Temp
 */

'use strict';

const Path = require('path');

App.server.setHandler('temp', (context, parts) => {
	if (parts.length && parts[0]) {
		let file = Path.resolve(__dirname, '../../../data/temp/', parts.shift().split('?')[0] + '.tmp');
		context.endWithStaticFile(file);
	} else {
		context.endWithError('403', 'Forbidden', 'You have not permission to access this path!');
	}
});
