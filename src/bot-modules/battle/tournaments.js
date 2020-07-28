/**
 * Tournaments parser
 */

'use strict';

const ACTION_INTERVAL = 2000;

const Text = Tools('text');

exports.setup = function (App) {
	const TournamentsManager = {};
	const tourData = TournamentsManager.tourData = {};
	const lastAction = TournamentsManager.lastAction = {};

	const Config = App.config.modules.battle;

	const canSendCommands = TournamentsManager.canSendCommands = function (room) {
		let res = true;
		if (lastAction[room] && Date.now() - lastAction[room] < ACTION_INTERVAL) res = false;
		lastAction[room] = Date.now();
		return res;
	};

	TournamentsManager.clearData = function () {
		for (let i in tourData) {
			delete tourData[i];
		}
	};

	TournamentsManager.lastRejection = 0;
	TournamentsManager.lastChallenges = {};
	TournamentsManager.lastChallenged = {};
	TournamentsManager.reportRejection = function () {
		this.lastRejection = Date.now();
	};


	TournamentsManager.check = function () {
		for (let room of Object.keys(tourData)) {
			this.checkChallenges(room);
		}
	};

	setInterval(TournamentsManager.check.bind(TournamentsManager), 2000);

	TournamentsManager.checkChallenges = function (room) {
		let mod = App.modules.battle.system;
		let cmds = [];
		if (Config.joinTours && Config.joinTours[room] && tourData[room].format && !tourData[room].isJoined && !tourData[room].isStarted) {
			let format = Text.toId(tourData[room].teambuilderFormat || tourData[room].format);
			if (App.bot.formats[format] && !App.bot.formats[format].team) {
				if (canSendCommands(room)) {
					cmds.push('/tour join');
				}
			} else {
				if (mod.TeamBuilder.hasTeam(tourData[room].format)) {
					if (canSendCommands(room)) {
						cmds.push('/tour join');
					}
				}
			}
		}
		if (tourData[room].challenges && tourData[room].challenges.length) {
			if (canSendCommands(room)) {
				const lastChallenges = JSON.stringify(tourData[room].challenges);
				if (TournamentsManager.lastChallenges[room] === lastChallenges && Date.now() - TournamentsManager.lastRejection < 5000) {
					tourData[room].isJoined = false;
					return App.bot.sendTo(room, ['/tour leave']);
				}
				let format = Text.toId(tourData[room].teambuilderFormat || tourData[room].format);
				let team = mod.TeamBuilder.getTeam(format);
				if (team) {
					cmds.push('/useteam ' + team);
					for (let i = 0; i < tourData[room].challenges.length; i++) {
						cmds.push('/tour challenge ' + tourData[room].challenges[i]);
					}
				} else {
					if (App.bot.formats[format] && !App.bot.formats[format].team) {
						for (let i = 0; i < tourData[room].challenges.length; i++) {
							cmds.push('/tour challenge ' + tourData[room].challenges[i]);
						}
					} else {
						// No team (deleted?)
						tourData[room].isJoined = false;
						cmds.push('/tour leave');
					}
				}
				TournamentsManager.lastChallenges[room] = lastChallenges;
			}
		} else if (tourData[room].challenged) {
			if (canSendCommands(room)) {
				const lastChallenged = JSON.stringify(tourData[room].challenged);
				if (TournamentsManager.lastChallenged[room] === lastChallenged && Date.now() - TournamentsManager.lastRejection < 5000) {
					tourData[room].isJoined = false;
					return App.bot.sendTo(room, ['/tour leave']);
				}
				let format = Text.toId(tourData[room].teambuilderFormat || tourData[room].format);
				let team = mod.TeamBuilder.getTeam(format);
				if (team) {
					cmds.push('/useteam ' + team);
					cmds.push('/tour acceptchallenge');
				} else {
					if (App.bot.formats[format] && !App.bot.formats[format].team) {
						cmds.push('/tour acceptchallenge');
					} else {
						// No team (deleted?)
						tourData[room].isJoined = false;
						cmds.push('/tour leave');
					}
				}
				TournamentsManager.lastChallenged[room] = lastChallenged;
			}
		}
		if (cmds.length > 0) {
			App.bot.sendTo(room, cmds);
		}
	};

	TournamentsManager.parse = function (room, message, isIntro, spl) {
		if (spl[0] !== 'tournament') return;
		if (!tourData[room]) tourData[room] = {};
		switch (spl[1]) {
			case "leave":
			case "disqualify":
				{
					if (Text.toId(spl[2]) === Text.toId(App.bot.getBotNick())) {
						tourData[room].isJoined = false;
					}
				}
				break;
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
				if (!tourData[room].teambuilderFormat) {
					tourData[room].teambuilderFormat = tourData[room].format;
				}
				this.checkChallenges(room);
				break;
			case 'end':
			case 'forceend':
				delete tourData[room];
				delete TournamentsManager.lastChallenges[room];
				delete TournamentsManager.lastChallenged[room];
				break;
		}
	};

	return TournamentsManager;
};
