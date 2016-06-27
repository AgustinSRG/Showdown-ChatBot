/*
 * Bot Module: Tour Command
 */

'use strict';

const Path = require('path');

const Tournament = require(Path.resolve(__dirname, 'tournament.js'));

const tourData = exports.tourData = {};
const tournaments = exports.tournaments = {};

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

exports.newTour = function (room, details) {
	if (tournaments[room]) {
		if (tournaments[room].startTimer) clearTimeout(tournaments[room].startTimer);
		delete tournaments[room];
	}
	tournaments[room] = new Tournament(room, details);
	tournaments[room].create();
};

App.bot.on('line', (room, line, spl, isIntro) => {
	if (spl[0] !== 'tournament') return;
	if (isIntro) return;
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
			tournaments[room].startTour();
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

require(Path.resolve(__dirname, 'server-handler.js'));
