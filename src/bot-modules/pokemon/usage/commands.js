/**
 * Commands file
 *
 * usage: gets usage for a pokemon and a tier (via Smogon)
 * usagedate: gets usage for moves, itema... (via Smogon)
 */

'use strict';

const Path = require('path');

const Text = Tools('text');
const Chat = Tools('chat');
const LineSplitter = Tools('line-splitter');
const Cache = Tools('cache').BufferCache;

const UsageFailureCache = new Cache(20, 2 * 60 * 60 * 1000);

const Lang_File = Path.resolve(__dirname, 'commands.translations');

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
	return "https://www.smogon.com/stats/" + addLeftZero(year, 4) + "-" + addLeftZero(month + 1, 2) + "/";
}

function getUsageLink(App, callback) {
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

function tierName(tier, App) {
	if (!tier) return "";
	if (App.bot.formats[tier]) return App.bot.formats[tier].name;
	return tier;
}

function parseAliases(format, App) {
	if (!format) return '';
	format = Text.toId(format);
	if (App.bot.formats[format]) return format;
	try {
		let psAliases = App.data.getAliases();
		if (psAliases[format]) format = Text.toId(psAliases[format]);
	} catch (e) {}
	return Text.toFormatStandard(format);
}

const Default_Rank = 1630;
const Rank_Exception = 1695;
const Rank_Exceptions = {};

/* Commands */

module.exports = {
	usage: function (App) {
		this.setLangFile(Lang_File);
		getUsageLink(App, function (link) {
			if (!link) {
				return this.errorReply(this.mlt('error'));
			}
			if (!this.arg) {
				return this.restrictReply(this.mlt('stats') + ": " + link, 'usage');
			}
			let poke = "garchomp", searchIndex = -1;
			let tier = App.config.modules.pokemon.gtier || 'ou';
			if (this.room && App.config.modules.pokemon.roomtier && App.config.modules.pokemon.roomtier[this.room]) {
				tier = App.config.modules.pokemon.roomtier[this.room];
			}
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
				tier = parseAliases(args[1], App);
			}
			if (!poke || !tier) return this.errorReply(this.usage({desc: 'pokemon'}, {desc: 'tier', optional: true}));
			if (this.usageRankExceptionFlag) {
				ladderType = Rank_Exception;
				Rank_Exceptions[tier] = true;
			} else if (Rank_Exceptions[tier]) {
				ladderType = Rank_Exception;
			}
			let url = link + tier + "-" + ladderType + ".txt";
			if (markDownload(url)) {
				return this.errorReply(this.mlt('busy'));
			}
			if (!App.data.cache.has(url)) {
				markDownload(url, true);
			}
			App.data.wget(url, function (data, err) {
				markDownload(url, false);
				if (err) {
					return this.errorReply(this.mlt('err') + " " + url);
				}
				let lines = data.split("\n");
				if (lines[0].indexOf("Total battles:") === -1) {
					if (!App.data.cache.has(url)) {
						if (!UsageFailureCache.has(url)) {
							UsageFailureCache.cache(url, data);
						}
					}
					if (!this.usageRankExceptionFlag) {
						this.usageRankExceptionFlag = true;
						return App.parser.exec(this);
					} else {
						return this.errorReply(this.mlt('tiererr1') + " \"" +
							tierName(tier, App) + "\" " + this.mlt('tiererr3') + '. ' + this.mlt('pokeerr3') +
								'. ' + this.mlt('pleasecheck') + ': ' + link);
					}
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
						return this.errorReply(this.mlt('pokeerr1') + " \"" + poke + "\" " +
							this.mlt('pokeerr2') + " " + tierName(tier, App) + " " + this.mlt('pokeerr3'));
					} else {
						return this.restrictReply(this.mlt('pokeerr1') + " \"" + poke + "\" " +
							this.mlt('pokeerr2') + " " + tierName(tier, App) + " " + this.mlt('pokeerr3') +
							' | ' + Chat.bold(dataResAux.name) + ", #" + dataResAux.pos + " " + this.mlt('in') +
							" " + Chat.bold(tierName(tier, App)) + ". " + this.mlt('pokeusage') + ": " + dataResAux.usage + ", " +
							this.mlt('pokeraw') + ": " + dataResAux.raw, 'usage');
					}
				}
				this.restrictReply(Chat.bold(dataRes.name) + ", #" + dataRes.pos + " " + this.mlt('in') +
					" " + Chat.bold(tierName(tier, App)) + ". " + this.mlt('pokeusage') + ": " + dataRes.usage + ", " +
					this.mlt('pokeraw') + ": " + dataRes.raw, 'usage');
			}.bind(this), UsageFailureCache);
		}.bind(this));
	},

	usagedata: function (App) {
		this.setLangFile(Lang_File);
		getUsageLink(App, function (link) {
			if (!link) {
				return this.errorReply(this.mlt('error'));
			}
			let args = this.args;
			if (!this.arg || this.args.length < 2) {
				return this.errorReply(this.usage({desc: 'pokemon'},
					{desc: 'moves / items / abilities / spreads / teammates'}, {desc: 'tier', optional: true}));
			}
			let poke = "garchomp";
			let tier = App.config.modules.pokemon.gtier || 'ou';
			if (this.room && App.config.modules.pokemon.roomtier && App.config.modules.pokemon.roomtier[this.room]) {
				tier = App.config.modules.pokemon.roomtier[this.room];
			}
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
				tier = parseAliases(args[2], App);
			}
			if (this.usageRankExceptionFlag) {
				ladderType = Rank_Exception;
				Rank_Exceptions[tier] = true;
			} else if (Rank_Exceptions[tier]) {
				ladderType = Rank_Exception;
			}
			let url = link + "moveset/" + tier + "-" + ladderType + ".txt";
			if (markDownload(url)) {
				return this.errorReply(this.mlt('busy'));
			}
			if (!App.data.cache.has(url)) {
				markDownload(url, true);
			}
			App.data.wget(url, function (data, err) {
				markDownload(url, false);
				if (err) {
					return this.errorReply(this.mlt('err') + " " + url);
				}
				if (data.indexOf("+----------------------------------------+") === -1) {
					if (!App.data.cache.has(url)) {
						if (!UsageFailureCache.has(url)) {
							UsageFailureCache.cache(url, data);
						}
					}
					if (!this.usageRankExceptionFlag) {
						this.usageRankExceptionFlag = true;
						return App.parser.exec(this);
					} else {
						return this.errorReply(this.mlt('tiererr1') + " \"" +
							tierName(tier, App) + "\" " + this.mlt('tiererr3') + '. ' + this.mlt('pokeerr4') +
							'. ' + this.mlt('pleasecheck') + ': ' + link);
					}
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
					return this.errorReply(this.mlt('pokeerr1') + " \"" + poke + "\" " +
						this.mlt('pokeerr2') + " " + tierName(tier, App) + " " + this.mlt('pokeerr4'));
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
						resultName = this.mlt(dataType);
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
					return this.errorReply(this.mlt('notfound') + " " +
						this.mlt('usagedata1').replace("#NAME", resultName) + pokeName +
						this.mlt('usagedata2').replace("#NAME", resultName) + " " +
						this.mlt('in') + " " + tierName(tier, App));
				}
				let spl = new LineSplitter(App.config.bot.maxMessageLength);
				spl.add(Chat.bold((this.mlt('usagedata1').replace("#NAME", resultName) + ' ' + pokeName +
					this.mlt('usagedata2').replace("#NAME", resultName) + " " +
					this.mlt('in') + " " + tierName(tier, App)).trim()) + ":");
				for (let i = 0; i < result.length; i++) {
					spl.add(" " + result[i] + (i < (result.length - 1) ? ',' : ''));
				}
				this.restrictReply(spl.getLines(), 'usagedata');
			}.bind(this), UsageFailureCache);
		}.bind(this));
	},
};
