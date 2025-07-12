/**
 * Anti-Idle add-on for Showdown ChatBot
 * Install as an Add-on
 */

'use strict';

const ANTI_IDLE_MSG = "This is a test message";
const ANTI_IDLE_INTERVAL = 5 * 60 * 1000; // 5 minutes

exports.setup = function (App) {
	function sendAntiIdleMessage() {
		const botNick = App.bot.getBotNick();
		if (!botNick) {
			return;
		}
		App.bot.pm(botNick, ANTI_IDLE_MSG);
	}

	let antiIdleTimer = setInterval(sendAntiIdleMessage, ANTI_IDLE_INTERVAL);

	exports.destroy = function () {
		clearInterval(antiIdleTimer);
	};
};
