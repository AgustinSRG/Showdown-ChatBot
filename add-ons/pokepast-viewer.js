// PokéPast Team Viewer add-on for Showdown-ChatBot
// -------------------------------------------------
// Fetches a pokepast.es team and renders it as a
// beautiful HTML card display directly in chat.
//
// Commands:
//   .pokepast <url>   — show full team HTML box (requires bot rank)
//   .pokepasttext <url> — plain-text fallback (no bot rank needed)
//
// Aliases: .pp, .team, .pokepaste
//
// Requirements: bot needs (*) rank in the room to use /addhtmlbox.
// If it doesn't have it, use .pokepasttext instead.

'use strict';

const Https = require('https');
const Text = Tools('text');

// PS sprite CDN
const SPRITE_URL = 'https://play.pokemonshowdown.com/sprites/dex/%s.png';
const SPRITE_SHINY_URL = 'https://play.pokemonshowdown.com/sprites/dex-shiny/%s.png';
const ITEM_ICON_URL = 'https://play.pokemonshowdown.com/sprites/itemicons/%s.png';

// Tera type badge colours (Gen 9)
const TERA_COLORS = {
	Normal: '#9199A1', Fire: '#FF9C54', Water: '#4D90D5', Electric: '#F3D23B',
	Grass: '#63BB5B', Ice: '#74CEC0', Fighting: '#CE4069', Poison: '#AB6AC8',
	Ground: '#D97845', Flying: '#8FA8DD', Psychic: '#F97176', Bug: '#90C12C',
	Rock: '#C7B78B', Ghost: '#5269AC', Dragon: '#0A6DC4', Dark: '#5A5366',
	Steel: '#5A8EA2', Fairy: '#EC8FE6', Stellar: '#40B5A5',
};

// Convert Pokemon/item name to PS sprite ID (lowercase, remove non-alphanumeric)
function toSpriteId(name) {
	return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Convert item name to item icon ID (same formula)
function toItemId(item) {
	return (item || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Extract paste ID from a pokepast.es URL or bare 16-char hex ID
function extractPasteId(input) {
	input = (input || '').trim();
	const urlMatch = input.match(/pokepast\.es\/([a-f0-9]{16})/i);
	if (urlMatch) return urlMatch[1];
	if (/^[a-f0-9]{16}$/i.test(input)) return input;
	return null;
}

// Lightweight HTTPS GET — calls back with (body, errorMessage)
function fetchUrl(url, callback) {
	Https.get(url, res => {
		if (res.statusCode !== 200) {
			res.resume();
			return callback(null, 'HTTP ' + res.statusCode);
		}
		let body = '';
		res.on('data', chunk => { body += chunk; });
		res.on('end', () => callback(body, null));
		res.on('error', err => callback(null, err.message));
	}).on('error', err => callback(null, err.message));
}

// ── Showdown format parser ────────────────────────────────────────────────────

function parseTeam(text) {
	const mons = [];
	// Pokemon blocks are separated by blank lines
	const blocks = text.replace(/\r\n/g, '\n').split(/\n{2,}/);

	for (const block of blocks) {
		const lines = block.trim().split('\n');
		if (!lines[0] || !lines[0].trim()) continue;

		const mon = { moves: [] };
		const firstLine = lines[0].trim();

		// Split "Name @ Item" — use last " @ " to handle names with "@"
		const atIdx = firstLine.lastIndexOf(' @ ');
		let namePart = atIdx >= 0 ? firstLine.slice(0, atIdx) : firstLine;
		mon.item = atIdx >= 0 ? firstLine.slice(atIdx + 3).trim() : null;

		// Strip inline gender "(M)" / "(F)" from the name portion
		namePart = namePart.replace(/\s*\((M|F)\)\s*$/, (_, g) => {
			mon.gender = g;
			return '';
		}).trim();

		// Nickname (Species) — species is in parens when a nickname is used
		const nicknameMatch = namePart.match(/^(.+)\s+\(([^)]+)\)\s*$/);
		if (nicknameMatch) {
			mon.nickname = nicknameMatch[1].trim();
			mon.species = nicknameMatch[2].trim();
		} else {
			mon.species = namePart;
		}

		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;

			if (line.startsWith('- ')) {
				mon.moves.push(line.slice(2).trim());
			} else if (line.startsWith('Ability: ')) {
				mon.ability = line.slice(9).trim();
			} else if (line.startsWith('Level: ')) {
				mon.level = parseInt(line.slice(7).trim(), 10);
			} else if (line.startsWith('EVs: ')) {
				mon.evs = line.slice(5).trim();
			} else if (line.startsWith('IVs: ')) {
				mon.ivs = line.slice(5).trim();
			} else if (line.endsWith(' Nature')) {
				mon.nature = line.slice(0, -7).trim();
			} else if (line.startsWith('Tera Type: ')) {
				mon.tera = line.slice(11).trim();
			} else if (line === 'Shiny: Yes') {
				mon.shiny = true;
			} else if (line.startsWith('Happiness: ')) {
				mon.happiness = parseInt(line.slice(11).trim(), 10);
			}
		}

		if (mon.species) mons.push(mon);
	}

	return mons;
}

// ── HTML rendering ────────────────────────────────────────────────────────────

function renderCard(mon) {
	const spriteId = toSpriteId(mon.species);
	const spriteUrl = (mon.shiny ? SPRITE_SHINY_URL : SPRITE_URL).replace('%s', spriteId);
	const itemId = mon.item ? toItemId(mon.item) : null;

	let card = '<div style="display:inline-block;vertical-align:top;width:220px;border:1px solid #d0d0d0;border-radius:8px;' +
		'padding:8px;margin:4px;background:#fff;font-size:12px;font-family:Arial,sans-serif;box-shadow:1px 1px 4px rgba(0,0,0,0.08);">';

	// ── Header: sprite + name/item ──
	card += '<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:6px;">';

	// Sprite
	card += '<img src="' + Text.escapeHTML(spriteUrl) + '" width="56" height="56"' +
		' style="image-rendering:pixelated;flex-shrink:0;"' +
		' onerror="this.style.opacity=\'0\'" />';

	// Name + item block
	card += '<div style="flex:1;min-width:0;">';

	// Species (and nickname if present)
	if (mon.nickname) {
		card += '<div style="font-weight:bold;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' +
			Text.escapeHTML(mon.species) + '">' + Text.escapeHTML(mon.nickname) + '</div>';
		card += '<div style="color:#666;font-size:11px;">(' + Text.escapeHTML(mon.species) + ')' +
			(mon.shiny ? ' ✨' : '') + '</div>';
	} else {
		card += '<div style="font-weight:bold;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
			Text.escapeHTML(mon.species) + (mon.shiny ? ' ✨' : '') + '</div>';
	}

	// Item
	if (mon.item) {
		card += '<div style="display:flex;align-items:center;gap:3px;color:#444;margin-top:2px;">';
		card += '<img src="' + Text.escapeHTML(ITEM_ICON_URL.replace('%s', itemId)) + '"' +
			' width="16" height="16" onerror="this.style.display=\'none\'" />';
		card += '<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
			Text.escapeHTML(mon.item) + '</span>';
		card += '</div>';
	}

	card += '</div>'; // close name block
	card += '</div>'; // close header row

	// ── Meta: ability · nature · level ──
	const metaParts = [];
	if (mon.ability) metaParts.push(mon.ability);
	if (mon.nature) metaParts.push(mon.nature);
	if (mon.level && mon.level !== 100) metaParts.push('Lv.' + mon.level);
	if (metaParts.length) {
		card += '<div style="color:#555;font-size:11px;margin-bottom:3px;border-top:1px solid #f0f0f0;padding-top:4px;">' +
			Text.escapeHTML(metaParts.join(' · ')) + '</div>';
	}

	// ── Tera type ──
	if (mon.tera) {
		const teraColor = TERA_COLORS[mon.tera] || '#888';
		card += '<div style="margin-bottom:3px;">' +
			'<span style="background:' + teraColor + ';color:#fff;border-radius:3px;padding:1px 5px;font-size:10px;font-weight:bold;">' +
			'Tera: ' + Text.escapeHTML(mon.tera) + '</span>' +
			'</div>';
	}

	// ── EVs / IVs ──
	if (mon.evs) {
		card += '<div style="color:#333;font-size:11px;margin-bottom:2px;">' +
			'<b style="color:#888;">EVs</b> ' + Text.escapeHTML(mon.evs) + '</div>';
	}
	if (mon.ivs) {
		card += '<div style="color:#333;font-size:11px;margin-bottom:2px;">' +
			'<b style="color:#888;">IVs</b> ' + Text.escapeHTML(mon.ivs) + '</div>';
	}

	// ── Moves ──
	if (mon.moves.length) {
		card += '<div style="border-top:1px solid #f0f0f0;padding-top:4px;margin-top:2px;">';
		for (const move of mon.moves) {
			card += '<div style="color:#222;padding:1px 0;">· ' + Text.escapeHTML(move) + '</div>';
		}
		card += '</div>';
	}

	card += '</div>'; // close card
	return card;
}

function renderTeamHtml(mons, title, author, pasteUrl) {
	let html = '<div style="font-family:Arial,sans-serif;padding:2px;">';

	// Header bar
	if (title || author || pasteUrl) {
		html += '<div style="margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #ddd;display:flex;align-items:baseline;gap:6px;">';
		if (title) html += '<b style="font-size:14px;">' + Text.escapeHTML(title) + '</b>';
		if (author) html += '<span style="color:#666;font-size:12px;">by ' + Text.escapeHTML(author) + '</span>';
		if (pasteUrl) {
			html += '<a href="' + Text.escapeHTML(pasteUrl) + '" style="font-size:11px;color:#5a8fc7;margin-left:auto;">' +
				'pokepast.es ↗</a>';
		}
		html += '</div>';
	}

	// Cards row
	html += '<div style="display:flex;flex-wrap:wrap;gap:2px;">';
	for (const mon of mons) {
		html += renderCard(mon);
	}
	html += '</div>';
	html += '</div>';
	return html;
}

function renderTeamText(mons, title, author) {
	const lines = [];
	if (title) lines.push('**' + title + '**' + (author ? ' by ' + author : ''));
	for (const mon of mons) {
		const parts = [];
		const displayName = mon.nickname ? mon.nickname + ' (' + mon.species + ')' : mon.species;
		let header = displayName;
		if (mon.item) header += ' @ ' + mon.item;
		parts.push(header);
		if (mon.ability) parts.push('Ability: ' + mon.ability);
		if (mon.nature) parts.push(mon.nature + ' Nature');
		if (mon.tera) parts.push('Tera: ' + mon.tera);
		if (mon.evs) parts.push('EVs: ' + mon.evs);
		for (const move of mon.moves) parts.push('- ' + move);
		lines.push(parts.join(' | '));
	}
	return lines.join('\n');
}

// ── Add-on install ────────────────────────────────────────────────────────────

exports.setup = function (App) {
	function handlePokepast(self, App, useHtml) {
		const room = self.room;
		const input = self.arg.trim();

		if (!input) {
			return self.errorReply('Usage: ' + self.token + (useHtml ? 'pokepast' : 'pokepasttext') + ' <pokepast.es URL>');
		}

		const pasteId = extractPasteId(input);
		if (!pasteId) {
			return self.errorReply('Invalid PokéPast link. Use a pokepast.es URL, e.g. https://pokepast.es/abc123...');
		}

		const jsonUrl = 'https://pokepast.es/' + pasteId + '/json';
		const rawUrl = 'https://pokepast.es/' + pasteId + '/raw';
		const pasteUrl = 'https://pokepast.es/' + pasteId;

		// Try JSON first (includes title + author metadata)
		fetchUrl(jsonUrl, (jsonBody, jsonErr) => {
			if (jsonBody && jsonBody.trim().startsWith('{')) {
				let parsed = null;
				try { parsed = JSON.parse(jsonBody); } catch (e) { /* fall through */ }

				if (parsed && parsed.paste) {
					const mons = parseTeam(parsed.paste);
					if (!mons.length) return self.reply('No Pokémon found in that paste.');
					const title = parsed.title || null;
					const author = parsed.author || null;
					if (useHtml) {
						App.bot.sendTo(room, '/addhtmlbox ' + renderTeamHtml(mons, title, author, pasteUrl));
					} else {
						App.bot.sendTo(room, renderTeamText(mons, title, author));
					}
					return;
				}
			}

			// Fall back to /raw
			fetchUrl(rawUrl, (rawBody, rawErr) => {
				if (!rawBody) {
					return self.reply('Could not load paste. Make sure the link is correct. (' + (rawErr || 'unknown error') + ')');
				}
				const mons = parseTeam(rawBody);
				if (!mons.length) return self.reply('No Pokémon found in that paste.');
				if (useHtml) {
					App.bot.sendTo(room, '/addhtmlbox ' + renderTeamHtml(mons, null, null, pasteUrl));
				} else {
					App.bot.sendTo(room, renderTeamText(mons, null, null));
				}
			});
		});
	}

	return Tools('add-on').forApp(App).install({
		commands: {
			'pp': 'pokepast',
			'team': 'pokepast',
			'pokepaste': 'pokepast',
			'pokepast': function (App) {
				handlePokepast(this, App, true);
			},
			'pokepasttext': function (App) {
				handlePokepast(this, App, false);
			},
		},

		commandPermissions: {
			'pokepast': { group: 'user' },
			'pokepasttext': { group: 'user' },
		},
	});
};
