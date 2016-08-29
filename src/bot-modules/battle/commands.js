/**
 * Commands File
 */

'use strict';

const Path = require('path');
const Util = require('util');
const Translator = Tools.get('translate.js');
const Text = Tools.get('text.js');

const translator = new Translator(Path.resolve(__dirname, 'commands.translations'));

App.parser.addPermission('searchbattle', {group: 'admin'});

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

module.exports = {
	chall: function () {
		if (!this.can('chall', this.room)) return this.replyAccessDenied('chall');
		let mod = App.modules.battle.system;
		let user = Text.toId(this.args[0]) || this.byIdent.id;
		let format = parseAliases(this.args[1]);
		let teamId = Text.toId(this.args[2]);
		if (!user || !format) {
			return this.errorReply(this.usage({desc: this.usageTrans('user')}, {desc: translator.get('format', this.lang)},
				{desc: translator.get('team', this.lang), optional: true}));
		}
		if (!App.bot.formats[format] || !App.bot.formats[format].chall) {
			return this.errorReply(translator.get(0, this.lang) + ' __' + format + '__ ' + translator.get(1, this.lang));
		}
		if (!teamId && App.bot.formats[format].team && !mod.TeamBuilder.hasTeam(format)) {
			return this.errorReply(translator.get(2, this.lang) + ' __' + format + '__');
		}
		if (mod.ChallManager.challenges && mod.ChallManager.challenges.challengeTo) {
			return this.errorReply(translator.get(6, this.lang) + ' ' + mod.ChallManager.challenges.challengeTo.to +
				'. ' + translator.get(7, this.lang) + ' ``' + this.token + 'cancelchallenge`` ' + translator.get(8, this.lang));
		}
		let cmds = [];
		if (teamId) {
			let team = mod.TeamBuilder.dynTeams[teamId];
			if (team) {
				cmds.push('|/useteam ' + team.packed);
			} else {
				return this.errorReply(translator.get(3, this.lang) + " __" + teamId + "__ " + translator.get(4, this.lang));
			}
		} else {
			let team = mod.TeamBuilder.getTeam(format);
			if (team) {
				cmds.push('|/useteam ' + team);
			}
		}
		cmds.push('|/challenge ' + user + ", " + format);
		this.send(cmds);
		App.logCommandAction(this);
	},

	cancelchallenge: function () {
		if (!this.can('chall', this.room)) return this.replyAccessDenied('chall');
		let mod = App.modules.battle.system;
		if (mod.ChallManager.challenges && mod.ChallManager.challenges.challengeTo) {
			this.send('|/cancelchallenge ' + mod.ChallManager.challenges.challengeTo.to);
			App.logCommandAction(this);
		} else {
			this.errorReply(translator.get(9, this.lang));
		}
	},

	searchbattle: function () {
		if (!this.can('searchbattle', this.room)) return this.replyAccessDenied('searchbattle');
		let mod = App.modules.battle.system;
		let format = parseAliases(this.arg);
		if (!format) return this.errorReply(this.usage({desc: 'format'}));
		if (!App.bot.formats[format] || !App.bot.formats[format].ladder) {
			return this.errorReply(translator.get(0, this.lang) + ' __' + format + '__ ' + translator.get(5, this.lang));
		}
		if (App.bot.formats[format].team && !mod.TeamBuilder.hasTeam(format)) {
			return this.errorReply(translator.get(2, this.lang) + ' __' + format + '__');
		}
		if (this.room) {
			mod.LadderManager.reportsRoom = this.room;
		} else {
			mod.LadderManager.reportsRoom = ',' + this.byIdent.id;
		}
		let cmds = [];
		let team = mod.TeamBuilder.getTeam(format);
		if (team) {
			cmds.push('|/useteam ' + team);
		}
		cmds.push('|/search ' + format);
		this.send(cmds);
		App.logCommandAction(this);
	},

	evalbattle: function () {
		if (!App.config.debug) return;
		if (!this.isExcepted()) return;
		if (!this.arg) return this.errorReply(this.usage({desc: 'script'}));
		if (App.modules.battle.system.BattleBot.battles[this.room]) {
			try {
				let result = App.modules.battle.system.BattleBot.battles[this.room].evalBattle(this.arg);
				this.reply(JSON.stringify(result));
			} catch (err) {
				this.reply(Util.inspect(err));
			}
		}
	},
};
