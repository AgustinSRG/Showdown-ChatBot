/**
 * Bot Module: Moderation
 */

'use strict';

const Path = require('path');
const ModeratorBot = require(Path.resolve(__dirname, 'moderator-bot.js')).ModeratorBot;

exports.setup = function (App) {
	class ModerationModule {
		constructor() {
			this.db = App.dam.getDataBase('moderation.json');
			let data = this.data = this.db.data;
			if (!data.punishments) {
				data.punishments = ['warn', 'mute', 'hourmute', 'roomban'];
			}

			if (!data.values) {
				data.values = Object.create(null);
			}

			if (!data.settings) {
				data.settings = Object.create(null);
			}

			if (!data.roomSettings) {
				data.roomSettings = Object.create(null);
			}

			if (!data.modexception) {
				data.modexception = {
					global: 'driver',
					rooms: {},
				};
			}

			if (!data.rulesLink) {
				data.rulesLink = Object.create(null);
			}

			if (!data.bannedWords) {
				data.bannedWords = Object.create(null);
			}

			if (!data.zeroTolerance) {
				data.zeroTolerance = Object.create(null);
			}

			if (!data.enableZeroTol) {
				data.enableZeroTol = Object.create(null);
			}

			if (!data.serversWhitelist) {
				data.serversWhitelist = ['sim', 'showdown', 'smogtours'];
			}

			this.modBot = new ModeratorBot(App, Path.resolve(__dirname, 'filters/'));
		}
	}

	const ModerationMod = new ModerationModule();

	App.bot.on('userchat', (room, time, by, msg) => {
		if (!App.bot.rooms[room] || App.bot.rooms[room].type !== 'chat') return;
		if (msg.substr(0, 5) === "/log ") {
			ModerationMod.modBot.parseRaw(room, msg.substr(5));
			ModerationMod.modBot.doHideText(room, msg.substr(5));
		} else if (msg.substr(0, 5) !== "/raw ") {
			ModerationMod.modBot.parse(room, time, by, msg);
		}
	});

	App.bot.on('chat', (room, time, msg) => {
		if (!App.bot.rooms[room] || App.bot.rooms[room].type !== 'chat') return;
		if (msg.substr(0, 5) === "/log ") {
			ModerationMod.modBot.doHideText(room, msg.substr(5));
		}
	});

	App.bot.on('line', (room, line, spl, isIntro) => {
		if (isIntro) return;
		if (!App.bot.rooms[room] || App.bot.rooms[room].type !== 'chat') return;
		if (!ModerationMod.data.enableZeroTol[room]) return;
		if (line.charAt(0) !== '|') ModerationMod.modBot.parseRaw(room, line);
	});

	App.server.setPermission('moderation', 'Permission for changing moderation configuration');

	return ModerationMod;
};
