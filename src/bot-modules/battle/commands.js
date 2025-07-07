/**
 * Commands File
 *
 * chall: bot sends a challenge to an arbitrary user
 * cancelchallenge: cancels an active challenge
 * searchbattle: searches a ladder battle and returns the link
 * jointour: joins tournament
 * leavetour: leaves tournament
 * evalbattle: runs arbitrary javascript in a battle context
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

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

module.exports = {
	chall: "challenge",
	challenge: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('chall', this.room)) return this.replyAccessDenied('chall');
		let mod = App.modules.battle.system;
		let user = Text.toId(this.args[0]) || this.byIdent.id;
		if (user === "me") {
			user = this.byIdent.id;
		}
		const formatString = this.args.slice(1).join(",");
		const format = parseAliases(formatString.split("@@@")[0], App);
		const customRules = (formatString.split("@@@")[1] || "").split(",").map(function (a) {
			return a.trim();
		}).filter(function (a) {
			return !!a;
		});
		if (!user || !format) {
			return this.errorReply(this.usage({ desc: this.usageTrans('user') }, { desc: this.mlt('format') }));
		}
		if (!App.bot.formats[format] || !App.bot.formats[format].chall) {
			return this.errorReply(this.mlt(0) + ' ' + Chat.italics(format) + ' ' + this.mlt(1));
		}
		if (App.bot.formats[format].team && !mod.TeamBuilder.hasTeam(format)) {
			return this.errorReply(this.mlt(2) + ' ' + Chat.italics(format));
		}
		if (mod.ChallManager.challenges && mod.ChallManager.challenges.challengeTo) {
			return this.errorReply(this.mlt(6) + ' ' + mod.ChallManager.challenges.challengeTo.to +
				'. ' + this.mlt(7) + ' ' + Chat.code(this.token + 'cancelchallenge') + ' ' + this.mlt(8));
		}
		let cmds = [];
		let team = mod.TeamBuilder.getTeam(format);
		if (team) {
			cmds.push('|/utm ' + team);
		} else {
			cmds.push('|/utm null');
		}
		cmds.push('|/challenge ' + user + ", " + format + (customRules.length > 0 ? ("@@@" + customRules.join(",")) : ""));

		mod.ChallManager.onAcceptedChallenge = function (battle) {
			this.reply(this.mlt(13) + ": <<" + battle + ">>");
		}.bind(this);

		mod.ChallManager.onRejectedChallenge = function () {
			this.reply(this.mlt(14) + " " + user + ".");
		}.bind(this);

		this.send(cmds);
		App.logCommandAction(this);
		this.reply(this.mlt(10) + " " + user + "...");
	},

	cancelchallenge: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('chall', this.room)) return this.replyAccessDenied('chall');
		let mod = App.modules.battle.system;
		mod.ChallManager.onAcceptedChallenge = null;
		mod.ChallManager.onRejectedChallenge = null;
		if (mod.ChallManager.challenges && mod.ChallManager.challenges.challengeTo) {
			this.send('|/cancelchallenge ' + mod.ChallManager.challenges.challengeTo.to);
			App.logCommandAction(this);
			this.reply(this.mlt(11));
		} else {
			this.errorReply(this.mlt(9));
		}
	},

	searchbattle: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('searchbattle', this.room)) return this.replyAccessDenied('searchbattle');
		let mod = App.modules.battle.system;
		let format = parseAliases(this.arg, App);
		if (!format) return this.errorReply(this.usage({ desc: 'format' }));
		if (!App.bot.formats[format] || !App.bot.formats[format].ladder) {
			return this.errorReply(this.mlt(0) + ' ' + Chat.italics(format) + ' ' + this.mlt(5));
		}
		if (App.bot.formats[format].team && !mod.TeamBuilder.hasTeam(format)) {
			return this.errorReply(this.mlt(2) + ' ' + Chat.italics(format));
		}
		if (this.room) {
			mod.LadderManager.reportsRoom = this.room;
		} else {
			mod.LadderManager.reportsRoom = ',' + this.byIdent.id;
		}
		let cmds = [];
		let team = mod.TeamBuilder.getTeam(format);
		if (team) {
			cmds.push('|/utm ' + team);
		} else {
			cmds.push('|/utm null');
		}
		cmds.push('|/search ' + format);
		this.send(cmds);
		App.logCommandAction(this);
		this.reply(this.mlt(12));
	},

	jointour: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('jointour', this.room)) return this.replyAccessDenied('jointour');
		let mod = App.modules.battle.system;

		if (!this.room || this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}

		if (!mod.TourManager.tourData[this.room]) {
			return this.errorReply(this.mlt('notour'));
		}

		mod.TourManager.tourData[this.room].mustLeave = false;

		this.reply("/tour join");
	},

	leavetour: function (App) {
		this.setLangFile(Lang_File);
		if (!this.can('jointour', this.room)) return this.replyAccessDenied('jointour');
		let mod = App.modules.battle.system;

		if (!this.room || this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}

		if (!mod.TourManager.tourData[this.room]) {
			return this.errorReply(this.mlt('notour'));
		}

		mod.TourManager.tourData[this.room].mustLeave = true;

		this.reply("/tour leave");
	},

	evalbattle: function (App) {
		this.setLangFile(Lang_File);
		if (!App.config.debug) return;
		if (App.env.staticmode) return;
		if (!this.isExcepted()) return;
		if (!this.arg) return this.errorReply(this.usage({ desc: 'script' }));
		if (App.modules.battle.system.BattleBot.battles[this.room]) {
			try {
				let result = App.modules.battle.system.BattleBot.battles[this.room].evalBattle(this.arg);
				this.reply('' + JSON.stringify(result));
			} catch (err) {
				this.reply("Error: " + err.code + " - " + err.message);
			}
		}
	},
};
