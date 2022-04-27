/**
 * Commands File
 *
 * pick: randomly chooses between two or more options
 * poke: gets a random pokemon
 * hashpoke: gets a pseudo-random pokemon using an input string
 */

'use strict';

const Path = require('path');
const Crypto = require('crypto');

const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'fun.translations');

module.exports = {
	choose: "pick",
	pick: function () {
		this.setLangFile(Lang_File);
		let opts = [];
		for (let i = 0; i < this.args.length; i++) {
			let opt = this.args[i].trim();
			if (opt) {
				opts.push(opt);
			}
		}
		if (opts.length < 2) return this.errorReply(this.usage({ desc: 'opt1' }, { desc: 'opt2' }, { desc: '...', optional: true }));
		if (this.wall) {
			this.restrictReply(Text.stripCommands(Chat.bold(opts[Math.floor(Math.random() * opts.length)])), 'random');
		} else {
			this.restrictReply(Text.stripCommands(Chat.code(opts[Math.floor(Math.random() * opts.length)])), 'random');
		}
	},

	rpoke: 'poke',
	randpoke: 'poke',
	poke: function (App) {
		this.setLangFile(Lang_File);
		let pokedex;
		try {
			pokedex = App.data.getPokedex();
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(this.mlt('error'));
		}
		let pokes = Object.keys(pokedex);
		let chosen = pokedex[pokes[Math.floor(Math.random() * pokes.length)]].name;
		let roomData = App.bot.rooms[this.room];
		let botid = Text.toId(App.bot.getBotNick());
		if (this.can('random') && roomData && roomData.users[botid] && this.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'voice')) {
			this.send('!dt ' + chosen, this.room);
		} else {
			this.pmReply(Text.stripCommands(chosen));
		}
	},

	randmove: 'randommove',
	randommove: function (App) {
		this.setLangFile(Lang_File);
		let moves;
		try {
			moves = App.data.getMoves();
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(this.mlt('error'));
		}
		let movesKeys = Object.keys(moves);
		let chosen = moves[movesKeys[Math.floor(Math.random() * movesKeys.length)]].name;
		let roomData = App.bot.rooms[this.room];
		let botid = Text.toId(App.bot.getBotNick());
		if (this.can('random') && roomData && roomData.users[botid] && this.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'voice')) {
			this.send('!dt ' + chosen, this.room);
		} else {
			this.pmReply(Text.stripCommands(chosen));
		}
	},

	randitem: 'randomitem',
	randomitem: function (App) {
		this.setLangFile(Lang_File);
		let items;
		try {
			items = App.data.getItems();
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(this.mlt('error'));
		}
		let itemsKeys = Object.keys(items);
		let chosen = items[itemsKeys[Math.floor(Math.random() * itemsKeys.length)]].name;
		let roomData = App.bot.rooms[this.room];
		let botid = Text.toId(App.bot.getBotNick());
		if (this.can('random') && roomData && roomData.users[botid] && this.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'voice')) {
			this.send('!dt ' + chosen, this.room);
		} else {
			this.pmReply(Text.stripCommands(chosen));
		}
	},

	randability: 'randomability',
	randomability: function (App) {
		this.setLangFile(Lang_File);
		let abilities;
		try {
			abilities = App.data.getAbilities();
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(this.mlt('error'));
		}
		let abilityKeys = Object.keys(abilities);
		let chosen = abilities[abilityKeys[Math.floor(Math.random() * abilityKeys.length)]].name;
		let roomData = App.bot.rooms[this.room];
		let botid = Text.toId(App.bot.getBotNick());
		if (this.can('random') && roomData && roomData.users[botid] && this.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'voice')) {
			this.send('!dt ' + chosen, this.room);
		} else {
			this.pmReply(Text.stripCommands(chosen));
		}
	},

	randnature: 'randomnature',
	randomnature: function (App) {
		this.setLangFile(Lang_File);
		const natures = {
			"adamant": "Adamant",
			"bashful": "Bashful",
			"bold": "Bold",
			"brave": "Brave",
			"calm": "Calm",
			"careful": "Careful",
			"docile": "Docile",
			"gentle": "Gentle",
			"hardy": "Hardy",
			"hasty": "Hasty",
			"impish": "Impish",
			"jolly": "Jolly",
			"lax": "Lax",
			"lonely": "Lonely",
			"mild": "Mild",
			"modest": "Modest",
			"naive": "Naive",
			"naughty": "Naughty",
			"quiet": "Quiet",
			"quirky": "Quirky",
			"rash": "Rash",
			"relaxed": "Relaxed",
			"sassy": "Sassy",
			"serious": "Serious",
			"timid": "Timid",
		};
		let natureKeys = Object.keys(natures);
		let chosen = natures[natureKeys[Math.floor(Math.random() * natureKeys.length)]];
		let roomData = App.bot.rooms[this.room];
		let botid = Text.toId(App.bot.getBotNick());
		if (this.can('random') && roomData && roomData.users[botid] && this.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'voice')) {
			this.send('!dt ' + chosen, this.room);
		} else {
			this.pmReply(Text.stripCommands(chosen));
		}
	},

	rdata: 'randomdata',
	randomdata: function (App) {
		this.setLangFile(Lang_File);
		let pokedex;
		let moves;
		let items;
		let abilities;

		try {
			pokedex = App.data.getPokedex();
			moves = App.data.getMoves();
			items = App.data.getItems();
			abilities = App.data.getAbilities();
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(this.mlt('error'));
		}

		let chosenCat = ([pokedex, moves, items, abilities])[Math.floor(Math.random() * 4)];

		let opts = Object.keys(chosenCat);
		let chosenInf = chosenCat[opts[Math.floor(Math.random() * opts.length)]];
		let chosen = chosenInf.name;
		let roomData = App.bot.rooms[this.room];
		let botid = Text.toId(App.bot.getBotNick());
		if (this.can('randpoke') && roomData && roomData.users[botid] && this.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'voice')) {
			this.send('!dt ' + chosen, this.room);
		} else {
			this.pmReply(Text.stripCommands(chosen));
		}
	},

	hpoke: "hashpoke",
	hashpoke: function (App) {
		this.setLangFile(Lang_File);
		let pokedex;
		try {
			pokedex = App.data.getPokedex();
		} catch (err) {
			App.reportCrash(err);
			return this.errorReply(this.mlt('error'));
		}
		let pokes = Object.keys(pokedex);
		let data = Text.toId(this.arg) || this.byIdent.id;

		if (App.config.addons && App.config.addons.hpoke && App.config.addons.hpoke[data]) {
			let custom = Text.toId(App.config.addons.hpoke[data]);
			if (pokedex[custom]) {
				return this.restrictReply(Text.stripCommands(pokedex[custom].name), 'random');
			} else {
				return this.restrictReply(Text.stripCommands(App.config.addons.hpoke[data]), 'random');
			}
		}

		let hash = Crypto.createHash('md5').update(data).digest("hex");
		let intVal = parseInt(hash, 16) % pokes.length;
		this.restrictReply(Text.stripCommands(pokedex[pokes[intVal]].name), 'random');
	},

	randformat: "randomformat",
	randomformat: function (App) {
		this.setLangFile(Lang_File);
		let filters = this.args.map(function (f) {
			return Text.toId(f);
		}).filter(function (f) {
			return !!f;
		});
		let formats = Object.keys(App.bot.formats).filter(function (f) {
			for (let filter of filters) {
				if (f.indexOf(filter) === -1) {
					return false;
				}
			}
			return true;
		});
		if (formats.length === 0) {
			return this.errorReply(this.mlt("noformats"));
		}
		let chosen = formats[Math.floor(Math.random() * formats.length)];
		if (chosen) {
			let roomData = App.bot.rooms[this.room];
			let botid = Text.toId(App.bot.getBotNick());
			if (this.can('randpoke') && roomData && roomData.users[botid] && this.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'voice')) {
				this.reply('!tier ' + App.bot.formats[chosen].name);
			} else {
				this.restrictReply(Text.stripCommands(App.bot.formats[chosen].name), 'random');
			}
		}
	},

	randrand: "randomrandomformat",
	randomrandomformat: function (App) {
		this.setLangFile(Lang_File);
		let filters = this.args.map(function (f) {
			return Text.toId(f);
		}).filter(function (f) {
			return !!f;
		});
		let formats = Object.keys(App.bot.formats).filter(function (f) {
			if (App.bot.formats[f].team) {
				return false;
			}
			for (let filter of filters) {
				if (f.indexOf(filter) === -1) {
					return false;
				}
			}
			return true;
		});
		if (formats.length === 0) {
			return this.errorReply(this.mlt("noformats"));
		}
		let chosen = formats[Math.floor(Math.random() * formats.length)];
		if (chosen) {
			let roomData = App.bot.rooms[this.room];
			let botid = Text.toId(App.bot.getBotNick());
			if (this.can('randpoke') && roomData && roomData.users[botid] && this.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'voice')) {
				this.reply('!tier ' + App.bot.formats[chosen].name);
			} else {
				this.restrictReply(Text.stripCommands(App.bot.formats[chosen].name), 'random');
			}
		}
	},
};
