/**
 * Auto-Response template for Showdown ChatBot
 * Install as an Add-on
 *
 * Edit "autoResponseChat" and "autoResponsePrivateMessage" functions
 * in order to add more automated responses.
 */

'use strict';

const Text = Tools('text');

exports.setup = function (App) {
	/**
	 * Automated response for chat messages
	 * @param {String} room - Chat room ID
	 * @param {Object} user - Object (id, name, group)
	 * @param {String} message - Message received
	 * @param {function} response - function you can call in order to send a response
	 */
	function autoResponseChat(room, user, message, response) {
		// Code here to handle the chat messages responses

		if (App.bot.rooms[room] && App.bot.rooms[room].type === 'battle') {
			// We are in a battle

			if (Text.toId(message).indexOf(Text.toId(App.bot.getBotNick())) >= 0 && (/(hi)|(hello)/gi).test(message)) {
				return response("Hello " + user.name + "!"); // Say hello back
			}

			if (['gl', 'hf', 'good luck', 'have fun'].indexOf(message.toLowerCase().replace(/[^a-z\s]+/g, "")) >= 0) {
				return response("Have fun!"); // Say have fun back in battle
			}
		}
	}

	/**
	 * Automated response for private messages
	 * @param {Object} user - Object (id, name, group)
	 * @param {String} message - Message received
	 * @param {function} response - function you can call in order to send a response
	 */
	function autoResponsePrivateMessage(user, message, response) {
		// Code here to handle the private messages responses
	}

	/* Event handlers */

	function chatHandler(room, time, by, message) {
		autoResponseChat(room, Text.parseUserIdent(by), message, res => {
			App.bot.sendTo(room, res);
		});
	}

	App.bot.on('userchat', chatHandler);

	function privateHandler(from, message) {
		autoResponsePrivateMessage(Text.parseUserIdent(from), message, res => {
			App.bot.pm(from, res);
		});
	}

	App.bot.on('pm', privateHandler);

	exports.destroy = function () {
		App.bot.removeListener('userchat', chatHandler);
		App.bot.removeListener('pm', privateHandler);
	};
};
