/**
 * UncacheTree function for hotpatching
 */

'use strict';

/**
 * Uncaches a module and its dependencies
 * @param {Path} root
 */
module.exports = function (root) {
	let uncache = [require.resolve(root)];
	do {
		let newuncache = [];
		for (let i = 0; i < uncache.length; ++i) {
			if (require.cache[uncache[i]]) {
				newuncache.push.apply(newuncache,
					require.cache[uncache[i]].children.map(module => {
						return module.filename;
					})
				);
				delete require.cache[uncache[i]];
			}
		}
		uncache = newuncache;
	} while (uncache.length > 0);
};
