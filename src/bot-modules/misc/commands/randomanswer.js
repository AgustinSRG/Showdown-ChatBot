/**
 * Commands File
 */

'use strict';

const Path = require('path');

const Translator = Tools.get('translate.js');

const translator = new Translator(Path.resolve(__dirname, 'randomanswer.translations'));

App.parser.addPermission('randomanswer', {group: 'voice'});

module.exports = {
	"8ball": "randomanswer",
	helix: "randomanswer",
	randomanswer: function () {
		let m = translator.get('num', this.lang);
		this.restrictReply(translator.get(Math.floor(Math.random() * m), this.lang), 'randomanswer');
	},
};
