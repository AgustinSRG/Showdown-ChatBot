/**
 * Commands File
 *
 * tour: creates a tournament easier than using Showdown commands
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Chat = Tools('chat');
const Inexact = Tools('inexact-pokemon');

const Lang_File = Path.resolve(__dirname, 'commands.translations');
const TourTypes = { "elimination": 1, "roundrobin": 1 };

function parseAliases(format, App) {
	const Config = App.config.modules.tourcmd;
	format = Text.toId(format);
	if (App.bot.formats[format]) return format;
	try {
		let aliases = App.data.getAliases();
		if (aliases[format]) format = Text.toId(aliases[format]);
	} catch (err) {
		App.log("Could not fetch aliases. ERROR: " + err.message);
	}
	if (App.bot.formats[format]) return format;
	let aliases = Config.aliases;
	if (aliases[format]) format = Text.toId(aliases[format]);
	return Text.toFormatStandard(format);
}

module.exports = {
	newtour: 'tour',
	tour: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('tour', this.room)) return this.replyAccessDenied('tour');
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
			};
			let splArg;
			for (let i = 0; i < args.length; i++) {
				args[i] = args[i].trim();
				if (!args[i]) continue;
				splArg = args[i].split("=");
				if (i > 0 && splArg.length < 2 && Text.toId(args[i]) in TourTypes) {
					params.type = args[i];
				} else if (splArg.length < 2) {
					switch (i) {
						case 0:
							params.format = args[i];
							break;
						case 1:
							params.timeToStart = args[i];
							break;
						case 2:
							params.autodq = args[i];
							break;
						case 3:
							params.maxUsers = args[i];
							break;
						case 4:
							params.type = args[i];
							break;
					}
				} else {
					let idArg = Text.toId(splArg[0]);
					let valueArg = splArg[1].trim();
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
						default:
							return this.reply(this.mlt('param') + ' ' + idArg + ' ' +
								this.mlt('paramhelp') + ": tier, autostart, dq, users, type, scout, timer");
					}
				}
			}
			if (params.format) {
				let format = parseAliases(params.format, App);
				if (!App.bot.formats[format]) {
					let inexact = Inexact.safeResolve(App, format, { formats: 1, others: 0 });
					return this.reply(this.mlt('e31') + ' "' + format + '" ' + this.mlt('e33') +
						(inexact ? (". " + this.mlt('inexact') + " " + Chat.italics(inexact) + "?") : ""));
				}
				if (!App.bot.formats[format].chall || App.bot.formats[format].disableTournaments) {
					return this.reply(this.mlt('e31') + ' ' + Chat.italics(App.bot.formats[format].name) +
						' ' + this.mlt('e32'));
				}
				details.format = format;
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
			if (params.maxUsers) {
				if (Text.toId(params.maxUsers) === 'off' || Text.toId(params.maxUsers) === 'infinite') {
					details.maxUsers = null;
				} else {
					let musers = parseInt(params.maxUsers);
					if (!musers || musers < 4) return this.reply(this.mlt('e6'));
					details.maxUsers = musers;
				}
			}
			if (params.type) {
				let type = Text.toId(params.type);
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
		}
		Mod.newTour(this.room, details);
	},
};
