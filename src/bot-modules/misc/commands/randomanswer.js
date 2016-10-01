/**
 * Commands File
 */

'use strict';

const Path = require('path');
const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'randomanswer.translations'));

module.exports = {
	"8ball": "randomanswer",
	helix: "randomanswer",
	randomanswer: function () {
		let m = parseInt(translator.get('num', this.lang));
		this.restrictReply(translator.get(Math.floor(Math.random() * m), this.lang), 'randomanswer');
	},
};
