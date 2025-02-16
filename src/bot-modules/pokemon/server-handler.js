/**
 * Server Handler: Pokemon
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'template.html'));

const Available_Languages = require(Path.resolve(__dirname, 'poke-trans', 'translate.js')).supportedLanguages;

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('pokemon', 'Permission for changing the pokemon module configuration');

	/* Menu Options */
	App.server.setMenuOption('pokemon', 'Pokemon', '/pokemon/', 'pokemon', -2);

	/* Handlers */
	App.server.setHandler('pokemon', (context, parts) => {
		if (!context.user || !context.user.can('pokemon')) {
			context.endWith403();
			return;
		}

		let Config = App.config.modules.pokemon;
		if (!Config.roomtier) {
			Config.roomtier = Object.create(null);
		}

		let ok = null, error = null;
		if (context.post.save) {
			let format = Text.toId(context.post.format);
			if (format) {
				Config.gtier = format;
				App.saveConfig();
				App.logServerAction(context.user.id, "Edit pokemon configuration");
				ok = "Pokemon configuration saved";
			} else {
				error = "You must specify a format";
			}
		} else if (context.post.savelink) {
			let link = Text.trim(context.post.usagelink);
			if (link) {
				Config.usagelink = link;
				App.saveConfig();
				App.data.cache.uncacheAll('smogon-usage');
				App.logServerAction(context.user.id, "Edit pokemon configuration (usage link)");
				ok = "Pokemon configuration saved";
			} else {
				error = "You must specify a link";
			}
		} else if (context.post.setroom) {
			let format = Text.toId(context.post.format);
			let room = Text.toRoomid(context.post.room);
			if (format) {
				if (room) {
					Config.roomtier[room] = format;
					App.saveConfig();
					App.logServerAction(context.user.id, "Edit pokemon configuration");
					ok = "Pokemon configuration saved";
				} else {
					error = "You must specify a room";
				}
			} else {
				error = "You must specify a format";
			}
		} else if (context.post.deleteroom) {
			let room = Text.toRoomid(context.post.room);
			if (room) {
				if (Config.roomtier[room]) {
					delete Config.roomtier[room];
					App.saveConfig();
					App.logServerAction(context.user.id, "Edit pokemon configuration");
					ok = "Pokemon configuration saved";
				} else {
					error = "Room not found.";
				}
			} else {
				error = "You must specify a room";
			}
		}

		let htmlVars = Object.create(null);
		htmlVars.usage_link = Text.escapeHTML(Config.usagelink || "");
		htmlVars.def_format = Text.escapeHTML(Config.gtier || "");
		htmlVars.rooms = '';

		for (let room in Config.roomtier) {
			htmlVars.rooms += '<tr><td>' + Text.escapeHTML(room) + '</td><td>' + Text.escapeHTML(Config.roomtier[room]) +
				'</td><td><div align="center"><form method="post" action="" style="display:inline;"><input type="hidden" name="room" value="' +
				Text.escapeHTML(room) + '" /><label><input type="submit" name="deleteroom" value="Delete" /></label></form></div></td></tr>';
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(mainTemplate.make(htmlVars), { title: "Pokemon - Showdown ChatBot" });
	});

	const TradTableCache = new Map();

	const TradTableMessages = {
		"es": {
			title: "Traducciones disponibles (Inglés - Español)",
			from: "Inglés",
			to: "Español",
			legacy: "Antiguas generaciones",
			abilities: "Habilidades",
			items: "Objetos",
			moves: "Movimientos",
			natures: "Naturalezas",
			pokemon: "Pokemon",
		},
		"lat": {
			title: "Traducciones disponibles (Inglés - Español Latino)",
			from: "Inglés",
			to: "Español Latino",
			legacy: "Antiguas generaciones",
			abilities: "Habilidades",
			items: "Objetos",
			moves: "Movimientos",
			natures: "Naturalezas",
			pokemon: "Pokemon",
		},
	};

	App.server.setHandler('tradtable', (context, parts) => {
		let html = '<!doctype html>';

		if (!parts[0]) {
			context.endWith404();
			return;
		}

		const langTo = Text.toId(parts[0].split('?')[0] + "");

		if (!langTo || !Available_Languages[langTo] || !TradTableMessages[langTo]) {
			context.endWith404();
			return;
		}

		if (TradTableCache.has(langTo)) {
			html = TradTableCache.get(langTo);
		} else {
			html += '<html>';

			html += '<head><title>' + Text.escapeHTML(TradTableMessages[langTo].title) + '</title>' +
				'<style>td {padding:5px;}</style><link rel="stylesheet" href="/static/style.css" /></head>';

			html += '<body>';

			let translateDataFrom = Available_Languages["en"];
			let translateDataTo = Available_Languages[langTo];

			let keys = ['abilities', 'items', 'moves', 'natures', 'pokemon'];

			for (let key of keys) {
				html += '<div style="text-align: center;" style="padding:5px;">';
				html += '<h1>' + Text.escapeHTML(TradTableMessages[langTo][key]) + '</h1>';

				html += '<table style="width: 100%;" border="1">';

				html += '<tr>';

				html += '<td><div style="text-align: center;"><h3><strong>' + Text.escapeHTML(TradTableMessages[langTo].from) + '</strong></h3></div></td>';
				html += '<td><div style="text-align: center;"><h3><strong>' + Text.escapeHTML(TradTableMessages[langTo].to) + '</strong></h3></div></td>';

				html += '</tr>';

				for (let tradKey of Object.keys(translateDataFrom[key])) {
					const fromName = translateDataFrom[key][tradKey];
					const toName = translateDataTo[key][tradKey];
					const legacyName = translateDataTo["legacy"][tradKey];

					if (!toName) {
						continue;
					}

					html += '<tr>';

					html += '<td><strong>' + Text.escapeHTML(fromName) + '</strong> (' + Text.escapeHTML(TradTableMessages[langTo][key]) + ')</td>';

					if (legacyName) {
						html += '<td><strong>' + Text.escapeHTML(toName) + '</strong> (' + Text.escapeHTML(TradTableMessages[langTo][key]) + '), <strong>' + Text.escapeHTML(legacyName) + '</strong> (' + Text.escapeHTML(TradTableMessages[langTo]["legacy"]) + ')</td>';
					} else {
						html += '<td><strong>' + Text.escapeHTML(toName) + '</strong> (' + Text.escapeHTML(TradTableMessages[langTo][key]) + ')</td>';
					}

					html += '</tr>';
				}

				html += '</table>';
				html += '</div>';
			}

			html += '</body>';
			html += '</html>';

			TradTableCache.set(langTo, html);
		}

		context.endWithHtml(html, 200);
	});
};
