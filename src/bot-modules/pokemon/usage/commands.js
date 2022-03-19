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

function botCanHtml(room, App) {
	let roomData = App.bot.rooms[room];
	let botid = Text.toId(App.bot.getBotNick());
	return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'bot'));
}

function toSpriteId(str) {
	const id = ('' + str).replace(/[^a-zA-Z0-9-]+/g, '').toLowerCase();
	const parts = id.split("-");
	return parts[0] + (parts.length > 1 ? ("-" + parts.slice(1).join("")) : "");
}

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

const downloadingFlag = Object.create(null);

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
	} catch (e) { }
	return Text.toFormatStandard(format);
}

function getFractionAproximation(usage) {
	usage = (usage + "").replace("%", "").trim();
	let usageNum = Number(usage);

	if (isNaN(usageNum) || !isFinite(usageNum) || usageNum <= 0) {
		return 0;
	}

	let inversed = Math.round(1 / (usageNum / 100));

	if (isNaN(inversed) || !isFinite(inversed) || inversed <= 0) {
		return 0;
	}

	return inversed;
}

const Low_Ladder_ELO = 0;
const Mid_Ladder_ELO = 1500;
const High_Ladder_ELO = 1630;
const High_Ladder_ELO_EX = 1695;
const Top_Ladder_ELO = 1760;
const Top_Ladder_ELO_EX = 1825;

const Rank_Exceptions = Object.create(null);

function getLadderELO(ladder, ex) {
	switch (ladder) {
		case "top":
			return (ex ? Top_Ladder_ELO_EX : Top_Ladder_ELO);
		case "high":
			return (ex ? High_Ladder_ELO_EX : High_Ladder_ELO);
		case "mid":
			return Mid_Ladder_ELO;
		default:
			return Low_Ladder_ELO;
	}
}

/* Commands */

module.exports = {
	usagelink: function (App) {
		this.setLangFile(Lang_File);
		getUsageLink(App, function (link) {
			if (!link) {
				return this.errorReply(this.mlt('error'));
			}
			this.restrictReply(this.mlt('stats') + ": " + link, 'usage');
		}.bind(this));
	},
	usage: function (App) {
		this.setLangFile(Lang_File);
		getUsageLink(App, function (link) {
			if (!link) {
				return this.errorReply(this.mlt('error'));
			}
			if (!this.arg) {
				return this.errorReply(this.usage({ desc: 'pokemon' }, { desc: 'tier', optional: true }, { desc: 'ladder (top|high|mid|low)', optional: true }));
			}
			let poke = "garchomp", searchIndex = -1;
			let tier = App.config.modules.pokemon.gtier || parseAliases('ou', App);
			let ladder = 'high';
			if (this.room && App.config.modules.pokemon.roomtier && App.config.modules.pokemon.roomtier[this.room]) {
				tier = App.config.modules.pokemon.roomtier[this.room];
			}
			let ladderType = 0;
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
			if (args[2]) {
				ladder = Text.toId(args[2]);
				if (['top', 'high', 'mid', 'low'].indexOf(ladder) === -1) {
					return this.errorReply(this.mlt('badladder') + ": " + "top, high, mid, low");
				}
			}
			if (!poke || !tier) return this.errorReply(this.usage({ desc: 'pokemon' }, { desc: 'tier', optional: true }, { desc: 'ladder (top|high|mid|low)', optional: true }));
			if (this.usageRankExceptionFlag || Rank_Exceptions[tier]) {
				ladderType = getLadderELO(ladder, true);
			} else {
				ladderType = getLadderELO(ladder, false);
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
							tierName(tier, App) + "\" " + this.mlt('tiererr3') + '. ' +
							'. ' + this.mlt('pleasecheck') + ': ' + link);
					}
				} else {
					if (this.usageRankExceptionFlag) {
						Rank_Exceptions[tier] = true;
					}
					if (!App.data.cache.has(url)) {
						App.data.cache.cache(url, data, 0, { 'smogon-usage': 1 });
					}
				}
				let dataRes = {
					name: poke,
					pos: -1,
					usage: 0,
					raw: 0,
					fraction: 0,
				};
				let dataResAux = {
					name: poke,
					pos: -1,
					usage: 0,
					raw: 0,
					ld: 10,
					fraction: 0,
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
						dataRes.fraction = getFractionAproximation(dataRes.usage);
						break;
					} else if (maxLd) {
						let ld = Text.levenshtein(poke, Text.toId(line[2]), maxLd);
						if (ld <= maxLd && ld < dataResAux.ld) {
							dataResAux.ld = ld;
							dataResAux.name = line[2].trim();
							dataResAux.pos = parseInt(line[1].trim());
							dataResAux.usage = line[3].trim();
							dataResAux.raw = line[4].trim();
							dataResAux.fraction = getFractionAproximation(dataResAux.usage);
						}
					}
				}
				if (!dataRes.pos || dataRes.pos < 1) {
					if (!dataResAux.pos || dataResAux.pos < 1) {
						return this.errorReply(this.mlt('pokeerr1') + " \"" + poke + "\" " +
							this.mlt('pokeerr2') + " " + tierName(tier, App) + " (" + this.mlt(ladder) + ", __>" + ladderType + " ELO__)");
					} else {
						return this.restrictReply(this.mlt('pokeerr1') + " \"" + poke + "\" " +
							this.mlt('pokeerr2') + " " + tierName(tier, App) +
							' | ' + Chat.bold(dataResAux.name) + ", #" + dataResAux.pos + " " + this.mlt('in') +
							" " + Chat.bold(tierName(tier, App)) + " (" + this.mlt(ladder) + ", __>" + ladderType + " ELO__). " + this.mlt('pokeusage') + ": " + Chat.bold(dataResAux.usage) + "" +
							(dataResAux.fraction ? (dataResAux.fraction > 1 ? (" (" + this.mlt("aprox") + " 1 " + this.mlt("of") + " " + dataResAux.fraction + " " + this.mlt("teams") + ")") : (" (" + this.mlt("allteams") + ")")) : ""), 'usage');
					}
				}
				this.restrictReply(Chat.bold(dataRes.name) + ", #" + dataRes.pos + " " + this.mlt('in') +
					" " + Chat.bold(tierName(tier, App)) + " (" + this.mlt(ladder) + ", __>" + ladderType + " ELO__). " + this.mlt('pokeusage') + ": " + Chat.bold(dataRes.usage) + "" +
					(dataRes.fraction ? (dataRes.fraction > 1 ? (" (" + this.mlt("aprox") + " 1 " + this.mlt("of") + " " + dataRes.fraction + " " + this.mlt("teams") + ")") : (" (" + this.mlt("allteams") + ")")) : ""), 'usage');
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
				return this.errorReply(this.usage({ desc: 'pokemon' },
					{ desc: 'moves|items|abilities|spreads|teammates' }, { desc: 'tier', optional: true }, { desc: 'ladder (top|high|mid|low)', optional: true }));
			}
			let poke = "garchomp";
			let tier = App.config.modules.pokemon.gtier || parseAliases('ou', App);
			let ladder = 'high';
			if (this.room && App.config.modules.pokemon.roomtier && App.config.modules.pokemon.roomtier[this.room]) {
				tier = App.config.modules.pokemon.roomtier[this.room];
			}
			let dataType = Text.toId(args[1]);
			if (!(dataType in { "moves": 1, "items": 1, "abilities": 1, "teammates": 1, "spreads": 1 })) {
				return this.errorReply(this.usage({ desc: 'pokemon' },
					{ desc: 'moves|items|abilities|spreads|teammates' }, { desc: 'tier', optional: true }, { desc: 'ladder (top|high|mid|low)', optional: true }));
			}
			let ladderType = 0;
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
			if (args[3]) {
				ladder = Text.toId(args[2]);
				if (['top', 'high', 'mid', 'low'].indexOf(ladder) === -1) {
					return this.errorReply(this.mlt('badladder') + ": " + "top, high, mid, low");
				}
			}
			if (this.usageRankExceptionFlag || Rank_Exceptions[tier]) {
				ladderType = getLadderELO(ladder, true);
			} else {
				ladderType = getLadderELO(ladder, false);
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
							tierName(tier, App) + "\" " + this.mlt('tiererr3') + '. ' +
							'. ' + this.mlt('pleasecheck') + ': ' + link);
					}
				} else {
					if (this.usageRankExceptionFlag) {
						Rank_Exceptions[tier] = true;
					}
					if (!App.data.cache.has(url)) {
						App.data.cache.cache(url, data, 0, { 'smogon-usage': 1 });
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
						this.mlt('pokeerr2') + " " + tierName(tier, App) + " (" + this.mlt(ladder) + ", __>" + ladderType + " ELO__)");
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
						this.mlt('in') + " " + tierName(tier, App) + " (" + this.mlt(ladder) + ", __>" + ladderType + " ELO__)");
				}
				let spl = new LineSplitter(App.config.bot.maxMessageLength);
				spl.add(Chat.bold((this.mlt('usagedata1').replace("#NAME", resultName) + ' ' + pokeName +
					this.mlt('usagedata2').replace("#NAME", resultName) + " " +
					this.mlt('in') + " " + tierName(tier, App)).trim()) + " (" + this.mlt(ladder) + ", __>" + ladderType + " ELO__):");
				for (let i = 0; i < result.length; i++) {
					spl.add(" " + result[i] + (i < (result.length - 1) ? ',' : ''));
				}
				this.restrictReply(spl.getLines(), 'usagedata');
			}.bind(this), UsageFailureCache);
		}.bind(this));
	},

	usagecard: function (App) {
		this.setLangFile(Lang_File);

		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}

		if (!this.can('usagedata', this.room)) return this.replyAccessDenied('usagedata');

		if (!botCanHtml(this.room, App)) {
			return this.errorReply(this.mlt('nobot'));
		}

		getUsageLink(App, function (link) {
			if (!link) {
				return this.errorReply(this.mlt('error'));
			}
			if (!this.arg) {
				return this.errorReply(this.usage({ desc: 'pokemon' }, { desc: 'tier', optional: true }, { desc: 'ladder (top|high|mid|low)', optional: true }));
			}
			let poke = "garchomp", searchIndex = -1;
			let tier = App.config.modules.pokemon.gtier || parseAliases('ou', App);
			let ladder = 'high';
			if (this.room && App.config.modules.pokemon.roomtier && App.config.modules.pokemon.roomtier[this.room]) {
				tier = App.config.modules.pokemon.roomtier[this.room];
			}
			let ladderType = 0;
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
			if (args[2]) {
				ladder = Text.toId(args[2]);
				if (['top', 'high', 'mid', 'low'].indexOf(ladder) === -1) {
					return this.errorReply(this.mlt('badladder') + ": " + "top, high, mid, low");
				}
			}
			if (!poke || !tier) return this.errorReply(this.usage({ desc: 'pokemon' }, { desc: 'tier', optional: true }));
			if (this.usageRankExceptionFlag || Rank_Exceptions[tier]) {
				ladderType = getLadderELO(ladder, true);
			} else {
				ladderType = getLadderELO(ladder, false);
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
							tierName(tier, App) + "\" " + this.mlt('tiererr3') + '. ' +
							'. ' + this.mlt('pleasecheck') + ': ' + link);
					}
				} else {
					if (this.usageRankExceptionFlag) {
						Rank_Exceptions[tier] = true;
					}
					if (!App.data.cache.has(url)) {
						App.data.cache.cache(url, data, 0, { 'smogon-usage': 1 });
					}
				}
				let dataRes = {
					name: poke,
					pos: -1,
					usage: 0,
					raw: 0,
					fraction: 0,
				};
				let dataResAux = {
					name: poke,
					pos: -1,
					usage: 0,
					raw: 0,
					ld: 10,
					fraction: 0,
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
						dataRes.fraction = getFractionAproximation(dataRes.usage);
						break;
					} else if (maxLd) {
						let ld = Text.levenshtein(poke, Text.toId(line[2]), maxLd);
						if (ld <= maxLd && ld < dataResAux.ld) {
							dataResAux.ld = ld;
							dataResAux.name = line[2].trim();
							dataResAux.pos = parseInt(line[1].trim());
							dataResAux.usage = line[3].trim();
							dataResAux.raw = line[4].trim();
							dataResAux.fraction = getFractionAproximation(dataResAux.usage);
						}
					}
				}
				if (!dataRes.pos || dataRes.pos < 1) {
					if (!dataResAux.pos || dataResAux.pos < 1) {
						return this.errorReply(this.mlt('pokeerr1') + " \"" + poke + "\" " +
							this.mlt('pokeerr2') + " " + tierName(tier, App) + " " + " (" + this.mlt(ladder) + ", __>" + ladderType + " ELO__)");
					} else {
						dataRes = dataResAux;
					}
				}

				poke = Text.toId(dataRes.name);

				// Basic usage data acquired, fech details for the pokemon

				let urlDetails = link + "moveset/" + tier + "-" + ladderType + ".txt";
				if (markDownload(urlDetails)) {
					return this.errorReply(this.mlt('busy'));
				}
				if (!App.data.cache.has(urlDetails)) {
					markDownload(urlDetails, true);
				}
				App.data.wget(urlDetails, function (data2, err2) {
					markDownload(urlDetails, false);
					if (err2) {
						data2 = "";
					}
					let hasDetailedData = true;
					if (data2.indexOf("+----------------------------------------+") === -1) {
						if (!err2 && !App.data.cache.has(urlDetails)) {
							if (!UsageFailureCache.has(urlDetails)) {
								UsageFailureCache.cache(urlDetails, data2);
							}
						}
						hasDetailedData = false;
					} else {
						if (!App.data.cache.has(urlDetails)) {
							App.data.cache.cache(urlDetails, data2, 0, { 'smogon-usage': 1 });
						}
					}

					let detailsHTML = '<p>' + Text.escapeHTML(this.mlt('nodetails')) + '</p>';

					let pokeData = null, chosen = false;

					if (hasDetailedData) {
						let pokes = data2.split(' +----------------------------------------+ \n +----------------------------------------+ ');
						for (let i = 0; i < pokes.length; i++) {
							pokeData = pokes[i].split("\n");

							if (!pokeData[1] || Text.toId(pokeData[1]) !== poke) continue;
							chosen = true;
							break;
						}

						if (chosen) {
							const htmlData = {
								"abilities": "",
								"items": "",
								"moves": "",
								"spreads": "",
								"teammates": "",
							};

							for (let i = 0; i < pokeData.length; i++) {
								if (pokeData[i + 1] && pokeData[i].trim() === "+----------------------------------------+") {
									let htmlKey = "";
									switch (Text.toId(pokeData[i + 1])) {
										case 'abilities':
											htmlKey = 'abilities';
											break;
										case 'items':
											htmlKey = 'items';
											break;
										case 'moves':
											htmlKey = 'moves';
											break;
										case 'spreads':
											htmlKey = 'spreads';
											break;
										case 'teammates':
											htmlKey = 'teammates';
											break;
										default:
											continue;
									}

									i = i + 2;
									let auxRes, percent;
									while (i < pokeData.length) {
										if (pokeData[i].trim() === "+----------------------------------------+") {
											i--;
											break;
										}
										auxRes = pokeData[i].split("|")[1];
										if (auxRes) {
											auxRes = auxRes.trim().split(" ");
											percent = auxRes.pop();
											auxRes = auxRes.join(" ");

											htmlData[htmlKey] += ("<li><b>" + Text.escapeHTML(auxRes) + "</b> (" + Text.escapeHTML(percent) + ")</li>");
										}
										i++;
									}
								}
							}

							detailsHTML = '';
							for (let key of ['abilities', 'items', 'moves', 'spreads', 'teammates']) {
								detailsHTML += '<details>' +
									'<summary style="font-size: 14px"><strong>' + Text.escapeHTML(this.mlt(key)) + '</strong></summary>' +
									'<ul>' + htmlData[key] + '</ul>' +
									'</details>';
							}
						}
					}

					// Build html box

					let html = '<table>' +
						// First row
						'<tr><td style="text-align:center; border-right: solid 1px black; padding: 12px;"><b>' + Text.escapeHTML(dataRes.name) + '</b></td>' +
						'<td style="padding: 12px;"><b>#' +
						Text.escapeHTML(dataRes.pos + "") + "</b> " + Text.escapeHTML(this.mlt('in')) +
						" <b>" + Text.escapeHTML(tierName(tier, App)) + "</b>. " +
						"(" + Text.escapeHTML(this.mlt(ladder)) + ", <i>&gt;" + Text.escapeHTML(ladderType + "") + " ELO</i>) | " +
						Text.escapeHTML(this.mlt('pokeusage')) + ": <b>" + Text.escapeHTML(dataRes.usage) + "</b>" +
						(dataRes.fraction ? (dataRes.fraction > 1 ? (" (" + Text.escapeHTML(this.mlt("aprox")) + " 1 " + Text.escapeHTML(this.mlt("of")) + " " + Text.escapeHTML(dataRes.fraction + "") + " " + Text.escapeHTML(this.mlt("teams")) + ")") : (" (" + Text.escapeHTML(this.mlt("allteams")) + ")")) : "") +
						'</td></tr>' +
						// Second row
						'<tr>' +
						// Image
						'<td style="text-align:center; border-right: solid 1px black; padding: 12px;"><img src="https://play.pokemonshowdown.com/sprites/gen5/' + toSpriteId(dataRes.name) + '.png" height="96" width="96" alt="' + Text.escapeHTML(dataRes.name) + '"></td>' +
						// Details
						'<td style="padding: 12px;">' +
						detailsHTML +
						'<p><b>' + this.mlt('source') + ': </b><a href="' + Text.escapeHTML(link) + '">' + Text.escapeHTML(link) + '</a></p>' +
						'</td>' +
						'</tr>' +
						'</table>';

					return this.send("/addhtmlbox " + html, this.room);
				}.bind(this), UsageFailureCache); // End fetch usage data
			}.bind(this), UsageFailureCache); // End fetch usage
		}.bind(this));
	},
};
