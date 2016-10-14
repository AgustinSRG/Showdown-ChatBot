/**
 * Tournaments parser
 */

'use strict';

const ACTION_INTERVAL = 1500;

const Text = Tools('text');

exports.setup = function (App) {
	const TornamentsManager = {};
	const tourData = TornamentsManager.tourData = {};
	const lastAction = TornamentsManager.lastAction = {};

	const Config = App.config.modules.battle;

	const canSendCommands = TornamentsManager.canSendCommands = function (room) {
		let res = true;
		if (lastAction[room] && Date.now() - lastAction[room] < ACTION_INTERVAL) res = false;
		lastAction[room] = Date.now();
		return res;
	};

	TornamentsManager.clearData = function () {
		for (let i in tourData) {
			delete tourData[i];
		}
	};

	TornamentsManager.parse = function (room, message, isIntro, spl) {
		if (spl[0] !== 'tournament') return;
		if (!tourData[room]) tourData[room] = {};
		let mod = App.modules.battle.system;
		let cmds = [];
		switch (spl[1]) {
		case 'update':
			try {
				let data = JSON.parse(spl[2]);
				for (let i in data) {
					tourData[room][i] = data[i];
				}
			} catch (e) {
				App.reportCrash(e);
			}
			break;
		case 'updateEnd':
			if (Config.joinTours && Config.joinTours[room] && tourData[room].format && !tourData[room].isJoined && !tourData[room].isStarted) {
				let format = Text.toId(tourData[room].format);
				if (App.bot.formats[format] && !App.bot.formats[format].team) {
					cmds.push('/tour join');
				} else {
					if (mod.TeamBuilder.hasTeam(tourData[room].format)) {
						cmds.push('/tour join');
					}
				}
			}
			if (tourData[room].challenges && tourData[room].challenges.length) {
				if (canSendCommands(room)) {
					let team = mod.TeamBuilder.getTeam(tourData[room].format);
					if (team) {
						cmds.push('/useteam ' + team);
					}
					for (let i = 0; i < tourData[room].challenges.length; i++) {
						cmds.push('/tour challenge ' + tourData[room].challenges[i]);
					}
				}
			} else if (tourData[room].challenged) {
				if (canSendCommands(room)) {
					let team = mod.TeamBuilder.getTeam(tourData[room].format);
					if (team) {
						cmds.push('/useteam ' + team);
					}
					cmds.push('/tour acceptchallenge');
				}
			}
			break;
		case 'end':
		case 'forceend':
			delete tourData[room];
			break;
		}
		if (cmds.length > 0) {
			App.bot.sendTo(room, cmds);
		}
	};

	return TornamentsManager;
};
