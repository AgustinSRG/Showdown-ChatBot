/**
 * Challenges Manager
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'commands.translations');

exports.setup = function (App) {
	const Config = App.config.modules.battle;

	function getLanguage(room) {
		return App.config.language.rooms[room] || App.config.language['default'];
	}

	const ChallManager = Object.create(null);
	ChallManager.challenges = Object.create(null);

	function canChallenge(i, nBattles) {
		if (Config.maxBattles > nBattles) return true;

		// Custom exceptions
		let mod = App.modules.battle.system;
		for (let ex in mod.challengeExceptions) {
			try {
				let res = mod.challengeExceptions[ex](i, nBattles);

				if (res) {
					return true;
				}
			} catch (e) {
				App.reportCrash(e);
			}
		}

		// Check default permission
		let ident = Text.parseUserIdent(" " + Text.toId(i));
		if (App.parser.can(ident, 'chall')) return true;
		return false;
	}

	function canUseCustomRules(i) {
		let ident = Text.parseUserIdent(" " + Text.toId(i));
		if (App.parser.can(ident, 'chall')) return true;
		return false;
	}

	ChallManager.onAcceptedChallenge = null;
	ChallManager.onRejectedChallenge = null;

	ChallManager.parsePMSent = function (to, message) {
		if (message.indexOf("/challenge") === 0) {
			const challData = message.substr("/challenge".length);
			if (challData) {
				const format = Text.toId(challData.split("|")[0]);

				this.challenges.challengeTo = {
					to: to,
					format: format,
				};
			} else {
				this.challenges.challengeTo = null;
			}
		}
	};

	ChallManager.parsePM = function (from, message) {
		// Parse invites
		let mod = App.modules.battle.system;
		if (message.indexOf("/text") === 0 || message.indexOf("/nonotify") === 0 || message.indexOf("/log") === 0) {
			message = message.replace(/&[a-z0-9]+;/gi, '');
			message = message.replace(/<a[^>]*>/i, "<<");
			message = message.replace("</a>", ">>");

			if ((/^.+\srejected\sthe\schallenge\.$/i).test(message)) {
				if (this.onRejectedChallenge) {
					try {
						this.onRejectedChallenge();
					} catch (ex) { }
				}
				this.onAcceptedChallenge = null;
				this.onRejectedChallenge = null;
			} else if ((/^\/[a-z]+\s(.+)\saccepted\sthe\schallenge,\sstarting\s<<(.+)>>$/i).test(message)) {
				const parts = (/^\/[a-z]+\s(.+)\saccepted\sthe\schallenge,\sstarting\s<<(.+)>>$/i).exec(message);

				if (parts && parts[1] && parts[2]) {
					if (this.onAcceptedChallenge) {
						try {
							this.onAcceptedChallenge(Text.toRoomid(parts[2]));
						} catch (ex) { }
					}
					this.onAcceptedChallenge = null;
					this.onRejectedChallenge = null;
				}
			} else if ((/^\/[a-z]+\s(.+)\saccepted\sthe\schallenge,\sstarting\s<<(.+)>>$/i).test(message)) {
				const parts = (/^\/[a-z]+\s(.+)\saccepted\sthe\schallenge,\sstarting\s<<(.+)>>$/i).exec(message);

				if (parts && parts[1] && parts[2]) {
					if (this.onAcceptedChallenge) {
						try {
							this.onAcceptedChallenge(Text.toRoomid(parts[2]));
						} catch (ex) { }
					}
					this.onAcceptedChallenge = null;
					this.onRejectedChallenge = null;
				}
			}
		} else if (message.indexOf("/challenge") === 0) {
			const challData = message.substr("/challenge".length);
			if (challData) {
				const format = Text.toId((challData.split("|")[0] + "").split("@@@")[0]);
				const hasCustomRules = !!((challData.split("|")[0] + "").split("@@@")[1]);
				let nBattles = Object.keys(mod.BattleBot.battles).length;

				let cmds = [];

				if (canChallenge(from, nBattles)) {
					if (!(format in App.bot.formats) || !App.bot.formats[format].chall) {
						cmds.push('/reject ' + from);
						App.bot.sendTo('', cmds);
						return;
					}
					if (hasCustomRules && App.bot.formats[format].team && !canUseCustomRules(from)) {
						cmds.push('/reject ' + from);
						cmds.push('/pm ' + from + "," + App.multilang.mlt(Lang_File, getLanguage("default"), "customrules") + ': ' + Chat.italics(App.bot.formats[format].name));
						App.bot.sendTo('', cmds);
						return;
					}
					if (App.bot.formats[format].team && !mod.TeamBuilder.hasTeam(format)) {
						cmds.push('/reject ' + from);
						cmds.push('/pm ' + from + "," + App.multilang.mlt(Lang_File, getLanguage("default"), 2) + ' ' + Chat.italics(App.bot.formats[format].name));
						App.bot.sendTo('', cmds);
						return;
					}

					let team = mod.TeamBuilder.getTeam(format);
					if (team) {
						cmds.push('/utm ' + team);
					} else {
						cmds.push('/utm null');
					}
					cmds.push('/accept ' + from);
				} else {
					cmds.push('/reject ' + from);
					cmds.push('/pm ' + from + "," + App.multilang.mlt(Lang_File, getLanguage("default"), "busy").replace("#BN", "" + nBattles));
				}
				if (cmds.length > 0) {
					App.bot.sendTo('', cmds);
				}
			} else {
				if (this.challenges.challengesFrom && this.challenges.challengesFrom[from]) {
					delete this.challenges.challengesFrom[from];
				}
				if (this.challenges.challengeTo && this.challenges.challengeTo.to === from) {
					this.challenges.challengeTo = null;
				}
			}
		}
	};

	ChallManager.clean = function () {
		ChallManager.challenges = Object.create(null);
		ChallManager.onAcceptedChallenge = null;
		ChallManager.onRejectedChallenge = null;
	};

	return ChallManager;
};
