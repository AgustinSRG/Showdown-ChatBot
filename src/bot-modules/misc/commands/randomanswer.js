/**
 * Commands File
 *
 * randomanswer: gets a random answer (command from BoTTT)
 */

'use strict';

const Path = require('path');
const Translator = Tools('translate');

const translator = new Translator(Path.resolve(__dirname, 'randomanswer.translations'));

module.exports = {
	"8ball": "randomanswer",
	helix: "randomanswer",
	randomanswer: function () {
		let m = parseInt(translator.get('num', this.lang));
		this.restrictReply(translator.get(Math.floor(Math.random() * m), this.lang), 'randomanswer');
	},
};
