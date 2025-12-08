/**
 * Commands File
 *
 * wiki: Displays a overview of a topic from Wikipedia
 */

'use strict';

const Path = require('path');
const HTTPS = require('https');

const BufferCache = Tools('cache').BufferCache;

const Text = Tools('text');

const Lang_File = Path.resolve(__dirname, 'wiki.translations');

const FAKE_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.3";

const wgetCache = new BufferCache(512, 5 * 60 * 1000);

function wget(url, callback) {
	if (wgetCache.has(url)) {
		return callback(wgetCache.get(url));
	}
	HTTPS.get(url, {
		headers: {
			"User-Agent": FAKE_USER_AGENT,
		},
	}, response => {
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
			wgetCache.cache(url, data);
			callback(data);
		});
		response.on('error', err => {
			callback(null, err);
		});
	}).on('error', err => {
		callback(null, err);
	});
}

const NO_RESULTS_ERROR = "No results found";

function findWikiPage(topic, locale, callback) {
	const url = 'https://' + locale +
		'.wikipedia.org/w/api.php?action=query&format=json&list=search&srprop=&srlimit=1&srsearch=' +
		encodeURIComponent(topic) + '&srinfo=suggestion';

	wget(url, function (data, err) {
		if (err) {
			return callback(null, err);
		}

		let title;
		let pageId;

		try {
			const results = JSON.parse(data).query.search;

			if (!Array.isArray(results)) {
				throw new Error("Search results is not an array");
			}

			if (results.length === 0) {
				return callback(null, new Error(NO_RESULTS_ERROR));
			}

			title = results[0].title;

			if (typeof title !== "string") {
				throw new Error("Title is not a string");
			}

			pageId = results[0].pageid;

			if (typeof pageId !== "string" && typeof pageId !== "number") {
				throw new Error("PageId is not a number or a string");
			}
		} catch (ex) {
			return callback(null, new Error("Invalid response from Wikipedia API"));
		}

		return callback({
			title,
			pageId,
		});
	});
}

function isValidHttpsUrl(url) {
	try {
		const u = new URL(url);

		return u.protocol === "https:";
	} catch (ex) {
		return false;
	}
}

function getWikiSummary(locale, title, pageId, callback) {
	const url = 'https://' + locale +
		'.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&pithumbsize=100&format=json&explaintext=&exintro=&titles=' +
		encodeURIComponent(title);

	wget(url, function (data, err) {
		if (err) {
			return callback(null, err);
		}

		let summary = "";
		let image = "";
		let imageWidth = 100;
		let imageHeight = 100;

		try {
			const pages = JSON.parseNoPrototype(data).query.pages;

			const page = pages[pageId];

			if (!page || typeof page !== "object") {
				throw new Error("Unexpected response: No page object");
			}

			summary = page.extract;

			if (typeof summary !== "string") {
				throw new Error("Unexpected response: Invalid summary format");
			}

			if (page.thumbnail && typeof page.thumbnail === "object" &&
				typeof page.thumbnail.source === "string" && isValidHttpsUrl(page.thumbnail.source) &&
				typeof page.thumbnail.width === "number" && typeof page.thumbnail.height === "number") {
				image = page.thumbnail.source;
				imageWidth = page.thumbnail.width;
				imageHeight = page.thumbnail.height;
			}
		} catch (ex) {
			return callback(null, new Error("Invalid response from Wikipedia API"));
		}

		return callback({
			summary,
			image: image ? {
				url: image,
				width: imageWidth,
				height: imageHeight,
			} : null,
		});
	});
}

function botCanHtml(room, App) {
	let roomData = App.bot.rooms[room];
	let botid = Text.toId(App.bot.getBotNick());
	return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'bot'));
}

const downloadingFlag = Object.create(null);

function markDownload(user, b) {
	if (b === false) {
		if (downloadingFlag[user]) delete downloadingFlag[user];
	} else if (b === true) {
		downloadingFlag[user] = true;
	} else {
		return downloadingFlag[user] || false;
	}
}

const Available_Languages = ["en", "es"];

const abreviations = {
	"english": "en",
	"spanish": "es",
};

const MAX_SUMMARY_SIZE = 3000;

module.exports = {
	wiki: "wikipedia",
	wikipedia: function (App) {
		this.setLangFile(Lang_File);

		const args = this.args;

		if (args.length === 0 || args.length > 2) {
			return this.errorReply(this.usage({ desc: this.mlt('topic') }, { desc: this.mlt('lang'), optional: true }));
		}

		const topic = this.args[0].trim();

		if (!topic) {
			return this.errorReply(this.usage({ desc: this.mlt('topic') }, { desc: this.mlt('lang'), optional: true }));
		}

		let lang = Text.toId(args[1] || abreviations[this.lang] || 'en');
		if (abreviations[lang]) {
			lang = abreviations[lang];
		}

		if (!Available_Languages.includes(lang)) {
			return this.errorReply(this.mlt('unavaillang') + ". " + this.mlt('availlangs') + ": " + Available_Languages.join(", "));
		}

		let canUseHtmlInRoom = this.getRoomType(this.room) === 'chat' &&
			!this.isGroupChat(this.room) && this.can('wikipedia', this.room) &&
			botCanHtml(this.room, App);

		if (markDownload(this.byIdent.id)) return this.errorReply(this.mlt('busy'));

		markDownload(this.byIdent.id, true);

		findWikiPage(topic, lang, (page, errFindPage) => {
			if (errFindPage) {
				markDownload(this.byIdent.id, false);
				return this.errorReply(this.mlt('errfind') + ": " + (errFindPage.message === NO_RESULTS_ERROR ? this.mlt('notfound') : errFindPage.message));
			}

			if (page === null) {
				markDownload(this.byIdent.id, false);
				return this.errorReply(this.mlt('errfind') + ": " + this.mlt('notfound'));
			}

			const title = page.title;
			const pageId = page.pageId + "";

			const fullLink = 'https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(title);

			getWikiSummary(lang, title, pageId, (pageInfo, err) => {
				markDownload(this.byIdent.id, false);

				if (errFindPage) {
					return this.errorReply(this.mlt('errfind') + ": " + err.message);
				}

				if (!pageInfo || !pageInfo.summary) {
					return this.errorReply(this.mlt('errfind') + ": " + this.mlt('notfound'));
				}

				let summary = pageInfo.summary;

				if (summary.length > MAX_SUMMARY_SIZE) {
					summary = summary.substring(0, MAX_SUMMARY_SIZE).trim();

					if (!summary.endsWith(".")) {
						summary += "...";
					}
				}

				const image = pageInfo.image;

				const code = "!code " + title + "\n\n" + summary + "\n\n" + fullLink;

				let html = '';

				html += '<table>';

				html += '<tr>';

				if (image) {
					html += '<td style="padding: 8px;">';
					html += '<img src="' + Text.escapeHTML(image.url) + '" width="' + Text.escapeHTML(image.width) + '" height="' + Text.escapeHTML(image.height) + '">';
					html += '</td>';
				}

				html += '<td style="padding: 8px;">';

				html += '<p style="font-size: large; font-weight: bold; text-decoration:underline;">' + Text.escapeHTML(title) + '</p>';

				if (canUseHtmlInRoom) {
					html += '<p>' + Text.escapeHTML(summary).replace(/\n/g, "<br>") + '</p>';

					html += '<p><a href="' + Text.escapeHTML(fullLink) + '" target="_blank">' + Text.escapeHTML(fullLink) + '</a></p>';
				}

				html += '</td>';

				html += '</tr>';

				if (!canUseHtmlInRoom) {
					html += '<tr>';
					html += '<td colspan="2">';

					html += '<p>' + Text.escapeHTML(summary).replace(/\n/g, "<br>") + '</p>';

					html += '<p><a href="' + Text.escapeHTML(fullLink) + '" target="_blank">' + Text.escapeHTML(fullLink) + '</a></p>';

					html += '</td>';
					html += '</tr>';
				}

				html += '</table>';

				this.htmlRestrictReply(html, "wikipedia", code);
			});
		});
	},
};
