/**
 * Commands File
 *
 * image: Displays an image in a chat room
 */

'use strict';

const Path = require('path');
const HTTPS = require('https');
const URL = require('url').URL;
const CheerIO = require('cheerio');
const probe = require('probe-image-size');

const Text = Tools('text');

const Cache = Tools('cache').BufferCache;

const Lang_File = Path.resolve(__dirname, 'links.translations');

const imageCache = new Cache(10);

const FAKE_USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36";

function createImageHtmlBox(imageLink, pageLink, title, w, h, hideImage) {
	const html = `<div style="${hideImage ? "padding: 4px;" : "text-align: center;"}"><a href=${JSON.stringify(pageLink)} target="_blank"><img width=${JSON.stringify(w + "")} height=${JSON.stringify(h + "")} alt=${JSON.stringify(title)} title=${JSON.stringify(title)} src=${JSON.stringify(imageLink)}></a></div>`;
	if (hideImage) {
		return `<details><summary>${title || "[Image]"}</summary>${html}</details>`;
	} else {
		return html;
	}
}

function createImageHtmlBoxExtended(imageLink, pageLink, title, description, w, h) {
	if (w > h) {
		if (w > 100) {
			h = Math.floor(h * 100 / w);
			w = 100;
		}
	} else {
		if (h > 100) {
			w = Math.floor(w * 100 / h);
			h = 100;
		}
	}

	return `<table style="width: 100%; border: none;"><tr><td style="text-align: center; width: ${w}px;"><a href=${JSON.stringify(pageLink)} target="_blank"><img width=${JSON.stringify(w + "")} height=${JSON.stringify(h + "")} alt=${JSON.stringify(title)} title=${JSON.stringify(title)} src=${JSON.stringify(imageLink)}></a></td><td><div style="padding: 4px;text-align: left;font-size:large;"><a href=${JSON.stringify(pageLink)} target="_blank">${title}</a></div><div style="padding: 4px;text-align: left; color: gray;">${description}</div></td></tr></table>`;
}

function createImageHtmlBoxNoImage(pageLink, title, description) {
	return `<div style="font-size:large;"><a href=${JSON.stringify(pageLink)} target="_blank">${title}</a></div><div style="color: gray;">${description}</div>`;
}

function botCanHtml(room, App) {
	let roomData = App.bot.rooms[room];
	let botid = Text.toId(App.bot.getBotNick());
	return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'bot'));
}

const IMAGE_HEIGHT = 256; // px
const MAX_CHAT_WIDTH = 400; // px

const busy = {};

module.exports = {

	"link": function (App) {
		this.setLangFile(Lang_File);

		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}

		if (!this.can('link', this.room)) return this.replyAccessDenied('link');

		if (!botCanHtml(this.room, App)) {
			return this.errorReply(this.mlt('nobot'));
		}

		let url;

		url = this.args.join(",");

		if (!url) {
			return this.errorReply(this.usage({ desc: 'URL' }));
		}

		this.cmd = "image";
		this.showFullLinkInfo = true;
		this.parser.exec(this);
	},

	"himg": "hiddenimage",
	"hiddenimage": function (App) {
		this.setLangFile(Lang_File);

		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}

		if (!this.can('link', this.room)) return this.replyAccessDenied('link');

		if (!botCanHtml(this.room, App)) {
			return this.errorReply(this.mlt('nobot'));
		}

		let url;

		url = this.args.join(",");

		if (!url) {
			return this.errorReply(this.usage({ desc: 'URL' }));
		}

		this.cmd = "image";
		this.hideImage = true;
		this.parser.exec(this);
	},

	"img": "image",
	image: function (App) {
		this.setLangFile(Lang_File);

		if (this.getRoomType(this.room) !== 'chat') {
			return this.errorReply(this.mlt('nochat'));
		}

		if (!this.can('link', this.room)) return this.replyAccessDenied('link');

		if (!botCanHtml(this.room, App)) {
			return this.errorReply(this.mlt('nobot'));
		}

		let url;

		url = this.args.join(",");

		if (!url) {
			return this.errorReply(this.usage({ desc: 'URL' }));
		}

		if (url.substr(0, "https:".length).toLowerCase() !== "https:" && url.substr(0, "http:".length).toLowerCase() !== "http:") {
			url = "https://" + url;
		}

		try {
			url = new URL(url);
		} catch (ex) {
			return this.errorReply(this.mlt(1));
		}

		if (!(url.protocol in { "https:": 1 })) {
			return this.errorReply(this.mlt(2));
		}

		if ((url.hostname in { "localhost": 1, "127.0.0.1": 1 })) {
			return this.errorReply(this.mlt(1));
		}

		let cached = imageCache.get(url.href);

		if (cached) {
			if (!cached.image) {
				if (this.showFullLinkInfo) {
					this.send("/addhtmlbox " + createImageHtmlBoxNoImage(cached.link, cached.title, cached.description), this.room);
				} else {
					return this.errorReply(this.mlt(3));
				}
			} else if (cached.title && this.showFullLinkInfo) {
				this.send("/addhtmlbox " + createImageHtmlBoxExtended(cached.image, cached.link, cached.title, cached.description, cached.w, cached.h), this.room);
			} else {
				this.send("/addhtmlbox " + createImageHtmlBox(cached.image, cached.link, cached.title, cached.w, cached.h, this.hideImage), this.room);
			}

			return;
		}

		if (busy[this.room] && busy[this.room][url.href] && Date.now() - busy[this.room][url.href] < 10000) {
			return this.errorReply(this.mlt(5));
		}

		if (!busy[this.room]) {
			busy[this.room] = {};
		}

		busy[this.room][url.href] = Date.now();

		const req = HTTPS.get(url.href, { headers: { "User-Agent": FAKE_USER_AGENT }, timeout: 5000 }, function (response) {
			if (response.statusCode !== 200) {
				req.abort();
				if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307 || response.statusCode === 308) {
					if (this.wasRedirected) {
						return this.errorReply(this.mlt(4).replace("#ERR", "TOO_MANY_REDIRECTS"));
					} else {
						this.args = [response.headers.location];
						this.wasRedirected = true;
						this.parser.exec(this);
						return;
					}
				} else {
					return this.errorReply((this.mlt(4) + "").replace("#ERR", response.status));
				}
			}

			const mimeType = (response.headers["content-type"] || response.headers["Content-Type"]) + "";

			if (mimeType.indexOf("text/html") === 0) {
				// is a webpage

				let data = '';

				let encoding = mimeType.split("charset=")[1] || "UTF-8";

				if (encoding.toUpperCase().indexOf("ISO")) {
					response.setEncoding('latin1');
				} else {
					response.setEncoding('utf8');
				}

				response.on('data', function (chunk) {
					data += chunk;
				});
				response.on('end', function () {
					// Encode if neccesary
					if (encoding.toUpperCase().indexOf("ISO")) {
						data = Buffer.from(data, "latin1").toString("utf8");
					}

					// Find the real image URL

					let realURL = '';
					let title = url.href;
					let desc = "...";

					try {
						const html = CheerIO.load(data);

						html('title').each(function (_, elm) {
							title = html(elm).text();
						});

						html('meta').each(function (_, elm) {
							if (elm.name === "meta") {
								if (elm.attribs.property === "og:title") {
									title = elm.attribs.content + "";
								} else if (elm.attribs.property === "og:description") {
									desc = elm.attribs.content + "";
								} else if (elm.attribs.property === "og:image") {
									realURL = elm.attribs.content + "";
								} else if (elm.attribs.name === "description") {
									desc = elm.attribs.content + "";
								}
							}
						});
					} catch (ex) {
						return this.errorReply(this.mlt(4).replace("#ERR", ex.message));
					}

					if (!realURL) {
						if (title && this.showFullLinkInfo) {
							imageCache.cache(url.href, {
								image: null,
								link: url.href,
								title: title,
								description: desc,
							});
							return this.send("/addhtmlbox " + createImageHtmlBoxNoImage(url.href, title, desc), this.room);
						} else {
							return this.errorReply(this.mlt(3));
						}
					}

					if (realURL.substr(0, "https:".length) !== "https:") {
						try {
							realURL = (new URL(realURL, url.href)).href;
						} catch (ex) {
							realURL = "";
						}
					}

					probe(realURL, function (err, result) {
						if (err) {
							if (title && this.showFullLinkInfo) {
								imageCache.cache(url.href, {
									image: null,
									link: url.href,
									title: title,
									description: desc,
								});
								return this.send("/addhtmlbox " + createImageHtmlBoxNoImage(url.href, title, desc), this.room);
							} else {
								return this.errorReply(this.mlt(3));
							}
						}

						let width = result.width;
						let height = result.height;

						let h = IMAGE_HEIGHT;
						let w = Math.floor(width * IMAGE_HEIGHT / height);

						if (w > MAX_CHAT_WIDTH) {
							w = MAX_CHAT_WIDTH;
							h = Math.floor(height * MAX_CHAT_WIDTH / width);
						}

						imageCache.cache(url.href, {
							image: realURL,
							link: url.href,
							title: title,
							description: desc,
							w: w,
							h: h,
						});

						if (title && this.showFullLinkInfo) {
							this.send("/addhtmlbox " + createImageHtmlBoxExtended(realURL, url.href, title, desc, w, h), this.room);
						} else {
							this.send("/addhtmlbox " + createImageHtmlBox(realURL, url.href, title || url.href, w, h, this.hideImage), this.room);
						}
					}.bind(this));
				}.bind(this));
				response.on('error', function (err) {
					return this.errorReply((this.mlt(4) + "").replace("#ERR", err.message));
				}.bind(this));
			} else {
				// Is an image (probably)

				probe(response, function (err, result) {
					req.abort();
					if (err) {
						return this.errorReply(this.mlt(3));
					}

					let width = result.width;
					let height = result.height;

					let h = IMAGE_HEIGHT;
					let w = Math.floor(width * IMAGE_HEIGHT / height);

					if (w > MAX_CHAT_WIDTH) {
						w = MAX_CHAT_WIDTH;
						h = Math.floor(height * MAX_CHAT_WIDTH / width);
					}

					imageCache.cache(url.href, {
						image: url.href,
						link: url.href,
						title: "",
						w: w,
						h: h,
					});

					this.send("/addhtmlbox " + createImageHtmlBox(url.href, url.href, url.href, w, h, this.hideImage), this.room);
				}.bind(this));
			}
		}.bind(this));

		req.on('error', function (err) {
			return this.errorReply((this.mlt(4) + "").replace("#ERR", err.message));
		}.bind(this));

		req.on('timeout', function () {
			req.abort();
		});
	},
};
