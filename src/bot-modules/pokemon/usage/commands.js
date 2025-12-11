/**
 * Commands file
 *
 * usage: gets usage for a Pokemon and a tier (via Smogon)
 * usagedata: gets usage for moves, items... (via Smogon)
 * usagetop: gets the list of top used Pokemon (via Smogon)
 */

'use strict';

const Path = require('path');

const Text = Tools('text');
const Chat = Tools('chat');
const Cache = Tools('cache').BufferCache;

const UsageFailureCache = new Cache(20, 2 * 60 * 60 * 1000);

const Lang_File = Path.resolve(__dirname, 'commands.translations');

const USAGE_FAQ_URL = "https://www.smogon.com/forums/threads/gen-9-smogon-university-usage-statistics-discussion-thread.3711767/";

/* Usage utils */

function toSpriteId(str) {
	const id = ('' + str).replace(/[^a-zA-Z0-9-]+/g, '').toLowerCase();
	const parts = id.split("-");
	if (["wo-chien", "chien-pao", "ting-lu", "chi-yu"].includes(id)) {
		return parts.join("");
	} else {
		return parts[0] + (parts.length > 1 ? ("-" + parts.slice(1).join("")) : "");
	}
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
	for (let gen = 9; gen > 0; gen--) {
		if (App.bot.formats["gen" + gen + format]) return "gen" + gen + format;
	}
	try {
		let psAliases = App.data.getAliases();
		if (psAliases[format]) format = Text.toId(psAliases[format]);
	} catch (e) { }
	if (App.bot.formats[format]) return format;
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

function getPsPokeIcon(name) {
	name = Text.toId(name);

	if (name === "other" || name === "nothing") {
		return "";
	}

	return '<psicon pokemon="' + Text.escapeHTML(name) + '"/> ';
}

function getPsItemIcon(name) {
	name = Text.toId(name);

	if (name === "other" || name === "nothing") {
		return "";
	}

	return '<psicon item="' + Text.escapeHTML(name) + '"/> ';
}

function getPsTypeIcon(name) {
	const id = Text.toId(name);

	if (id === "other" || id === "nothing") {
		return "";
	}

	name = (name || "").trim();

	return '<img src="https://play.pokemonshowdown.com/sprites/types/' +
		Text.escapeHTML(name) + '.png" alt="' + Text.escapeHTML(name) + '" height="14" width="32"> ';
}

function getPsCategoryIcon(name) {
	name = (name || "").trim();

	return '<img src="https://play.pokemonshowdown.com/sprites/categories/' +
		Text.escapeHTML(name) + '.png" alt="' + Text.escapeHTML(name) + '" height="14" width="32"> ';
}

function getMoveIcons(name, App) {
	const id = Text.toId(name);
	const movedex = App.data.getMoves();

	const move = movedex[id];

	if (!move) {
		return "";
	}

	let res = '';

	if (move.type) {
		res += getPsTypeIcon(move.type + "");
	}

	if (move.category) {
		res += getPsCategoryIcon(move.category + "");
	}

	return res;
}

const Low_Ladder_RD = 0;
const Mid_Ladder_RD = 1500;
const High_Ladder_RD = 1630;
const High_Ladder_RD_EX = 1695;
const Top_Ladder_RD = 1760;
const Top_Ladder_RD_EX = 1825;

const Rank_Exceptions = Object.create(null);

const Valid_ladder_Types = ['top', 'high', 'mid', 'low'];

function getLadderType(ladderName) {
	switch (ladderName) {
		case "top":
		case "topladder":
		case "laddertop":
			return "top";
		case "high":
		case "highladder":
		case "ladderhigh":
			return "high";
		case "mid":
		case "midladder":
		case "laddermid":
			return "mid";
		case "low":
		case "lowladder":
		case "ladderlow":
			return "low";
		default:
			return "invalid";
	}
}

function getLadderRD(ladder, ex) {
	switch (ladder) {
		case "top":
			return (ex ? Top_Ladder_RD_EX : Top_Ladder_RD);
		case "high":
			return (ex ? High_Ladder_RD_EX : High_Ladder_RD);
		case "mid":
			return Mid_Ladder_RD;
		default:
			return Low_Ladder_RD;
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
			this.restrictReply(this.mlt('stats') + ": " + link + " | FAQ: " + USAGE_FAQ_URL, 'usage');
		}.bind(this));
	},

	usage: function (App) {
		this.setLangFile(Lang_File);
		getUsageLink(App, function (link) {
			if (!link) {
				return this.errorReply(this.mlt('error'));
			}
			if (!this.arg) {
				return this.restrictReply(
					this.mlt('stats') + ": " + link +
					" | " +
					this.usage({ desc: 'pokemon' }, { desc: 'tier', optional: true }, { desc: 'ladder (top|high|mid|low)', optional: true }),
					'usage'
				);
			}

			if (this.args.length === 1 || (this.args.length === 2 && Valid_ladder_Types.includes(getLadderType(Text.toId(this.args[1]))))) {
				const possibleTier = parseAliases(this.args[0], App);
				if (App.bot.formats[possibleTier]) {
					this.cmd = "usagetop";
					this.parser.exec(this);
					return;
				}
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
				ladder = getLadderType(args[2]);
				if (Valid_ladder_Types.indexOf(ladder) === -1) {
					return this.errorReply(this.usage({ desc: 'pokemon' }, { desc: 'tier', optional: true }, { desc: 'ladder (top|high|mid|low)', optional: true }));
				}
			}
			if (!poke || !tier) return this.errorReply(this.usage({ desc: 'pokemon' }, { desc: 'tier', optional: true }, { desc: 'ladder (top|high|mid|low)', optional: true }));
			if (this.usageRankExceptionFlag || Rank_Exceptions[tier]) {
				ladderType = getLadderRD(ladder, true);
			} else {
				ladderType = getLadderRD(ladder, false);
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
							tierName(tier, App) + "\" " + this.mlt('tiererr3') +
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
							this.mlt('pokeerr2') + " " + tierName(tier, App) + " (" + this.mlt(ladder) + ", __" + ladderType + " RD__)");
					} else {
						return this.restrictReply(this.mlt('pokeerr1') + " \"" + poke + "\" " +
							this.mlt('pokeerr2') + " " + tierName(tier, App) +
							' | ' + Chat.bold(dataResAux.name) + ", #" + dataResAux.pos + " " + this.mlt('in') +
							" " + Chat.bold(tierName(tier, App)) + " (" + this.mlt(ladder) + ", __" + ladderType + " RD__). " + this.mlt('pokeusage') + ": " + Chat.bold(dataResAux.usage) + "" +
							(dataResAux.fraction ? (dataResAux.fraction > 1 ? (" (" + this.mlt("aprox") + " 1 " + this.mlt("of") + " " + dataResAux.fraction + " " + this.mlt("teams") + ")") : (" (" + this.mlt("allteams") + ")")) : "") +
							". " + this.mlt("usagesuggestion") + " " + Chat.code(this.token + 'usagedata ' + dataResAux.name + ", " + tierName(tier, App) + (ladder !== 'high' ? (", " + ladder) : "")), 'usage');
					}
				}
				this.restrictReply(Chat.bold(dataRes.name) + ", #" + dataRes.pos + " " + this.mlt('in') +
					" " + Chat.bold(tierName(tier, App)) + " (" + this.mlt(ladder) + ", __" + ladderType + " RD__). " + this.mlt('pokeusage') + ": " + Chat.bold(dataRes.usage) + "" +
					(dataRes.fraction ? (dataRes.fraction > 1 ? (" (" + this.mlt("aprox") + " 1 " + this.mlt("of") + " " + dataRes.fraction + " " + this.mlt("teams") + ")") : (" (" + this.mlt("allteams") + ")")) : "") +
					". " + this.mlt("usagesuggestion") + " " + Chat.code(this.token + 'usagedata ' + dataRes.name + ", " + tierName(tier, App) + (ladder !== 'high' ? (", " + ladder) : "")), 'usage');
			}.bind(this), UsageFailureCache);
		}.bind(this));
	},

	usagetop: function (App) {
		this.setLangFile(Lang_File);
		getUsageLink(App, function (link) {
			if (!link) {
				return this.errorReply(this.mlt('error'));
			}
			if (!this.arg) {
				return this.errorReply(this.usage({ desc: 'tier' }, { desc: 'ladder (top|high|mid|low)', optional: true }));
			}
			let tier = App.config.modules.pokemon.gtier || parseAliases('ou', App);
			let ladder = 'high';
			if (this.room && App.config.modules.pokemon.roomtier && App.config.modules.pokemon.roomtier[this.room]) {
				tier = App.config.modules.pokemon.roomtier[this.room];
			}
			let ladderType = 0;
			let args = this.args;
			for (let i = 0; i < args.length; i++) args[i] = Text.toId(args[i]);
			if (args[0]) {
				tier = parseAliases(args[0], App);
			}
			if (args[1]) {
				ladder = getLadderType(args[1]);
				if (Valid_ladder_Types.indexOf(ladder) === -1) {
					return this.errorReply(this.usage({ desc: 'tier' }, { desc: 'ladder (top|high|mid|low)', optional: true }));
				}
			}
			if (!tier) return this.errorReply(this.usage({ desc: 'tier' }, { desc: 'ladder (top|high|mid|low)', optional: true }));
			if (this.usageRankExceptionFlag || Rank_Exceptions[tier]) {
				ladderType = getLadderRD(ladder, true);
			} else {
				ladderType = getLadderRD(ladder, false);
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
							tierName(tier, App) + "\" " + this.mlt('tiererr3') +
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
				const topPokes = [];

				for (let i = 5; i < lines.length && i < 15; i++) {
					let line = lines[i].split("|");
					if (line.length < 7) continue;

					let pos = parseInt(line[1].trim());
					let name = line[2].trim();
					let usage = line[3].trim();

					topPokes.push({
						pos,
						name,
						usage,
					});
				}

				let html = '';

				html += '<div style="overflow: auto; height: 180px; width: 100%;">';

				html += '<p style="margin: 4px 0;">' + Text.escapeHTML(this.mlt('topuse')) + " " + Text.escapeHTML(this.mlt('in')) +
					" <b>" + Text.escapeHTML(tierName(tier, App)) + "</b> (" +
					Text.escapeHTML(this.mlt(ladder)) + ", <i>" + Text.escapeHTML(ladderType) + ' RD</i>):</p>';

				html += '<table border="1" cellspacing="0" cellpadding="3">';

				html += '<tr><th>#</th><th>' + Text.escapeHTML(this.mlt('poke')) + '</th><th>' + Text.escapeHTML(this.mlt('pokeusage')) + '</th></tr>';

				for (let poke of topPokes) {
					html += '<tr>';

					html += '<td><b>' + Text.escapeHTML(poke.pos) + '</b></td>';

					html += '<td>' + getPsPokeIcon(poke.name) + '<b>' + Text.escapeHTML(poke.name) + '</b></td>';

					html += '<td>' + Text.escapeHTML(poke.usage) + '</td>';

					html += '</tr>';
				}

				html += '</table>';

				html += '<p><b>' + this.mlt('source') + ': </b><a href="' + Text.escapeHTML(url) + '">' + Text.escapeHTML(url) + '</a> | <a href="' + USAGE_FAQ_URL + '">FAQ</a></p>';

				html += '</div>';

				const textAlternative = "!code " + this.mlt('topuse') + " " + this.mlt('in') +
					" " + tierName(tier, App) + " (" + this.mlt(ladder) + ", " + ladderType + " RD):\n\n" +
					topPokes.map(p => "#" + p.pos + " " + p.name + " (" + p.usage + ")").join("\n") +
					"\n\n" + url;

				this.htmlRestrictReply(html, 'usage', textAlternative);
			}.bind(this), UsageFailureCache);
		}.bind(this));
	},

	ud: "usagedata",
	uc: "usagedata",
	usagecard: "usagedata",
	usagedata: function (App) {
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
				ladder = getLadderType(args[2]);
				if (Valid_ladder_Types.indexOf(ladder) === -1) {
					return this.errorReply(this.usage({ desc: 'pokemon' }, { desc: 'tier', optional: true }, { desc: 'ladder (top|high|mid|low)', optional: true }));
				}
			}
			if (!poke || !tier) return this.errorReply(this.usage({ desc: 'pokemon' }, { desc: 'tier', optional: true }));
			if (this.usageRankExceptionFlag || Rank_Exceptions[tier]) {
				ladderType = getLadderRD(ladder, true);
			} else {
				ladderType = getLadderRD(ladder, false);
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
							tierName(tier, App) + "\" " + this.mlt('tiererr3') +
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
							this.mlt('pokeerr2') + " " + tierName(tier, App) + " " + " (" + this.mlt(ladder) + ", __" + ladderType + " RD__)");
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
					let detailsText = this.mlt('nodetails');

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
								"teratypes": "",
							};

							const textData = {
								"abilities": "",
								"items": "",
								"moves": "",
								"spreads": "",
								"teammates": "",
								"teratypes": "",
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
										case 'teratypes':
											htmlKey = 'teratypes';
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

											let icon = "";

											switch (htmlKey) {
												case "moves":
													icon = getMoveIcons(auxRes, App);
													break;
												case "items":
													icon = getPsItemIcon(auxRes);
													break;
												case "teammates":
													icon = getPsPokeIcon(auxRes);
													break;
												case "teratypes":
													icon = getPsTypeIcon(auxRes);
													break;
											}

											htmlData[htmlKey] += ("<li>" + icon + "<b>" + Text.escapeHTML(auxRes) + "</b> (" + Text.escapeHTML(percent) + ")</li>");
											textData[htmlKey] += (" - " + auxRes + " (" + percent + ")\n");
										}
										i++;
									}
								}
							}

							detailsHTML = '';
							detailsText = '';
							for (let key of ['abilities', 'items', 'moves', 'spreads', 'teratypes', 'teammates']) {
								if (!htmlData[key]) {
									continue;
								}

								detailsHTML += '<details>' +
									'<summary style="font-size: 14px"><strong>' + Text.escapeHTML(this.mlt(key)) + '</strong></summary>' +
									'<ul>' + htmlData[key] + '</ul>' +
									'</details>';
								detailsText += this.mlt(key) + ':\n\n' + textData[key] + "\n";
							}
						}
					}

					// Build html box

					let usageBaseLineHtml = '<b>#' +
						Text.escapeHTML(dataRes.pos + "") + "</b> " + Text.escapeHTML(this.mlt('in')) +
						" <b>" + Text.escapeHTML(tierName(tier, App)) + "</b>. " +
						"(" + Text.escapeHTML(this.mlt(ladder)) + ", <i>" + Text.escapeHTML(ladderType + "") + " RD</i>) | " +
						Text.escapeHTML(this.mlt('pokeusage')) + ": <b>" + Text.escapeHTML(dataRes.usage) + "</b>" +
						(dataRes.fraction ? (dataRes.fraction > 1 ? (" (" + Text.escapeHTML(this.mlt("aprox")) + " 1 " + Text.escapeHTML(this.mlt("of")) + " " + Text.escapeHTML(dataRes.fraction + "") + " " + Text.escapeHTML(this.mlt("teams")) + ")") : (" (" + Text.escapeHTML(this.mlt("allteams")) + ")")) : "");


					let html;

					if (this.canUseHtmlInRoom('usagedata')) {
						html = '<table style="border-collapse: collapse;">' +
							// First row
							'<tr><td style="text-align:center; border-right: solid 1px #7799BB; padding: 12px;"><b>' + Text.escapeHTML(dataRes.name) + '</b></td>' +
							'<td style="padding: 12px;">' +
							usageBaseLineHtml +
							'</td></tr>' +
							// Second row
							'<tr>' +
							// Image
							'<td style="text-align:center; border-right: solid 1px #7799BB; padding: 12px;"><img src="https://play.pokemonshowdown.com/sprites/gen5/' + toSpriteId(dataRes.name) + '.png" height="96" width="96" alt="' + Text.escapeHTML(dataRes.name) + '"></td>' +
							// Details
							'<td style="padding: 12px;">' +
							detailsHTML +
							'<p><b>' + this.mlt('source') + ': </b><a href="' + Text.escapeHTML(link) + '">' + Text.escapeHTML(link) + '</a> | <a href="' + USAGE_FAQ_URL + '">FAQ</a></p>' +
							'</td>' +
							'</tr>' +
							'</table>';
					} else {
						// Minified version for private messages
						html = '<div style="overflow: auto; height: 180px; width: 100%;">' +
							'<p>' +
							getPsPokeIcon(dataRes.name) +
							'<b>' + Text.escapeHTML(dataRes.name) + '</b>, ' +
							usageBaseLineHtml +
							'</p>' +
							detailsHTML +
							'<p><b>' + this.mlt('source') + ': </b><a href="' + Text.escapeHTML(link) + '">' + Text.escapeHTML(link) + '</a> | <a href="' + USAGE_FAQ_URL + '">FAQ</a></p>' +
							'</div>';
					}

					// Text alternative
					let txt = "!code " + dataRes.name + ", #" + dataRes.pos + " " + this.mlt('in') +
						" " + tierName(tier, App) + " (" + this.mlt(ladder) + ", " + ladderType + " RD). " +
						this.mlt('pokeusage') + ": " + dataRes.usage + "" +
						(dataRes.fraction ? (dataRes.fraction > 1 ? (" (" + this.mlt("aprox") + " 1 " + this.mlt("of") + " " + dataRes.fraction + " " + this.mlt("teams") + ")") : (" (" + this.mlt("allteams") + ")")) : "") +
						"\n\n" + detailsText;

					this.htmlRestrictReply(html, "usagedata", txt);
				}.bind(this), UsageFailureCache); // End fetch usage data
			}.bind(this), UsageFailureCache); // End fetch usage
		}.bind(this));
	},
};
