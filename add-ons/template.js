// Add-on template for Showdown-ChatBot
// ------------------------------------
// You can use this file as a template to develop your add-on
// This template includes all the available options,
// make sure to delete what you do not need before installation

'use strict';

/* Add here all tools you need (https://github.com/AgustinSRG/Showdown-ChatBot/wiki/Basic-Development-Guide#tools) */
const Text = Tools('text'); // eslint-disable-line no-unused-vars

/* Setup function: Called on add-on installation */
exports.setup = function (App) {
	return Tools('add-on').forApp(App).install({
		/* Add-on Commands (https://github.com/AgustinSRG/Showdown-ChatBot/wiki/Basic-Development-Guide#commands) */
		commandsOverwrite: true,
		commands: {
			"examplealias": "examplecommand",
			"examplecommand": function () {
				this.reply("Hello world!");
			},
		},

		/* Commands permissions */
		commandPermissionsOverwrite: true,
		commandPermissions: {
			/**
			 * Groups: user, voice, driver, mod, owner, admin
			 * You can also use symbols: +, %, @, #, &
			 * For only excepted users, use: {excepted: true}
			 */
			"examplepermission": { group: 'mod' },
		},

		/* Command triggers */
		commandTriggersOverwrite: true,
		commandTriggers: {
			/* Triggers called before running the command */
			before: {
				"exampletriggerbefore": function (context) {
					/* If this function returns true, the command is not executed */
				},
			},
			/* Triggers called after running the command */
			after: {
				"exampletriggerafter": function (context) {
					// Do stuff
				},
			},
		},

		/* Bot events (https://github.com/AgustinSRG/Showdown-ChatBot/wiki/Basic-Development-Guide#bot-events) */
		events: {
			"connect": function () {
				console.log("Bot connected to the server!");
			},
		},

		/* Control panel options (https://github.com/AgustinSRG/Showdown-ChatBot/wiki/Basic-Development-Guide#server-handlers) */
		serverHandlersOverwrite: false,
		serverHandlers: {
			"example": function (context, parts) {
				context.endWithWebPage("<h2>Hello world!</h2>", { title: "Example" });
			},
		},

		/* Control panel permissions */
		serverPermissionsOverwrite: false,
		serverPermissions: {
			"example": "Permission description",
		},

		/* Control panel menu */
		serverMenuOptionsOverwrite: false,
		serverMenuOptions: {
			"example": { name: "Example", url: "/example/", permission: "example", level: -1 },
		},

		/* Custom install script (Called on add-on installation) */
		customInstall: function () {
			// Do stuff
		},

		/* Custom uninstall script  (Called on add-on removal) */
		customUninstall: function () {
			// Do stuff
		},
	});
};
