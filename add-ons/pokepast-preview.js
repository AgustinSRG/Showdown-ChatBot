// PokePaste Preview add-on for Showdown ChatBot
// Install as an Add-on
// ----------------------
// Configuration constants:
// - ENABLED_ROOMS: List of room IDs where the feature is enabled. Empty = all rooms.
// - COOLDOWN_MS: Anti-spam cooldown for the same PokePaste in the same room.
// - CACHE_TTL_MS: How long to cache fetched PokePaste responses.
// - SHOW_NOTES: Whether to include notes in the preview.

'use strict';

const HTTPS = require('https');
const Chat = Tools('chat');
const Text = Tools('text');

const ENABLED_ROOMS = [];
const COOLDOWN_MS = 30 * 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const SHOW_NOTES = true;

const MAX_PASTE_CHARS = 40 * 1000;
const MAX_TITLE_CHARS = 120;
const MAX_AUTHOR_CHARS = 80;
const MAX_NOTES_CHARS = 400;
const MAX_PLAIN_TEXT_CHARS = 300;
const FETCH_BUFFER_CHARS = 2000;

const POKEPASTE_LINK_REGEX = /https:\/\/pokepast\.es\/([a-f0-9]{16})(?:\/(?:raw|json))?/i;

function isEnabledRoom(room) {
	if (!ENABLED_ROOMS.length) return true;
	return ENABLED_ROOMS.includes(Text.toId(room));
}

function getUsernameColor(App, name) {
	const modules = App.modules || {};
	const colorModules = [modules.profiles, modules.misc];
	for (let i = 0; i < colorModules.length; i++) {
		const mod = colorModules[i];
		if (!mod || !mod.system || typeof mod.system.getCustomColor !== 'function') continue;
		const customColor = mod.system.getCustomColor(name);
		if (customColor) return customColor;
	}
	if (Chat.usernameColor) return Chat.usernameColor(name);
	return '';
}

function getUsernameHtml(App, name) {
	const safeName = Text.escapeHTML(name);
	const color = getUsernameColor(App, name);
	if (!color) return safeName;
	return '<span class="username" style="color:' + Text.escapeHTML(color) + ';">' + safeName + '</span>';
}

function getTeamTools(App) {
	if (!App.modules || !App.modules.battle || !App.modules.battle.system) return null;
	if (!App.modules.battle.system.TeamBuilder || !App.modules.battle.system.TeamBuilder.tools) return null;
	return App.modules.battle.system.TeamBuilder.tools;
}

function getPokePasteId(message) {
	if (!message) return null;
	const match = POKEPASTE_LINK_REGEX.exec(message);
	if (!match) return null;
	return match[1].toLowerCase();
}

function toLimitedText(value, maxLength) {
	let text = value;
	if (typeof text !== 'string') text = '';
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength) + '...';
}

function requestText(url, callback) {
	HTTPS.get(url, response => {
		let data = '';
		let tooLarge = false;
		response.on('data', chunk => {
			if (tooLarge) return;
			data += chunk;
			if (data.length > MAX_PASTE_CHARS + FETCH_BUFFER_CHARS) {
				tooLarge = true;
			}
		});
		response.on('end', () => {
			if (tooLarge) {
				return callback(null, new Error("Response too large"));
			}
			if (response.statusCode !== 200) {
				if (response.statusCode === 404) {
					return callback(null, new Error("404 - Not found"));
				}
				return callback(null, new Error("" + response.statusCode));
			}
			if (data.length > MAX_PASTE_CHARS) {
				return callback(null, new Error("Paste exceeds the maximum supported length"));
			}
			return callback(data);
		});
		response.on('error', err => {
			callback(null, err);
		});
	}).on('error', err => {
		callback(null, err);
	});
}

function fetchPokePasteJSON(id, callback) {
	requestText("https://pokepast.es/" + encodeURIComponent(id) + "/json", (data, err) => {
		if (err) return callback(null, err);
		let parsed;
		try {
			parsed = JSON.parse(data);
		} catch (ex) {
			return callback(null, new Error("Malformed JSON response"));
		}

		if (!parsed || typeof parsed !== 'object') {
			return callback(null, new Error("Malformed JSON response"));
		}

		if (typeof parsed.paste !== 'string' || !parsed.paste.trim()) {
			return callback(null, new Error("Missing team data in JSON response"));
		}

		return callback({
			paste: parsed.paste,
			title: toLimitedText(parsed.title || "", MAX_TITLE_CHARS),
			author: toLimitedText(parsed.author || "", MAX_AUTHOR_CHARS),
			notes: toLimitedText(parsed.notes || "", MAX_NOTES_CHARS),
			link: "https://pokepast.es/" + id,
		});
	});
}

function fetchPokePasteRaw(id, callback) {
	requestText("https://pokepast.es/" + encodeURIComponent(id) + "/raw", (data, err) => {
		if (err) return callback(null, err);
		if (!data || !data.trim()) {
			return callback(null, new Error("Empty raw response"));
		}
		return callback({
			paste: data,
			title: '',
			author: '',
			notes: '',
			link: "https://pokepast.es/" + id,
		});
	});
}

function fetchPokePaste(id, callback) {
	fetchPokePasteJSON(id, (jsonData, jsonErr) => {
		if (!jsonErr && jsonData) {
			return callback(jsonData);
		}
		fetchPokePasteRaw(id, (rawData, rawErr) => {
			if (rawErr) {
				const errorMessages = [];
				if (jsonErr && jsonErr.message) errorMessages.push("JSON: " + jsonErr.message);
				if (rawErr.message) errorMessages.push("RAW: " + rawErr.message);
				return callback(null, new Error("Failed to fetch Pokepaste: " + errorMessages.join(" | ")));
			}
			return callback(rawData);
		});
	});
}

function buildTeamPreview(App, pasteText) {
	const Teams = getTeamTools(App);
	if (!Teams) return null;

	let packed = '';

	try {
		const jsonTeam = Teams.teamToJSON(pasteText);
		if (!Array.isArray(jsonTeam) || !jsonTeam.length) {
			return null;
		}
		packed = Teams.packTeam(jsonTeam);
	} catch (ex) {
		return null;
	}

	if (!packed) return null;

	let exported = '';
	let icons = '';
	try {
		exported = Teams.exportTeam(packed);
		icons = Teams.teamOverviewShowdownHTML(packed);
	} catch (ex) {
		return null;
	}

	if (!exported || !exported.trim() || !icons || !icons.trim()) {
		return null;
	}

	return {
		packedTeam: packed,
		exportedTeam: exported,
		icons: icons,
	};
}

function getSafeTeamName(pasteData, teamPreview) {
	if (pasteData.title) return pasteData.title;
	if (!teamPreview || !teamPreview.exportedTeam) return "Pokepast Team";
	const firstLine = (teamPreview.exportedTeam.split('\n')[0] || '').trim();
	if (!firstLine) return "Pokepast Team";
	return toLimitedText(firstLine, MAX_TITLE_CHARS);
}

function buildHtml(App, byName, pasteData, teamPreview) {
	if (!teamPreview) return '';

	const safeBy = getUsernameHtml(App, byName);
	const safeTitle = Text.escapeHTML(getSafeTeamName(pasteData, teamPreview));
	const safeAuthor = Text.escapeHTML(pasteData.author || "Unknown");
	const safeLink = Text.escapeHTML(pasteData.link);
	const escapedExport = Text.escapeHTML(teamPreview.exportedTeam);
	const copyValue = Text.escapeHTML(teamPreview.packedTeam);

	let html = '';
	html += '<div style="margin:4px 0;padding:8px 10px;background:#1e2b4f;border:1px solid #4f7bcf;border-radius:6px;">';
	html += '<p style="margin:0 0 6px 0;"><b>Team from ' + safeBy + '</b> (Author: ' + safeAuthor + ')</p>';
	html += '<p style="margin:0 0 6px 0;"><a href="' + safeLink + '" target="_blank"><b>' + safeTitle + '</b></a></p>';
	html += '<div style="padding:6px;border:1px solid #5f80c8;border-radius:4px;background:#23345e;">' + teamPreview.icons + '</div>';
	html += '<details style="margin-top:6px;"><summary>(Click to export)</summary>';
	html += '<div style="margin-top:4px;padding:6px;border:1px solid #44516f;border-radius:4px;background:#111827;color:#f8fafc;">';
	html += '<p style="margin:0 0 6px 0;"><copytext value="' + copyValue + '">Copy</copytext></p>';
	html += '<textarea readonly style="box-sizing:border-box;width:100%;min-height:240px;margin:0;padding:6px;border:1px solid #334155;border-radius:4px;background:#0f172a;color:#f8fafc;white-space:pre;overflow:auto;font-family:monospace;">' + escapedExport + '</textarea>';
	html += '</div></details>';
	if (SHOW_NOTES && pasteData.notes) {
		html += '<p style="margin:6px 0 0 0;"><b>Notes:</b> ' + Text.escapeHTML(pasteData.notes) + '</p>';
	}
	html += '</div>';
	return html;
}

function buildPlainText(byName, pasteData) {
	const title = getSafeTeamName(pasteData, null);
	const author = pasteData.author || "Unknown";
	const txt = "PokePaste from " + byName + ": " + title + " (Author: " + author + ") - " + pasteData.link;
	return Text.stripCommands(toLimitedText(txt, MAX_PLAIN_TEXT_CHARS));
}

exports.setup = function (App) {
	const roomCooldowns = new Map();
	const cache = new Map();
	const botId = Text.toId(App.bot.getBotNick() || "");

	function getCached(id) {
		const entry = cache.get(id);
		if (!entry) return null;
		if (entry.expires < Date.now()) {
			cache.delete(id);
			return null;
		}
		return entry.data;
	}

	function setCache(id, data) {
		cache.set(id, {
			expires: Date.now() + CACHE_TTL_MS,
			data: data,
		});
	}

	function handleChat(room, time, by, message) {
		if (!isEnabledRoom(room)) return;

		const user = Text.parseUserIdent(by);
		if (Text.toId(user.name || "") === botId) return;

		const id = getPokePasteId(message);
		if (!id) return;

		const roomId = Text.toId(room);
		const cooldownKey = roomId + "|" + id;
		const now = Date.now();
		const prev = roomCooldowns.get(cooldownKey) || 0;
		if ((now - prev) < COOLDOWN_MS) return;
		roomCooldowns.set(cooldownKey, now);

		const sendPreview = pasteData => {
			const teamPreview = buildTeamPreview(App, pasteData.paste);
			const plainText = buildPlainText(user.name, pasteData);
			const html = buildHtml(App, user.name, pasteData, teamPreview);
			if (!html) {
				return App.bot.sendTo(room, plainText);
			}
			App.bot.sendTo(room, "/addhtmlbox " + html);
		};

		const cached = getCached(id);
		if (cached) {
			return sendPreview(cached);
		}

		fetchPokePaste(id, (pasteData, err) => {
			if (err || !pasteData || !pasteData.paste || !pasteData.paste.trim()) {
				return;
			}
			setCache(id, pasteData);
			sendPreview(pasteData);
		});
	}

	App.bot.on('userchat', handleChat);

	exports.destroy = function () {
		App.bot.removeListener('userchat', handleChat);
	};
};
