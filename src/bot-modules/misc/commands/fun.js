/**
 * Commands File
 */

'use strict';

const Path = require('path');
const Crypto = require('crypto');

const Translator = Tools.get('translate.js');
const Text = Tools.get('text.js');
const Chat = Tools.get('chat.js');

const translator = new Translator(Path.resolve(__dirname, 'fun.translations'));

module.exports = {
	choose: "pick",
	pick: function () {
		let opts = [];
		for (let i = 0; i < this.args.length; i++) {
			let opt = this.args[i].trim();
			if (opt) {
				opts.push(opt);
			}
		}
		if (opts.length < 2) return this.errorReply(this.usage({desc: 'opt1'}, {desc: 'opt2'}, {desc: '...', optional: true}));
		this.restrictReply(Chat.bold(translator.get('pick', this.lang) + ':') + ' ' + opts[Math.floor(Math.random() * opts.length)], 'random');
	},

	rpoke: 'poke',
	poke: function (App) {
		let pokedex;
		try {
			pokedex = App.data.getPokedex();
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(translator.get('error', this.lang));
		}
		let pokes = Object.keys(pokedex);
		let chosen = pokedex[pokes[Math.floor(Math.random() * pokes.length)]].species;
		let roomData = App.bot.rooms[this.room];
		let botid = Text.toId(App.bot.getBotNick());
		if (this.can('randpoke') && roomData && roomData.users[botid] && this.parser.equalOrHigherGroup({group: roomData.users[botid]}, 'driver')) {
			this.send('!dt ' + chosen, this.room);
		} else {
			this.pmReply(Text.stripCommands(chosen));
		}
	},

	hpoke: "hashpoke",
	hashpoke: function (App) {
		let pokedex;
		try {
			pokedex = App.data.getPokedex();
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(translator.get('error', this.lang));
		}
		let pokes = Object.keys(pokedex);
		let h = Text.toId(this.arg) || this.byIdent.id;
		if (h.length > 25) {
			h = h.substr(0, 25);
		}
		let cipher = Crypto.createCipher('aes-256-ctr', 'pokemon');
		let crypted = cipher.update(h, 'utf8', 'hex');
		crypted += cipher.final('hex');
		let intVal = parseInt(crypted, 16) % pokes.length;
		let chosen = pokedex[pokes[intVal]].species;
		this.restrictReply(Text.stripCommands(chosen), 'random');
	},
};
