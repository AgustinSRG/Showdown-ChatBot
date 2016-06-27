/**
 * Commands File
 */

'use strict';

const Path = require('path');
const Translator = Tools.get('translate.js');
const Text = Tools.get('text.js');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));

App.parser.addPermission('tour', {group: 'mod'});

function parseAliases(format) {
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
	return format;
}

module.exports = {
	newtour: 'tour',
	tour: function () {
		if (!this.can('tour')) return this.replyAccessDenied('tour');
		const Mod = App.modules.tourcmd.system;
		const Config = App.config.modules.tourcmd;
		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(translator.get('nochat', this.lang));
		}
		if (Mod.tourData[this.room]) {
			if (Text.toId(this.arg) === 'end') {
				return this.reply('/tournament end');
			}
			if (Text.toId(this.arg) === 'start' && !Mod.tourData[this.room].isStarted) {
				return this.reply('/tournament start');
			}
			return this.errorReply(translator.get('e2', this.lang));
		}
		let details = {
			format: Config.format,
			type: Config.type,
			maxUsers: Config.maxUsers || null,
			timeToStart: Config.time,
			autodq: Config.autodq,
			scoutProtect: Config.scoutProtect,
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
			};
			let splArg;
			for (let i = 0; i < args.length; i++) {
				args[i] = args[i].trim();
				if (!args[i]) continue;
				splArg = args[i].split("=");
				if (splArg.length < 2) {
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
					case 'time':
					case 'singups':
					case 'timer':
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
					default:
						return this.reply(translator.get('param', this.lang) + ' ' + idArg + ' ' +
								translator.get('paramhelp', this.lang) + ": tier, timer, dq, users, type, scout");
					}
				}
			}
			if (params.format) {
				let format = parseAliases(params.format);
				if (!App.bot.formats[format] || !App.bot.formats[format].chall || App.bot.formats[format].disableTournaments) {
					return this.reply(translator.get('e31', this.lang) + ' ' + format + ' ' + translator.get('e32', this.lang));
				}
				details.format = format;
			}
			if (params.timeToStart) {
				if (Text.toId(params.timeToStart) === 'off' || Text.toId(params.timeToStart) === 'infinite') {
					details.timeToStart = null;
				} else {
					let time = parseInt(params.timeToStart);
					if (!time || time < 10) return this.reply(translator.get('e4', this.lang));
					details.timeToStart = time * 1000;
				}
			}
			if (params.autodq) {
				if (Text.toId(params.autodq) === 'off') {
					details.autodq = false;
				} else {
					let dq = parseFloat(params.autodq);
					if (!dq || dq < 0) return this.reply(translator.get('e5', this.lang));
					details.autodq = dq;
				}
			}
			if (params.maxUsers) {
				if (Text.toId(params.maxUsers) === 'off' || Text.toId(params.maxUsers) === 'infinite') {
					details.maxUsers = null;
				} else {
					let musers = parseInt(params.maxUsers);
					if (!musers || musers < 4) return this.reply(translator.get('e6', this.lang));
					details.maxUsers = musers;
				}
			}
			if (params.type) {
				let type = Text.toId(params.type);
				if (type !== 'elimination' && type !== 'roundrobin') {
					return this.reply(translator.get('e7', this.lang));
				}
				details.type = type;
			}
			if (params.scout) {
				let scout = Text.toId(params.scout);
				if (scout in {'yes': 1, 'on': 1, 'true': 1, 'allow': 1, 'allowed': 1}) {
					details.scoutProtect = false;
				} else {
					details.scoutProtect = true;
				}
			}
		}
		Mod.newTour(this.room, details);
	},
};
