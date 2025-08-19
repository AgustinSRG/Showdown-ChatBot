// Interactive commands guide add-on for for Showdown-ChatBot
// Spanish version
// ------------------------------------
// WARNING: Version 2.16.1 or greater required!
// ------------------------------------
// This addon turns the help command into an interactive guide.
// Note: The bot needs the global bot rank in the server for this to work
// Note: The bot requires to be in the lobby room for this to work
// This add-on also adds a control panel section 'Commands Guide' to configure the guide.

'use strict';

// Max number of commands per page
const MAX_COMMANDS_PER_PAGE = 10;

// Name of the lobby room
const LOBBY_ROOM = "lobby";

// URL to download the official guide
const COMMANDS_GUIDE_DEFAULT_SOURCE = "https://raw.githubusercontent.com/wiki/AgustinSRG/Showdown-ChatBot/Commands-List-(Spanish)---Lista-de-Comandos.md";

// Auto update sync interval, in milliseconds
const AUTO_UPDATE_SYNC_INTERVAL = 24 * 60 * 60 * 1000;

const Path = require('path');
const HTTPS = require('https');
const Text = Tools('text');
const Chat = Tools('chat');
const DataBase = Tools('json-db');

function prepareModuleName(txt) {
	txt = txt.charAt(0).toUpperCase() + txt.substring(1);

	if (txt.substring(0, 4) === "Del ") {
		txt = txt.substring(4);
	}

	return txt;
}

function wget(url, callback) {
	HTTPS.get(url, response => {
		if (response.statusCode !== 200) {
			if (response.statusCode === 404) {
				return callback(null, new Error("404 - Not found"));
			} else {
				return callback(null, new Error("" + response.statusCode));
			}
		}
		let data = '';
		response.on('data', chunk => {
			data += chunk;
		});
		response.on('end', () => {
			callback(data);
		});
		response.on('error', err => {
			callback(null, err);
		});
	}).on('error', err => {
		callback(null, err);
	});
}

class CommandsGuide {
	constructor(App) {
		this.app = App;
		this.db = new DataBase(Path.resolve(App.confDir, "commands-guide.json"));
		this.data = this.db.data;
		if (!this.data.sections || !Array.isArray(this.data.sections)) {
			// Default guide
			this.data.sections = [];
		}
		this.autoUpdateTimer = null;
	}

	autoUpdate() {
		if (!this.data.autoUpdate) {
			return;
		}
		this.fetchDefaultCommandsGuide(true, (ok, error) => {
			if (ok) {
				this.app.log("[CommandsGuide] Auto-synced with the latest official commands guide.");
			} else if (error) {
				this.app.log("[CommandsGuide] Auto-sync failed: " + error);
			}
		});
	}

	startAutoUpdateTimer() {
		if (this.autoUpdateTimer) {
			clearInterval(this.autoUpdateTimer);
			this.autoUpdateTimer = null;
		}

		this.autoUpdateTimer = setInterval(this.autoUpdate.bind(this), AUTO_UPDATE_SYNC_INTERVAL);
		this.autoUpdate(); // Call autoUpdate on startup
	}

	stopAutoUpdateTimer() {
		if (this.autoUpdateTimer) {
			clearInterval(this.autoUpdateTimer);
			this.autoUpdateTimer = null;
		}
	}

	serializeCommandGuideConfig() {
		let txt = '';

		for (let section of this.data.sections) {
			txt += '[' + section.name + ']\n\n';

			for (let cmd of section.commands) {
				txt += cmd.syntax + "\n";

				if (cmd.description.length > 0) {
					txt += cmd.description.join("\n") + "\n";
				}

				txt += '\n';
			}
		}

		return txt;
	}

	parseCommandGuideConfig(txt) {
		const lines = txt.split("\n");
		const result = [];

		let section = null;
		let command = null;

		for (let line of lines) {
			line = line.trim();

			if (!line) {
				if (section && command) {
					section.commands.push(command);
					command = null;
				}
				continue;
			}

			if (!section || !command) {
				if (line.charAt(0) === '[' && line.charAt(line.length - 1) === ']' && line.length > 2) {
					if (section) {
						result.push(section);
						section = null;
					}

					const sectionName = line.substring(1, line.length - 1);

					if (!sectionName) {
						continue;
					}

					section = {
						name: sectionName,
						commands: [],
					};
					continue;
				}
			}

			if (section) {
				if (command) {
					command.description.push(line);
				} else {
					command = {
						syntax: line,
						description: [],
					};
				}
			}
		}

		if (section) {
			if (command) {
				section.commands.push(command);
			}

			result.push(section);
		}

		return result;
	}

	fetchDefaultCommandsGuide(overwrite, callback) {
		wget(COMMANDS_GUIDE_DEFAULT_SOURCE, (text, err) => {
			if (err) {
				if (callback) {
					return callback(null, "Error: " + err.message);
				} else {
					this.app.reportCrash(err);
					return;
				}
			}

			const lines = text.split("\n");

			const result = [];

			let section = null;
			let command = null;
			let prevLine = "";

			for (let line of lines) {
				line = line.trim();

				if (line.substring(0, 3) === "---" && prevLine) {
					if (section) {
						result.push(section);
						section = null;
					}

					section = {
						name: prepareModuleName(prevLine.replace(/^Módulo\sde\s/i, "").replace(/^Módulo\s/i, "")),
						commands: [],
					};
				} else if (line.charAt(0) === "`" && section) {
					const parts = line.split("|").map(p => p.trim());
					const syntax = parts[0].substring(1, parts[0].length - 1);
					const description = Chat.parseMessage(Text.escapeHTML(parts[1] || ""));
					const permission = (parts[2] || "").split("\\")[0].trim();
					const permissionIsBroadcast = (parts[2] || "").trim().split("\\")[1] === "*";
					const permissionDescLine = Chat.parseMessage(Text.escapeHTML(permission === "-" ? "" : ("Permiso requerido: " + Chat.italics(permission) + (permissionIsBroadcast ? " (para anunciarse)" : ""))));

					section.commands.push({
						syntax: syntax,
						description: [description, permissionDescLine],
					});
				}

				prevLine = line;
			}

			if (section) {
				if (command) {
					section.commands.push(command);
				}

				result.push(section);
			}

			if (overwrite || this.data.sections.length === 0) {
				this.data.sections = result;
				this.save();
			}

			if (callback) {
				return callback("Successfully downloaded default commands guide", null);
			}
		});
	}

	getBotMessageCommand(command) {
		const botId = Text.toId(this.app.bot.getBotNick());
		const botToken = this.app.config.parser.tokens[0] || '.';

		return '/msg ' + botId + ', /botmsg ' + botId + ', ' + botToken + command;
	}

	generateHelpPage(sectionIndex, pageIndex) {
		let html = '<div style="padding: 0.5rem;">';

		// Title

		html += '<div style="text-align: center; padding-bottom: 0.5rem;">';

		if (Chat.usernameColor) {
			html += '<b><span style="color:' + Chat.usernameColor(this.app.bot.getBotNick()) + ';">' + Text.escapeHTML(this.app.bot.getBotNick().substring(1)) + '</span> - Guía de comandos</b>&nbsp;';
		} else {
			html += '<b>' + Text.escapeHTML(this.app.bot.getBotNick().substring(1)) + ' - Guía de comandos</b>&nbsp;';
		}

		html += '<button class="button" name="send" value="' + Text.escapeHTML(this.getBotMessageCommand("help close")) + '">Cerrar guía</button>';

		html += '</div>';

		// Sections menu

		const sections = this.data.sections || [];

		if (sections.length === 0) {
			return "";
		}

		html += '<div style="text-align: center; line-height: 2rem;">';

		for (let i = 0; i < sections.length; i++) {
			if (i > 0) {
				html += '&nbsp;';
			}
			html += '<button class="button' + (i === sectionIndex ? ' disabled' : '') + '"' + (i === sectionIndex ? ' disabled style="border-color: #ffffff;"' : '') + ' name="send" value="' + Text.escapeHTML(this.getBotMessageCommand("help " + i)) + '">' + Text.escapeHTML(sections[i].name) + '</button>';
		}

		html += '</div>';

		const section = sections[sectionIndex];

		if (!section) {
			return "";
		}

		let commands = section.commands || [];
		const totalCommands = commands.length;

		let totalPages = Math.ceil(totalCommands / MAX_COMMANDS_PER_PAGE) || 1;

		pageIndex = Math.min(totalPages - 1, pageIndex);

		commands = commands.slice(pageIndex * MAX_COMMANDS_PER_PAGE, (pageIndex + 1) * MAX_COMMANDS_PER_PAGE);

		// Page menu

		if (totalPages > 1) {
			html += '<p>';

			let pageStart = (pageIndex * MAX_COMMANDS_PER_PAGE) + 1;
			let pageEnd = Math.min(((pageIndex + 1) * MAX_COMMANDS_PER_PAGE), totalCommands);

			html += '<span>Comandos (' + pageStart + ' - ' + pageEnd + ' / ' + totalCommands + '):</span>&nbsp;';

			for (let i = 0; i < totalPages; i++) {
				if (i > 0) {
					html += '&nbsp;';
				}
				html += '<button class="button' + (i === pageIndex ? ' disabled' : '') + '"' + (i === pageIndex ? ' disabled style="border-color: #ffffff;"' : '') + ' name="send" value="' + Text.escapeHTML(this.getBotMessageCommand("help " + sectionIndex + ', ' + i)) + '">' + (i + 1) + '</button>';
			}

			html += '</p>';
		}

		// Info

		html += '<p>Nota: Los argumentos con <code>&lt;&gt;</code> implica que son obligatorios. Los argumentos con <code>[]</code> son opcionales.</p>';

		html += '<hr />';

		// Commands

		for (let cmd of commands) {
			html += '<p>';

			html += '<code>' + Text.escapeHTML(cmd.syntax) + '</code> - ';

			html += cmd.description.join('<br />');

			html += '</p>';
		}

		html += '</div>';

		return html;
	}

	save() {
		this.db.write();
	}
}

/* Setup function: Called on add-on installation */
exports.setup = function (App) {
	const commandsGuide = new CommandsGuide(App);

	if (commandsGuide.data.sections.length === 0) {
		commandsGuide.fetchDefaultCommandsGuide();
	}

	function sendControlPanelPage(context, ok, error) {
		let html = '';

		html += '<script type="text/javascript">';
		html += 'function confirmOverwrite() {';
		html += 'var elem = document.getElementById("confirm-overwrite");';
		html += 'if (elem) {';
		html += 'elem.innerHTML = \'<form style="display:inline;" method="post" action="">\' +';
		html += '\'Are you sure? This will overwrite your current guide.&nbsp;<input type="submit" name="download" value="Confirm" /></form>\';';
		html += '}';
		html += 'return false;';
		html += '}';
		html += '</script>';

		html += '<h2>Command Guide</h2>';

		html += '<details>';

		html += '<summary><string>Click here for help on how to edit the guide</strong></summary>';

		html += '<p>Each section starts with [Section name]. Then, each command has the format:</p>';
		html += '<ol>';
		html += '<li>First line: Command syntax</li>';
		html += '<li>Following lines: Command description (HTML allowed)</li>';
		html += '<li>Command are separated from each other by empty lines</li>';
		html += '</ol>';

		html += '<p>Example:</p>';

		html += '<code style="border: solid 1px black; padding: 0.5rem;"><pre>';

		html += [
			'[Pokemon]',
			'',
			'usage <pokemon>, [tier]',
			'Displays the basic usage stats of a pokemon',
			'',
			'usagedata <pokemon>, [tier]',
			'Displays the full usage stats of a pokemon (moves, abilities, items, spreads and partners)',
			'',
			'usagetop [tier]',
			'Displays the top most used pokemon of a tier.',
			'',
			'usagelink',
			'Provides the usage stats link for the current month.',
			'',
			'[Misc]',
			'',
			'pick <option1>, <option2>, [...]',
			'Randomly picks between 2 or more options',
			'',
			'randpoke',
			'Picks a random Pokemon',
			'',
			'randmove',
			'Picks a random move',
			'',
			'randitem',
			'Picks a random item',
			'',
			'randability',
			'Picks a random ability',
			'',
			'randnature',
			'Picks a random nature',
			'',
			'randomdata',
			'Shows a random !dt (Pokemon, moves, items, abilities)',
			'',
		].map(Text.escapeHTML).join("\n");

		html += '</pre></code>';

		html += '</details>';

		html += '<p>Edit the guide in the following text box:</p>';

		html += '<form method="post" action="">';
		html += '<textarea name="data" style="width: 100%; max-width: 100ch;" rows="30">';
		html += Text.escapeHTML(commandsGuide.serializeCommandGuideConfig());
		html += '</textarea>';
		html += '<p><input type="checkbox" name="autoupdate"' + (commandsGuide.data.autoUpdate ? ' checked="checked"' : '') + ' />&nbsp;Automatically update guide every 24 hours (note: this will overwrite your previously guide, keep disabled for a custom guide).</p>';
		html += '<p><input type="submit" name="save" value="Save Changes" /></p>';
		html += '</form>';

		html += '<p><button onclick="confirmOverwrite();">Download and use default guide</button>&nbsp;<span id="confirm-overwrite"></span></p>';

		html += '<p>';
		if (ok) {
			html += '<span class="ok-msg">' + ok + '</span>';
		} else if (error) {
			html += '<span class="error-msg">' + error + '</span>';
		}
		html += '</p>';

		context.endWithWebPage(html, { title: "Commands Guide" });
	}

	return Tools('add-on').forApp(App).install({
		/* Add-on Commands (https://github.com/AgustinSRG/Showdown-ChatBot/wiki/Basic-Development-Guide#commands) */
		commandsOverwrite: true,
		commands: {
			help: function (App) {
				const botId = Text.toId(App.bot.getBotNick());
				const pageId = botId + "-commandsguide";

				if (this.args[0] === "close") {
					this.send('/closehtmlpage ' + this.byIdent.id + ', ' + pageId, LOBBY_ROOM);
					return;
				}

				const sectionIndex = Math.min(commandsGuide.data.sections.length - 1, Math.max(0, parseInt(this.args[0] || "0") || 0));
				const sectionPage = Math.max(0, parseInt(this.args[1] || "0") || 0);

				const html = commandsGuide.generateHelpPage(sectionIndex, sectionPage);

				if (html) {
					this.send('/sendhtmlpage ' + this.byIdent.id + ', ' + pageId + ', ' + html, LOBBY_ROOM);
				} else {
					this.pmReply("La guía de comandos se encuentra vacía. Por favor, contacte con un administrador del bot para que la configure.");
				}
			},
		},

		/* Control panel options (https://github.com/AgustinSRG/Showdown-ChatBot/wiki/Basic-Development-Guide#server-handlers) */
		serverHandlersOverwrite: false,
		serverHandlers: {
			"cmdguide": function (context, parts) {
				if (!context.user || !context.user.can('cmdguide')) {
					context.endWith403();
					return;
				}

				let ok = null, error = null;

				if (context.post.save) {
					let sections;

					try {
						sections = commandsGuide.parseCommandGuideConfig(context.post.data || "");
					} catch (err) {
						error = err.message;
					}

					const autoUpdate = !!context.post.autoupdate;

					if (!error) {
						commandsGuide.data.sections = sections;
						commandsGuide.data.autoUpdate = autoUpdate;
						commandsGuide.save();
						App.logServerAction(context.user.id, "Updated Command Guide configuration");
						ok = "Command Guide configuration successfully saved.";
					}
				} else if (context.post.download) {
					commandsGuide.fetchDefaultCommandsGuide(true, function (ok2, error2) {
						App.logServerAction(context.user.id, "Updated Command Guide configuration");

						sendControlPanelPage(context, ok2, error2);
					});
					return;
				}

				sendControlPanelPage(context, ok, error);
			},
		},

		/* Control panel permissions */
		serverPermissionsOverwrite: false,
		serverPermissions: {
			"cmdguide": "Permission to modify the commands guide",
		},

		/* Control panel menu */
		serverMenuOptionsOverwrite: false,
		serverMenuOptions: {
			"cmdguide": { name: "Commands Guide", url: "/cmdguide/", permission: "cmdguide", level: -3 },
		},

		customInstall: function () {
			commandsGuide.startAutoUpdateTimer();
		},

		customUninstall: function () {
			commandsGuide.stopAutoUpdateTimer();
		},
	});
};
