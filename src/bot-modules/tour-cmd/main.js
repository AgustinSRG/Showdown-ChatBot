/**
 * Bot Module: Tour Command
 */

'use strict';

const Path = require('path');
const Translator = Tools('translate');
const Tournament = require(Path.resolve(__dirname, 'tournament.js'));

const translator = new Translator(Path.resolve(__dirname, 'errors.translations'));

exports.setup = function (App) {
	if (!App.config.modules.tourcmd) {
		App.config.modules.tourcmd = {
			format: 'randombattle',
			type: 'elimination',
			maxUsers: 0,
			time: (30 * 1000),
			autodq: 2,
			scoutProtect: false,
			createMessage: '',
			aliases: {},
		};
	}

	class TourCommandModule {
		constructor() {
			this.tourData = {};
			this.tournaments = {};
		}

		newTour(room, details) {
			if (this.tournaments[room]) {
				if (this.tournaments[room].startTimer) clearTimeout(this.tournaments[room].startTimer);
				delete this.tournaments[room];
			}
			this.tournaments[room] = new Tournament(App, room, details);
			this.tournaments[room].create();
		}
	}

	const TourCommandMod = new TourCommandModule();
	const tourData = TourCommandMod.tourData;
	const tournaments = TourCommandMod.tournaments;

	const Error_Open = '<div class="message-error">';
	const Error_Close = '</div>';

	function getLanguage(room) {
		return App.config.language.rooms[room] || App.config.language['default'];
	}

	function parseErrorMessage(room, spl) {
		if (!tournaments[room] || tourData[room]) return;
		let msg = spl.splice(1).join('|');
		if (msg.substr(0, Error_Open.length) === Error_Open) {
			msg = msg.substr(Error_Open.length, msg.length - (Error_Open.length + Error_Close.length));
			/* Specific error messages, may be updated frecuently */
			if (msg === "Tournaments are disabled in this room (" + room + ").") {
				App.bot.sendTo(room, translator.get(0, getLanguage(room)));
			} else if (msg === "&#x2f;tournament - Access denied.") {
				App.bot.sendTo(room, translator.get(1, getLanguage(room)));
			} else if (msg === "The server is restarting soon, so a tournament cannot be created.") {
				App.bot.sendTo(room, translator.get(2, getLanguage(room)));
			} else {
				return;
			}
			if (tournaments[room].startTimer) clearTimeout(tournaments[room].startTimer);
			delete tournaments[room];
			delete tourData[room];
		}
	}

	App.bot.on('line', (room, line, spl, isIntro) => {
		if (isIntro) return;
		if (spl[0] === 'html') return parseErrorMessage(room, spl);
		if (spl[0] !== 'tournament') return;
		if (!tourData[room]) tourData[room] = {};
		switch (spl[1]) {
		case 'create':
			if (!tournaments[room]) break;
			tournaments[room].startTimeout();
			break;
		case 'join':
			if (!tournaments[room]) break;
			tournaments[room].users++;
			tournaments[room].checkUsers();
			break;
		case 'leave':
			if (!tournaments[room]) break;
			tournaments[room].users--;
			tournaments[room].checkUsers();
			break;
		case 'start':
			if (!tournaments[room]) break;
			if (tournaments[room].signups) {
				tournaments[room].signups = false;
				clearTimeout(tournaments[room].startTimer);
				tournaments[room].setAutodq();
			}
			break;
		case 'update':
			try {
				let data = JSON.parse(spl[2]);
				for (let i in data) {
					tourData[room][i] = data[i];
				}
			} catch (e) {}
			break;
		case 'updateEnd':
			if (!tournaments[room]) break;
			if (tournaments[room].started && !tourData[room].isStarted) {
				tournaments[room].start();
			}
			break;
		case 'end':
		case 'forceend':
			delete tourData[room];
			if (tournaments[room] && tournaments[room].startTimer) clearTimeout(tournaments[room].startTimer);
			if (tournaments[room]) delete tournaments[room];
			break;
		}
	});

	App.bot.on('disconnect', () => {
		for (let room in tourData) {
			delete tourData[room];
		}
		for (let room in tournaments) {
			if (tournaments[room].startTimer) clearTimeout(tournaments[room].startTimer);
			delete tournaments[room];
		}
	});

	return TourCommandMod;
};
