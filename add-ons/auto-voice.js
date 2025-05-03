// Automated promotion feature for Showdown ChatBot
// Install as an Add-On for Showdown-ChatBot
// -----------------------------------
// Make sure to change the following constants:
// - Rooms: List of rooms where the feature is applied

'use strict';

const Rooms = ['freevoice']; // Here the rooms where this feature is available

const Promotion_Command = "/roomvoice %s";

const Util = require('util');
const Text = Tools('text');

exports.setup = function (App) {
	return Tools('add-on').forApp(App).install({
		events: {
			"userjoin": function (room, by) {
				if (Rooms.indexOf(room) >= 0) {
					let ident = Text.parseUserIdent(by);
					if (!App.parser.equalOrHigherGroup(ident, 'voice')) {
						App.bot.sendTo(room, Util.format(Promotion_Command, ident.id));
					}
				}
			},
		},
	});
};