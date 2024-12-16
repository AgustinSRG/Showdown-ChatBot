/**
 * Commands File
 *
 * tour: creates a tournament easier than using Showdown commands
 * tourlog: Gets a register of the must recent tournaments
 * tourpollset: Configures the sets for the tournament polls
 * tourcustomformat: Configures custom formats for tournaments
 * tourformatalias: Configures format aliases
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Chat = Tools('chat');
const Inexact = Tools('inexact-pokemon');

const Lang_File = Path.resolve(__dirname, 'commands.translations');
const TourTypes = { "elimination": 1, "roundrobin": 1, "rr": 1, "elim": 1 };

function parseAliases(format, App) {
	const Config = App.config.modules.tourcmd;
	format = Text.toId(format);
	if (App.bot.formats[format]) return format;
	for (let gen = 9; gen > 0; gen--) {
		if (App.bot.formats["gen" + gen + format]) return "gen" + gen + format;
	}
	let aliases = Config.aliases;
	if (aliases[format]) format = Text.toId(aliases[format]);
	if (App.bot.formats[format]) return format;
	try {
		let aliases = App.data.getAliases();
		if (aliases[format]) format = Text.toId(aliases[format]);
	} catch (err) {
		App.log("Could not fetch aliases. ERROR: " + err.message);
	}
	if (App.bot.formats[format]) return format;
	return Text.toFormatStandard(format);
}

function botCanHtml(room, App) {
	let roomData = App.bot.rooms[room];
	let botid = Text.toId(App.bot.getBotNick());
	return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'bot'));
}

const MAX_POOL_OPTIONS = 10;

module.exports = {
	newtour: 'tour',
	tour: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('tour', this.room)) return this.replyAccessDenied('tour');
		if (!this.arg) {
			return this.errorReply(this.usage(
				{ desc: this.mlt('formatorpoll') },
				{ desc: 'type=' + 'elim|rr|double-elim|double-rr', optional: true },
				{ desc: 'auto-start=' + this.mlt('autostart'), optional: true },
				{ desc: 'dq=' + this.mlt('autodq'), optional: true },
				{ desc: 'users=' + this.mlt('maxusers'), optional: true },
				{ desc: 'rounds=' + this.mlt('rounds'), optional: true },
				{ desc: 'name=' + this.mlt('name'), optional: true },
				{ desc: 'rules=' + this.mlt('rules'), optional: true },
				{ desc: 'poll-options=' + this.mlt('polloptions'), optional: true },
				{ desc: 'poll-time=' + this.mlt('polltime'), optional: true }
			));
		}
		const Mod = App.modules.tourcmd.system;
		const Config = App.config.modules.tourcmd;
		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}
		if (Mod.tourData[this.room]) {
			if (Text.toId(this.arg) === 'start' && !Mod.tourData[this.room].isStarted) {
				return this.send('/tournament start', this.room);
			}
			return this.errorReply(this.mlt('e2'));
		}
		let details = {
			format: Config.format,
			type: Config.type,
			maxUsers: Config.maxUsers || null,
			timeToStart: Config.time,
			autodq: Config.autodq,
			scoutProtect: Config.scoutProtect,
			forcedTimer: Config.forcedTimer,
			rounds: null,
			rules: null,
			name: null,
			isPoll: false,
			pollSet: "",
			pollTime: Config.pollTime || 3,
			pollMaxOptions: Config.pollMaxOptions || 4,
		};
		if (this.arg && this.arg.length) {
			let args = this.args;
			let params = {
				format: null,
				type: null,
				maxUsers: null,
				timeToStart: null,
				autodq: null,
				scout: null,
				timer: null,
				rules: "",
				name: null,
				pollTime: null,
				pollMaxOptions: null,
			};
			let splArg;
			let isRules = false;
			for (let i = 0; i < args.length; i++) {
				args[i] = args[i].trim();
				if (!args[i]) continue;
				splArg = args[i].split("=");
				if (i > 0 && isRules && splArg.length < 2) {
					params.rules += "," + args[i];
				} else if (i > 0 && splArg.length < 2 && Text.toId(args[i]) in TourTypes) {
					params.type = args[i];
					isRules = false;
				} else if (splArg.length < 2) {
					switch (i) {
						case 0:
							params.format = args[i];
							break;
						case 1:
							params.type = args[i];
							break;
						case 2:
							params.timeToStart = args[i];
							break;
						case 3:
							params.autodq = args[i];
							break;
						case 4:
							params.maxUsers = args[i];
							break;
					}
				} else {
					let idArg = Text.toId(splArg[0]);
					let valueArg = splArg.slice(1).join("=").trim();
					switch (idArg) {
						case 'format':
						case 'tier':
							params.format = valueArg;
							break;
						case 'singups':
						case 'start':
						case 'autostart':
							params.timeToStart = valueArg;
							break;
						case 'autodq':
						case 'dq':
							params.autodq = valueArg;
							break;
						case 'maxusers':
						case 'users':
							params.maxUsers = valueArg;
							break;
						case 'rounds':
							params.rounds = valueArg;
							break;
						case 'generator':
						case 'type':
							params.type = valueArg;
							break;
						case 'scouting':
						case 'scout':
						case 'setscout':
						case 'setscouting':
							params.scout = valueArg;
							break;
						case 'timer':
						case 'forcetimer':
							params.timer = valueArg;
							break;
						case 'name':
							params.name = valueArg;
							break;
						case 'rule':
						case 'rules':
						case 'customrules':
							if (params.rules) {
								params.rules += ',' + valueArg;
							} else {
								params.rules = valueArg;
							}
							isRules = true;
							break;
						case "polltime":
							params.pollTime = valueArg;
							break;
						case "options":
						case "polloptions":
						case "pollmaxoptions":
							params.pollMaxOptions = valueArg;
							break;
						default:
							if (isRules) {
								if (params.rules) {
									params.rules += ',' + args[i];
								} else {
									params.rules = args[i];
								}
							} else {
								return this.reply(this.mlt('param') + ' ' + idArg + ' ' +
									this.mlt('paramhelp') + ": tier, autostart, dq, users, rounds, type, scout, timer, name, rules, poll-options, poll-time");
							}
					}
				}
			}
			if (params.format) {
				const formatTrim = (params.format + "").trim().toLowerCase().replace(/\s/g, "");

				if (formatTrim === "poll" || formatTrim.startsWith("poll(")) {
					// Is a pool
					details.isPoll = true;
					details.pollSet = Text.toId(formatTrim.substring("poll(".length));
				} else {
					let formatOptions = (params.format + "").split("|").filter(a => {
						return !!(a.trim());
					});
					if (formatOptions.length > 0) {
						const parsedFormats = [];
						for (let formatOption of formatOptions) {
							const customFormat = Mod.findCustomFormat(formatOption);

							if (customFormat) {
								if (!App.bot.formats[customFormat.format] || App.bot.formats[customFormat.format].disableTournaments) {
									return this.reply(this.mlt('e31') + ' ' + Chat.italics(customFormat.format) +
										' ' + this.mlt('e32'));
								}

								parsedFormats.push({ name: customFormat.name, format: customFormat.format, rules: customFormat.rules });
							} else {
								let format = parseAliases(formatOption, App);
								if (!App.bot.formats[format]) {
									let inexact = Inexact.safeResolve(App, format, { formats: 1, others: 0 }, Mod.getExtraFormats());

									if (inexact) {
										return this.reply(this.mlt('e31') + ' "' + format + '" ' + this.mlt('e33') +
											(inexact ? (". " + this.mlt('inexact') + " " + Chat.italics(inexact) + "?") : ""));
									}

									inexact = Inexact.safeResolve(App, Text.toId(formatOption), { formats: 1, others: 0 }, Mod.getExtraFormats());

									return this.reply(this.mlt('e31') + ' "' + Text.toId(formatOption) + '" ' + this.mlt('e33') +
										(inexact ? (". " + this.mlt('inexact') + " " + Chat.italics(inexact) + "?") : ""));
								}
								if (App.bot.formats[format].disableTournaments) {
									return this.reply(this.mlt('e31') + ' ' + Chat.italics(App.bot.formats[format].name) +
										' ' + this.mlt('e32'));
								}

								parsedFormats.push({ format: format });
							}
						}

						const chosenFormat = parsedFormats[Math.floor(Math.random() * parsedFormats.length)];

						details.format = chosenFormat.format;

						if (chosenFormat.name) {
							details.name = chosenFormat.name;
						}

						if (chosenFormat.rules && chosenFormat.rules.length > 0) {
							details.rules = chosenFormat.rules.join(",");
						}
					}
				}
			}
			if (params.timeToStart) {
				if (Text.toId(params.timeToStart) === 'off' || Text.toId(params.timeToStart) === 'infinite') {
					details.timeToStart = null;
				} else {
					let time = parseFloat(params.timeToStart);
					if (!time || time < 0.1) return this.reply(this.mlt('e4'));
					details.timeToStart = Math.floor(time * 60) * 1000;
				}
			}
			if (params.autodq) {
				if (Text.toId(params.autodq) === 'off') {
					details.autodq = false;
				} else {
					let dq = parseFloat(params.autodq);
					if (!dq || dq < 0) return this.reply(this.mlt('e5'));
					details.autodq = dq;
				}
			}
			if (params.pollTime) {
				let pollTime = parseFloat(params.pollTime);
				if (!pollTime || pollTime < 0) return this.reply(this.mlt('e9'));
				details.pollTime = pollTime;
			}
			if (params.pollMaxOptions) {
				let maxOptions = parseInt(params.pollMaxOptions);
				if (!maxOptions || maxOptions < 2 || maxOptions > MAX_POOL_OPTIONS) return this.reply(this.mlt('e10'));
				details.pollMaxOptions = maxOptions;
			}
			if (params.maxUsers) {
				if (Text.toId(params.maxUsers) === 'off' || Text.toId(params.maxUsers) === 'infinite') {
					details.maxUsers = null;
				} else {
					let musers = parseInt(params.maxUsers);
					if (!musers || musers < 4) return this.reply(this.mlt('e6'));
					details.maxUsers = musers;
				}
			}
			if (params.rounds) {
				if (Text.toId(params.rounds) === 'off') {
					details.rounds = null;
				} else {
					let rounds = parseInt(params.rounds);
					if (!rounds || rounds < 1) {
						rounds = null;
					}
					details.rounds = rounds;
				}
			}
			if (params.type) {
				let type = Text.toId(params.type);
				switch (type) {
					case "doubleelimination":
					case "doubleelim":
					case "de":
						type = "elimination";
						details.rounds = 2;
						break;
					case "doubleroundrobin":
					case "doublerr":
					case "drr":
						type = "roundrobin";
						details.rounds = 2;
						break;
				}
				if (!(type in TourTypes)) {
					return this.reply(this.mlt('e7'));
				}
				details.type = type;
			}
			if (params.scout) {
				let scout = Text.toId(params.scout);
				if (scout in { 'yes': 1, 'on': 1, 'true': 1, 'allow': 1, 'allowed': 1 }) {
					details.scoutProtect = false;
				} else {
					details.scoutProtect = true;
				}
			}
			if (params.timer) {
				let timer = Text.toId(params.timer);
				if (timer in { 'yes': 1, 'on': 1, 'true': 1, 'forced': 1 }) {
					details.forcedTimer = true;
				} else {
					details.forcedTimer = false;
				}
			}
			if (params.name) {
				details.name = params.name;
			}
			if (params.rules) {
				details.rules = params.rules;
			}
		}

		if (details.isPoll) {
			const pollSet = details.pollSet;
			const formatOptions = Mod.getPollSet(pollSet).slice(0, Math.min(details.pollMaxOptions, MAX_POOL_OPTIONS));

			if (formatOptions.length > 0) {
				Mod.setupPoolWait(this.room, details);

				// Prepare command
				return this.send('/poll create ' + this.mlt('polltitle') + "," + formatOptions.join(","), this.room);
			} else {
				return this.reply(this.mlt('e5'));
			}
		}

		Mod.newTour(this.room, details);
	},

	recentrours: "tourlog",
	tourlog: function (App) {
		this.setLangFile(Lang_File);

		const room = this.parseRoomAliases(Text.toRoomid(this.arg)) || this.room;

		if (!room) {
			return this.errorReply(this.usage({ desc: this.usageTrans('room') }));
		}

		if (!App.bot.rooms[room] || App.bot.rooms[room].type !== 'chat') {
			if (!this.arg) {
				return this.errorReply(this.usage({ desc: this.usageTrans('room') }));
			} else {
				return this.errorReply(this.mlt("room") + " '" + room + "' " + this.mlt("nf"));
			}
		}

		let privates = (App.config.modules.core.privaterooms || []);

		if (room !== this.room && privates.indexOf(room) >= 0) {
			// Private room
			return this.errorReply(this.mlt("room") + " '" + room + "' " + this.mlt("nf"));
		}

		const Mod = App.modules.tourcmd.system;
		const log = Mod.getTournamentLog(room);

		if (log.length === 0) {
			return this.errorReply(this.mlt("logempty"));
		}

		const parsedLog = [];

		for (let l of log) {
			let time = Math.max(1, Math.round((Date.now() - l.time) / 1000));

			let times = [];
			let aux;
			/* Get Time difference */
			aux = time % 60; // Seconds
			if (aux > 0 || time === 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(2) : this.mlt(3)));
			time = Math.floor(time / 60);
			aux = time % 60; // Minutes
			if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(4) : this.mlt(5)));
			time = Math.floor(time / 60);
			aux = time % 24; // Hours
			if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt(6) : this.mlt(7)));
			time = Math.floor(time / 24); // Days
			if (time > 0) times.unshift(time + ' ' + (time === 1 ? this.mlt(8) : this.mlt(9)));

			parsedLog.push({
				timeStr: (this.mlt("agob") + " " + times.join(', ') + " " + this.mlt("ago")).trim(),
				winner: l.winner,
				generator: l.generator,
				format: l.format,
			});
		}

		if (this.can('tourlog', this.room) && botCanHtml(this.room, App)) {
			// HTML

			let html = '';

			html += '<h3 style="text-align:center;">' + Text.escapeHTML(this.mlt('rtours') + " " + this.parser.getRoomTitle(room)) + '</h3>';

			html += '<div style="overflow: auto; height: 120px; width: 100%;">';

			html += '<table border="1" cellspacing="0" cellpadding="3" style="min-width:100%;">';

			html += '<tr>';
			html += '<th>' + Text.escapeHTML(this.mlt("format")) + '</th>';
			html += '<th>' + Text.escapeHTML(this.mlt("type")) + '</th>';
			html += '<th>' + Text.escapeHTML(this.mlt("winner")) + '</th>';
			html += '<th>' + Text.escapeHTML(this.mlt("finish")) + '</th>';
			html += '</tr>';

			for (let l of parsedLog) {
				html += '<tr>';

				html += '<td><b>' + Text.escapeHTML(l.format) + '</b></td>';

				html += '<td>' + Text.escapeHTML(l.generator) + '</td>';

				html += '<td>' + Text.escapeHTML(l.winner) + '</td>';

				html += '<td>' + Text.escapeHTML(l.timeStr) + '</td>';

				html += '</tr>';
			}

			html += '</table>';

			html += '</div>';

			this.send("/addhtmlbox " + html, this.room);
		} else {
			// !code

			let txt = this.mlt('rtours') + " " + this.parser.getRoomTitle(room) + ":\n\n";

			for (let l of parsedLog) {
				txt += "  - " + l.timeStr + " / " + this.mlt("format") + ": " + l.format + " / " + this.mlt("type") + ": " + l.generator + " / " + this.mlt("winner") + ": " + l.winner + "\n";
			}

			this.restrictReply("!code " + txt, 'tourlog');
		}
	},

	tourpollset: function (App) {
		this.setLangFile(Lang_File);

		if (!this.can('tourpollset', this.room)) return this.replyAccessDenied('tourpollset');

		const Config = App.config.modules.tourcmd;
		const Mod = App.modules.tourcmd.system;

		const subCommand = Text.toId(this.args[0] || "");

		switch (subCommand) {
			case "list":
				{
					const sets = Object.values(Config.pollSets);

					let text = "" + this.mlt("setlist") + ":\n\n";

					for (let s of sets) {
						text += s.name + ": " + (s.formats || []).join(", ") + "\n";
					}

					text += "All: [" + this.mlt("setlistall") + "]\n";
					text += "Random: [" + this.mlt("setlistrandom") + "]\n";
					text += "Team: [" + this.mlt("setlistteam") + "]\n";

					this.replyCommand("!code " + text);
				}
				break;
			case "add":
			case "set":
				{
					if (this.args.length < 4) {
						return this.errorReply(this.usage({ desc: 'add' }, { desc: this.mlt('name') }, { desc: this.mlt('format') }, { desc: this.mlt('format') }, { desc: "...", optional: true }));
					}

					const name = (this.args[1] + "").trim();
					const id = Text.toId(name);

					if (!id) {
						return this.errorReply(this.usage({ desc: 'add' }, { desc: this.mlt('name') }, { desc: this.mlt('format') }, { desc: this.mlt('format') }, { desc: "...", optional: true }));
					}

					const formats = [];

					for (let i = 2; i < this.args.length; i++) {
						let format = Text.toId(this.args[i]);

						const customFormat = Mod.findCustomFormat(format);

						if (customFormat) {
							format = customFormat.name || format;
						} else {
							format = parseAliases(Text.toId(format), App);

							const formatData = App.bot.formats[format];

							if (!formatData) {
								return this.errorReply(this.mlt('e31') + ' ' + Chat.italics(format) +
									' ' + this.mlt('e32'));
							}

							if (!formatData.chall || formatData.disableTournaments) {
								return this.errorReply(this.mlt('e31') + ' ' + Chat.italics(formatData.name) +
									' ' + this.mlt('e32'));
							}

							format = formatData.name;
						}

						formats.push(format);
					}

					Config.pollSets[id] = {
						name: name,
						formats: formats,
					};

					App.db.write();

					this.addToSecurityLog();

					this.reply(this.mlt('setok1') + " " + Chat.italics(name) + " " + this.mlt("setok2"));
				}
				break;
			case "delete":
			case "del":
			case "remove":
			case "rm":
				{
					if (this.args.length !== 2) {
						return this.errorReply(this.usage({ desc: 'delete' }, { desc: this.mlt('name') }));
					}

					const name = (this.args[1] + "").trim();
					const id = Text.toId(name);

					if (!id) {
						return this.errorReply(this.usage({ desc: 'delete' }, { desc: this.mlt('name') }));
					}

					if (!Config.pollSets[id]) {
						return this.errorReply(this.mlt('setnotfound'));
					}

					delete Config.pollSets[id];

					App.db.write();

					this.addToSecurityLog();

					this.reply(this.mlt('delok1') + " " + Chat.italics(name) + " " + this.mlt("delok2"));
				}
				break;
			default:
				return this.errorReply(this.usage({ desc: 'list | add | delete' }));
		}
	},

	tourcustomformat: function (App) {
		this.setLangFile(Lang_File);

		if (!this.can('tourcustomformat', this.room)) return this.replyAccessDenied('tourcustomformat');

		const Config = App.config.modules.tourcmd;

		const subCommand = Text.toId(this.args[0] || "");

		switch (subCommand) {
			case "list":
				{
					const formats = Object.values(Config.customFormats);

					if (formats.length === 0) {
						return this.errorReply(this.mlt("customformatlistempty"));
					}

					let text = "" + this.mlt("customformatlist") + ":\n\n";

					for (let f of formats) {
						const formatName = App.bot.formats[f.format] ? App.bot.formats[f.format].name : f.format;

						text += f.name + " = " + formatName + " {" + (f.rules || []).join(", ") + "}\n";
					}

					this.replyCommand("!code " + text);
				}
				break;
			case "add":
			case "set":
				{
					if (this.args.length < 3) {
						return this.errorReply(this.usage({ desc: 'add' }, { desc: this.mlt('name') }, { desc: this.mlt('format') }, { desc: this.mlt('rule'), optional: true }, { desc: "...", optional: true }));
					}

					const name = (this.args[1] + "").trim();
					const id = Text.toId(name);

					if (!id) {
						return this.errorReply(this.usage({ desc: 'add' }, { desc: this.mlt('name') }, { desc: this.mlt('format') }, { desc: this.mlt('rule'), optional: true }, { desc: "...", optional: true }));
					}

					if (App.bot.formats[id]) {
						return this.errorReply(this.mlt('e31') + ' ' + Chat.italics(id) +
							' ' + this.mlt('e34'));
					}

					const format = Text.toId(parseAliases(Text.toId(this.args[2]), App));

					const formatData = App.bot.formats[format];

					if (!formatData) {
						return this.errorReply(this.mlt('e31') + ' ' + Chat.italics(format) +
							' ' + this.mlt('e32'));
					}

					if (!formatData.chall || formatData.disableTournaments) {
						return this.errorReply(this.mlt('e31') + ' ' + Chat.italics(formatData.name) +
							' ' + this.mlt('e32'));
					}

					const rules = [];

					for (let i = 3; i < this.args.length; i++) {
						const rule = (this.args[i] + "").trim();
						rules.push(rule);
					}

					Config.customFormats[id] = {
						name: name,
						format: format,
						rules: rules,
					};

					App.db.write();

					this.addToSecurityLog();

					this.reply(this.mlt('formatsetok1') + " " + Chat.italics(name) + " " + this.mlt("formatsetok2"));
				}
				break;
			case "delete":
			case "del":
			case "remove":
			case "rm":
				{
					if (this.args.length !== 2) {
						return this.errorReply(this.usage({ desc: 'delete' }, { desc: this.mlt('name') }));
					}

					const name = (this.args[1] + "").trim();
					const id = Text.toId(name);

					if (!id) {
						return this.errorReply(this.usage({ desc: 'delete' }, { desc: this.mlt('name') }));
					}

					if (!Config.customFormats[id]) {
						return this.errorReply(this.mlt('formatnotfound'));
					}

					delete Config.customFormats[id];

					App.db.write();

					this.addToSecurityLog();

					this.reply(this.mlt('formatdelok1') + " " + Chat.italics(name) + " " + this.mlt("formatdelok2"));
				}
				break;
			default:
				return this.errorReply(this.usage({ desc: 'list | add | delete' }));
		}
	},

	tourformatalias: function (App) {
		this.setLangFile(Lang_File);

		if (!this.can('tourformatalias', this.room)) return this.replyAccessDenied('tourformatalias');

		const Config = App.config.modules.tourcmd;
		const Mod = App.modules.tourcmd.system;

		const subCommand = Text.toId(this.args[0] || "");

		switch (subCommand) {
			case "list":
				{
					const aliases = Object.keys(Config.aliases);

					if (aliases.length === 0) {
						return this.errorReply(this.mlt("aliaseslistempty"));
					}

					let text = "" + this.mlt("aliaseslist") + ":\n\n";

					for (let alias of aliases) {
						const formatName = Mod.getFormatName(Config.aliases[alias]);

						text += alias + " = " + formatName + "\n";
					}

					this.replyCommand("!code " + text);
				}
				break;
			case "add":
			case "set":
				{
					if (this.args.length !== 3) {
						return this.errorReply(this.usage({ desc: 'add' }, { desc: this.mlt('alias') }, { desc: this.mlt('format') }));
					}

					const name = (this.args[1] + "").trim();
					const id = Text.toId(name);

					if (!id) {
						return this.errorReply(this.usage({ desc: 'add' }, { desc: this.mlt('alias') }, { desc: this.mlt('format') }));
					}

					let format = Text.toId(this.args[2]);

					const customFormat = Mod.findCustomFormat(format);

					if (customFormat) {
						format = customFormat.name || format;
					} else {
						format = parseAliases(Text.toId(format), App);

						const formatData = App.bot.formats[format];

						if (!formatData) {
							return this.errorReply(this.mlt('e31') + ' ' + Chat.italics(format) +
								' ' + this.mlt('e32'));
						}

						if (!formatData.chall || formatData.disableTournaments) {
							return this.errorReply(this.mlt('e31') + ' ' + Chat.italics(formatData.name) +
								' ' + this.mlt('e32'));
						}

						format = formatData.name;
					}

					Config.aliases[id] = Text.toId(format);

					App.db.write();

					this.addToSecurityLog();

					this.reply(this.mlt('aliassetok1') + " " + Chat.italics(name) + " " + this.mlt("aliassetok2"));
				}
				break;
			case "delete":
			case "del":
			case "remove":
			case "rm":
				{
					if (this.args.length !== 2) {
						return this.errorReply(this.usage({ desc: 'delete' }, { desc: this.mlt('name') }));
					}

					const name = (this.args[1] + "").trim();
					const id = Text.toId(name);

					if (!id) {
						return this.errorReply(this.usage({ desc: 'delete' }, { desc: this.mlt('name') }));
					}

					if (!Config.aliases[id]) {
						return this.errorReply(this.mlt('aliasnotfound'));
					}

					delete Config.aliases[id];

					App.db.write();

					this.addToSecurityLog();

					this.reply(this.mlt('aliasdelok1') + " " + Chat.italics(name) + " " + this.mlt("aliasdelok2"));
				}
				break;
			default:
				return this.errorReply(this.usage({ desc: 'list | add | delete' }));
		}
	}
};
