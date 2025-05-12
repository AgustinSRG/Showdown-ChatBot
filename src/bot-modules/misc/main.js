
// Misc module

'use strict';

const Chat = Tools('chat');
const Text = Tools('text');

const USER_COLOR_GLOBAL_CONFIG_1 = 'https://play.pokemonshowdown.com/config/config.js';
const USER_COLOR_GLOBAL_CONFIG_2 = 'https://play.pokemonshowdown.com/config/colors.json';

function parseColorsFromJs(jsText) {
	const colors = Object.create(null);

	((jsText.split("\nConfig.customcolors = {")[1] || "").split("};\n")[0] || "").split("\n").map(line => {
		line = line.trim();
		const lineParts = line.split("': '");

		if (lineParts.length < 2) {
			return null;
		}

		const username = Text.toId(lineParts[0].split("'")[1] || "");
		const mapped = Text.toId(lineParts[1].split("'")[0] || "");

		return {
			username: username,
			mapped: mapped,
		};
	}).filter(c => c !== null).forEach(color => {
		colors[color.username] = color.mapped;
	});

	return colors;
}

function parseColorsFromJson(json) {
	let colors;
	try {
		colors = JSON.parseNoPrototype(json);
	} catch (ex) {
		return Object.create(null);
	}

	if (!colors || typeof colors !== "object" || Array.isArray(colors)) {
		return Object.create(null);
	}

	return colors;
}

exports.setup = function (App) {
	const MiscModule = Object.create(null);

	MiscModule.customColors = Object.create(null);

	MiscModule.getCustomColor = function (name) {
		name = Text.toId(name);
		if (this.customColors[name]) {
			return Chat.usernameColor(this.customColors[name]);
		} else {
			return null;
		}
	};

	MiscModule.getLocalCustomColorsUrl = function () {
		const serverId = App.config.bot.serverid;

		if (!serverId || serverId === 'showdown') {
			return null;
		}

		return 'https://' + encodeURIComponent(serverId) + '.psim.us/config/colors.json';
	};

	MiscModule.globalColors1 = Object.create(null);
	MiscModule.globalColors2 = Object.create(null);
	MiscModule.localColors = Object.create(null);

	MiscModule.downloadingCustomColors = false;

	MiscModule.downloadCustomColors = function () {
		if (this.downloadingCustomColors) {
			return;
		}

		this.downloadingCustomColors = true;

		App.data.wget(USER_COLOR_GLOBAL_CONFIG_1, (res1, err1) => {
			if (res1 && !err1) {
				this.globalColors1 = parseColorsFromJs(res1);
			} else if (err1) {
				App.debug("[Misc] Error while downloading " + USER_COLOR_GLOBAL_CONFIG_1 + " / " + err1.message + "\n" + err1.stack);
			}

			App.data.wget(USER_COLOR_GLOBAL_CONFIG_2, (res2, err2) => {
				if (res2 && !err2) {
					this.globalColors2 = parseColorsFromJson(res2);
				} else if (err2) {
					App.debug("[Misc] Error while downloading " + USER_COLOR_GLOBAL_CONFIG_2 + " / " + err2.message + "\n" + err2.stack);
				}

				const localColorsUrl = this.getLocalCustomColorsUrl();

				if (localColorsUrl) {
					App.data.wget(localColorsUrl, (res3, err3) => {
						if (res3 && !err3) {
							this.localColors = parseColorsFromJson(res3);
						} else if (err3) {
							App.debug("[Misc] Error while downloading " + localColorsUrl + " / " + err3.message + "\n" + err3.stack);
						}

						this.applyDownloadedColors();
						this.downloadingCustomColors = false;
					});
				} else {
					this.localColors = Object.create(null);
					this.applyDownloadedColors();
					this.downloadingCustomColors = false;
				}
			});
		});
	};

	MiscModule.applyDownloadedColors = function () {
		this.customColors = Object.create(null);

		for (let u of Object.keys(this.globalColors1)) {
			this.customColors[u] = this.globalColors1[u] + "";
		}

		for (let u of Object.keys(this.globalColors2)) {
			this.customColors[u] = this.globalColors2[u] + "";
		}

		for (let u of Object.keys(this.localColors)) {
			this.customColors[u] = this.localColors[u] + "";
		}

		const countColors = {
			total: Object.keys(this.customColors).length,
			global: Object.keys(this.customColors).length - Object.keys(this.localColors).length,
			local: Object.keys(this.localColors).length,
		};

		App.log("[Misc] Downloaded custom colors (" + countColors.total + " total, " + countColors.global + " global, " + countColors.local + " local)");
	};

	MiscModule.start = function () {
		App.bot.on('formats', () => {
			this.downloadCustomColors();
		});

		this.downloadCustomColors();
	};

	MiscModule.start();

	return MiscModule;
};
