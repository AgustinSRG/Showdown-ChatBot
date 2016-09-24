/**
 * Commands file
 */

'use strict';

const Path = require('path');

const Text = Tools.get('text.js');
const Chat = Tools.get('chat.js');
const Translator = Tools.get('translate.js');
const LineSplitter = Tools.get('line-splitter.js');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));

if (!App.config.modules.pokemon) {
	App.config.modules.pokemon = {};
}

/* Usage utils */

function addLeftZero(num, nz) {
	let str = num.toString();
	while (str.length < nz) str = "0" + str;
	return str;
}

function generateUsageLink(monthmod) {
	let now = new Date();
	let year = now.getFullYear();
	let month = now.getMonth();
	if (monthmod) month += monthmod;
	while (month < 0) {
		month += 12;
		year--;
	}
	while (month > 11) {
		month -= 12;
		year++;
	}
	return "http://www.smogon.com/stats/" + addLeftZero(year, 4) + "-" + addLeftZero(month + 1, 2) + "/";
}

function getUsageLink(callback) {
	let realLink = generateUsageLink(-1);
	let currLink = App.config.modules.pokemon.usagelink;
	if (currLink !== realLink) {
		App.data.wget(realLink, (data, err) => {
			if (!err && data.indexOf("<title>404 Not Found</title>") < 0) {
				App.config.modules.pokemon.usagelink = realLink;
				App.db.write();
				App.data.cache.uncacheAll('smogon-usage');
				App.log("Usage link updated: " + realLink);
				return callback(realLink);
			} else {
				return callback(currLink);
			}
		});
	} else {
		return callback(currLink);
	}
}

const downloadingFlag = {};

function markDownload(link, b) {
	if (b === false) {
		if (downloadingFlag[link]) delete downloadingFlag[link];
	} else if (b === true) {
		downloadingFlag[link] = true;
	} else {
		return downloadingFlag[link] || false;
	}
}

function tierName(tier) {
	if (!tier) return "";
	if (App.bot.formats[tier]) return App.bot.formats[tier].name;
	return tier.toUpperCase();
}

function parseAliases(format) {
	if (!format) return '';
	format = Text.toId(format);
	if (App.bot.formats[format]) return format;
	try {
		let psAliases = App.data.getAliases();
		if (psAliases[format]) format = Text.toId(psAliases[format]);
	} catch (e) {}
	return format;
}

const Default_Rank = 1630;
const Rank_Exceptions = {'randombattle': 1695, 'ou': 1695, 'oususpecttest': 1695, 'doublesou': 1695};
const Tier_Error_Expires = 2 * 60 * 60 * 1000;

App.parser.addPermission('usage', {group: 'voice'});
App.parser.addPermission('usagedata', {group: 'driver'});

/* Commands */

module.exports = {
	usage: function () {
		getUsageLink(function (link) {
			if (!link) {
				return this.errorReply(translator.get('error', this.lang));
			}
			if (!this.arg) {
				return this.restrictReply(translator.get('stats', this.lang) + ": " + link, 'usage');
			}
			let poke = "garchomp", searchIndex = -1;
			let tier = 'ou';
			let ladderType = Default_Rank;
			let args = this.args;
			for (let i = 0; i < args.length; i++) args[i] = Text.toId(args[i]);
			poke = Text.toId(args[0]);
			try {
				let aliases = App.data.getAliases();
				if (aliases[poke]) poke = Text.toId(aliases[poke]);
			} catch (e) {
				App.log("Could not fetch aliases. Cmd: " + this.cmd + " " + this.arg + " | Room: " + this.room + " | By: " + this.by);
			}
			if (!isNaN(parseInt(poke))) searchIndex = parseInt(poke);
			if (args[1]) {
				tier = parseAliases(args[1]);
				if (!App.bot.formats[tier] && !App.bot.formats[tier + "suspecttest"]) {
					return this.errorReply(translator.get('tiererr1', this.lang) + ' "' + tier + '" ' + translator.get('tiererr2', this.lang));
				}
			}
			if (!poke || !tier) return this.errorReply(this.usage({desc: 'pokemon'}, {desc: 'tier', optional: true}));
			if (Rank_Exceptions[tier]) ladderType = Rank_Exceptions[tier];
			let url = link + tier + "-" + ladderType + ".txt";
			if (markDownload(url)) {
				return this.errorReply(translator.get('busy', this.lang));
			}
			if (!App.data.cache.has(url)) {
				markDownload(url, true);
			}
			App.data.wget(url, function (data, err) {
				markDownload(url, false);
				if (err) {
					return this.errorReply(translator.get('err', this.lang) + " " + url);
				}
				let lines = data.split("\n");
				if (lines[0].indexOf("Total battles:") === -1) {
					if (!App.data.cache.has(url)) {
						App.data.cache.cache(url, data, Tier_Error_Expires, {'smogon-usage': 1});
					}
					return this.errorReply(translator.get('tiererr1', this.lang) + " \"" +
						tierName(tier) + "\" " + translator.get('tiererr3', this.lang) + '. ' + translator.get('pokeerr3', this.lang));
				} else {
					if (!App.data.cache.has(url)) {
						App.data.cache.cache(url, data, 0, {'smogon-usage': 1});
					}
				}
				let dataRes = {
					name: poke,
					pos: -1,
					usage: 0,
					raw: 0,
				};
				let dataResAux = {
					name: poke,
					pos: -1,
					usage: 0,
					raw: 0,
					ld: 10,
				};
				let maxLd = 3;
				if (poke.length <= 1) {
					maxLd = 0;
				} else if (poke.length <= 4) {
					maxLd = 1;
				} else if (poke.length <= 6) {
					maxLd = 2;
				}
				for (let i = 5; i < lines.length; i++) {
					let line = lines[i].split("|");
					if (line.length < 7) continue;
					if (Text.toId(line[2]) === poke || searchIndex === parseInt(line[1].trim())) {
						dataRes.name = line[2].trim();
						dataRes.pos = parseInt(line[1].trim());
						dataRes.usage = line[3].trim();
						dataRes.raw = line[4].trim();
						break;
					} else if (maxLd) {
						let ld = Text.levenshtein(poke, Text.toId(line[2]), maxLd);
						if (ld <= maxLd && ld < dataResAux.ld) {
							dataResAux.ld = ld;
							dataResAux.name = line[2].trim();
							dataResAux.pos = parseInt(line[1].trim());
							dataResAux.usage = line[3].trim();
							dataResAux.raw = line[4].trim();
						}
					}
				}
				if (!dataRes.pos || dataRes.pos < 1) {
					if (!dataResAux.pos || dataResAux.pos < 1) {
						return this.errorReply(translator.get('pokeerr1', this.lang) + " \"" + poke + "\" " +
							translator.get('pokeerr2', this.lang) + " " + tierName(tier) + " " + translator.get('pokeerr3', this.lang));
					} else {
						return this.restrictReply(translator.get('pokeerr1', this.lang) + " \"" + poke + "\" " +
							translator.get('pokeerr2', this.lang) + " " + tierName(tier) + " " + translator.get('pokeerr3', this.lang) +
							' | ' + Chat.bold(dataResAux.name) + ", #" + dataResAux.pos + " " + translator.get('in', this.lang) +
							" " + Chat.bold(tierName(tier)) + ". " + translator.get('pokeusage', this.lang) + ": " + dataResAux.usage + ", " +
							translator.get('pokeraw', this.lang) + ": " + dataResAux.raw, 'usage');
					}
				}
				this.restrictReply(Chat.bold(dataRes.name) + ", #" + dataRes.pos + " " + translator.get('in', this.lang) +
					" " + Chat.bold(tierName(tier)) + ". " + translator.get('pokeusage', this.lang) + ": " + dataRes.usage + ", " +
					translator.get('pokeraw', this.lang) + ": " + dataRes.raw, 'usage');
			}.bind(this));
		}.bind(this));
	},

	usagedata: function () {
		getUsageLink(function (link) {
			if (!link) {
				return this.errorReply(translator.get('error', this.lang));
			}
			let args = this.args;
			if (!this.arg || this.args.length < 2) {
				return this.errorReply(this.usage({desc: 'pokemon'},
					{desc: 'moves / items / abilities / spreads / teammates'}, {desc: 'tier', optional: true}));
			}
			let poke = "garchomp";
			let tier = 'ou';
			let dataType = Text.toId(args[1]);
			if (!(dataType in {"moves": 1, "items": 1, "abilities": 1, "teammates": 1, "spreads": 1})) {
				return this.errorReply(this.usage({desc: 'pokemon'},
					{desc: 'moves / items / abilities / spreads / teammates'}, {desc: 'tier', optional: true}));
			}
			let ladderType = Default_Rank;
			for (let i = 0; i < args.length; i++) args[i] = Text.toId(args[i]);
			poke = Text.toId(args[0]);
			try {
				let aliases = App.data.getAliases();
				if (aliases[poke]) poke = Text.toId(aliases[poke]);
			} catch (e) {
				App.log("Could not fetch aliases. Cmd: " + this.cmd + " " + this.arg + " | Room: " + this.room + " | By: " + this.by);
			}
			if (args[2]) {
				tier = parseAliases(args[2]);
				if (!App.bot.formats[tier] && !App.bot.formats[tier + "suspecttest"]) {
					return this.errorReply(translator.get('tiererr1', this.lang) + ' "' + tier + '" ' + translator.get('tiererr2', this.lang));
				}
			}
			if (Rank_Exceptions[tier]) ladderType = Rank_Exceptions[tier];
			let url = link + "moveset/" + tier + "-" + ladderType + ".txt";
			if (markDownload(url)) {
				return this.errorReply(translator.get('busy', this.lang));
			}
			if (!App.data.cache.has(url)) {
				markDownload(url, true);
			}
			App.data.wget(url, function (data, err) {
				markDownload(url, false);
				if (err) {
					return this.errorReply(translator.get('err', this.lang) + " " + url);
				}
				if (data.indexOf("+----------------------------------------+") === -1) {
					if (!App.data.cache.has(url)) {
						App.data.cache.cache(url, data, Tier_Error_Expires, {'smogon-usage': 1});
					}
					return this.errorReply(translator.get('tiererr1', this.lang) + " \"" +
						tierName(tier) + "\" " + translator.get('tiererr3', this.lang) + '. ' + translator.get('pokeerr4', this.lang));
				} else {
					if (!App.data.cache.has(url)) {
						App.data.cache.cache(url, data, 0, {'smogon-usage': 1});
					}
				}
				let pokes = data.split(' +----------------------------------------+ \n +----------------------------------------+ ');
				let pokeData = null, chosen = false;
				for (let i = 0; i < pokes.length; i++) {
					pokeData = pokes[i].split("\n");
					if (!pokeData[1] || Text.toId(pokeData[1]) !== poke) continue;
					chosen = true;
					break;
				}
				if (!chosen) {
					return this.errorReply(translator.get('pokeerr1', this.lang) + " \"" + poke + "\" " +
						translator.get('pokeerr2', this.lang) + " " + tierName(tier) + " " + translator.get('pokeerr4', this.lang));
				}
				let result = [];
				let resultName = "";
				let pokeName = (pokeData[1].split("|")[1] || "").trim();
				for (let i = 0; i < pokeData.length; i++) {
					if (pokeData[i + 1] && pokeData[i].trim() === "+----------------------------------------+") {
						switch (Text.toId(pokeData[i + 1])) {
						case 'abilities':
							if (dataType !== "abilities") continue;
							break;
						case 'items':
							if (dataType !== "items") continue;
							break;
						case 'moves':
							if (dataType !== "moves") continue;
							break;
						case 'spreads':
							if (dataType !== "spreads") continue;
							break;
						case 'teammates':
							if (dataType !== "teammates") continue;
							break;
						default:
							continue;
						}
						resultName = translator.get(dataType, this.lang);
						i = i + 2;
						let auxRes, percent;
						while (i < pokeData.length) {
							if (pokeData[i].trim() === "+----------------------------------------+") break;
							auxRes = pokeData[i].split("|")[1];
							if (auxRes) {
								auxRes = auxRes.trim().split(" ");
								percent = auxRes.pop();
								auxRes = auxRes.join(" ");
								result.push(auxRes + " (" + percent + ")");
							}
							i++;
						}
						break;
					}
				}
				if (!result.length) {
					return this.errorReply(translator.get('notfound', this.lang) + " " +
						translator.get('usagedata1', this.lang).replace("#NAME", resultName) + pokeName +
						translator.get('usagedata2', this.lang).replace("#NAME", resultName) + " " +
						translator.get('in', this.lang) + " " + tierName(tier));
				}
				let spl = new LineSplitter(App.config.bot.maxMessageLength);
				spl.add(Chat.bold((translator.get('usagedata1', this.lang).replace("#NAME", resultName) + ' ' + pokeName +
					translator.get('usagedata2', this.lang).replace("#NAME", resultName) + " " +
					translator.get('in', this.lang) + " " + tierName(tier)).trim()) + ":");
				for (let i = 0; i < result.length; i++) {
					spl.add(" " + result[i] + (i < (result.length - 1) ? ',' : ''));
				}
				this.restrictReply(spl.getLines(), 'usagedata');
			}.bind(this));
		}.bind(this));
	},
};
