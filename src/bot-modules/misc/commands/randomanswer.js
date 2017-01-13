/**
 * Commands File
 *
 * randomanswer: gets a random answer (command from BoTTT)
 */

'use strict';

const Path = require('path');

const Lang_File = Path.resolve(__dirname, 'randomanswer.translations');

module.exports = {
	"8ball": "randomanswer",
	helix: "randomanswer",
	randomanswer: function () {
		this.setLangFile(Lang_File);
		let m = parseInt(this.mlt('num'));
		this.restrictReply(this.mlt(Math.floor(Math.random() * m)), 'randomanswer');
	},
};
