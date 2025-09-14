
// User profiles module

'use strict';

const Path = require('path');
const Chat = Tools('chat');
const Text = Tools('text');
const Https = require('https');
const Http = require('http');
const Cache = Tools('cache').BufferCache;

const BattleAvatarNames = require(Path.resolve(__dirname, "avatars.js"));

const USER_COLOR_GLOBAL_CONFIG_1 = 'https://play.pokemonshowdown.com/config/config.js';
const USER_COLOR_GLOBAL_CONFIG_2 = 'https://play.pokemonshowdown.com/config/colors.json';

function getUrlReferer(url, referer, callback) {
	url = new URL(url);
	let mod = url.protocol === 'https:' ? Https : Http;
	mod.request(url.toString(), { headers: { 'Referer': referer } }, response => {
		let data = '';
		if (response.statusCode !== 200) {
			callback(null, new Error("Server responded with status code " + response.statusCode));
			return;
		}
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
	}).end();
}

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
	const ProfilesModule = Object.create(null);

	ProfilesModule.db = App.dam.getDataBase('user-profiles.json');
	ProfilesModule.data = ProfilesModule.db.data;

	if (!ProfilesModule.data.profileImages) {
		ProfilesModule.data.profileImages = Object.create(null);
	}

	if (!ProfilesModule.data.badges) {
		ProfilesModule.data.badges = Object.create(null);
	}

	ProfilesModule.customColors = Object.create(null);

	ProfilesModule.getCustomColor = function (name) {
		name = Text.toId(name);
		if (this.customColors[name]) {
			return Chat.usernameColor(this.customColors[name]);
		} else {
			return null;
		}
	};

	ProfilesModule.getCustomColorUsername = function (name) {
		name = Text.toId(name);
		if (this.customColors[name]) {
			return this.customColors[name];
		} else {
			return null;
		}
	};

	ProfilesModule.getLocalCustomColorsUrl = function () {
		const serverId = App.config.bot.serverid;

		if (!serverId || serverId === 'showdown') {
			return null;
		}

		return 'https://' + encodeURIComponent(serverId) + '.psim.us/config/colors.json';
	};

	ProfilesModule.getClientUrl = function () {
		const serverId = App.config.bot.serverid;

		if (!serverId || serverId === 'showdown') {
			return "https://play.pokemonshowdown.com/";
		}

		return 'https://' + encodeURIComponent(serverId) + '.psim.us';
	};

	ProfilesModule.globalColors1 = Object.create(null);
	ProfilesModule.globalColors2 = Object.create(null);
	ProfilesModule.localColors = Object.create(null);

	ProfilesModule.downloadingCustomColors = false;

	ProfilesModule.downloadCustomColors = function () {
		if (this.downloadingCustomColors) {
			return;
		}

		this.downloadingCustomColors = true;

		getUrlReferer(USER_COLOR_GLOBAL_CONFIG_1, this.getClientUrl(), (res1, err1) => {
			if (res1 && !err1) {
				this.globalColors1 = parseColorsFromJs(res1);
			} else if (err1) {
				App.debug("[ProfilesModule] Error while downloading " + USER_COLOR_GLOBAL_CONFIG_1 + " / " + err1.message + "\n" + err1.stack);
			}

			App.data.wget(USER_COLOR_GLOBAL_CONFIG_2, (res2, err2) => {
				if (res2 && !err2) {
					this.globalColors2 = parseColorsFromJson(res2);
				} else if (err2) {
					App.debug("[ProfilesModule] Error while downloading " + USER_COLOR_GLOBAL_CONFIG_2 + " / " + err2.message + "\n" + err2.stack);
				}

				const localColorsUrl = this.getLocalCustomColorsUrl();

				if (localColorsUrl) {
					App.data.wget(localColorsUrl, (res3, err3) => {
						if (res3 && !err3) {
							this.localColors = parseColorsFromJson(res3);
						} else if (err3) {
							App.debug("[ProfilesModule] Error while downloading " + localColorsUrl + " / " + err3.message + "\n" + err3.stack);
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

	ProfilesModule.applyDownloadedColors = function () {
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

		App.log("[ProfilesModule] Downloaded custom colors (" + countColors.total + " total, " + countColors.global + " global, " + countColors.local + " local)");
	};

	ProfilesModule.regDataStatus = {
		cache: new Cache(10),
		callbackMap: new Map(),
	};

	ProfilesModule.getRegisterData = function (target, callback) {
		target = Text.toId(target);
		const cachedData = this.regDataStatus.cache.get(target);

		if (cachedData) {
			return callback(cachedData);
		}

		if (this.regDataStatus.callbackMap.has(target)) {
			this.regDataStatus.callbackMap.get(target).push(callback);
			return;
		}

		let url = "https://pokemonshowdown.com/users/" + target + ".json";

		this.regDataStatus.callbackMap.set(target, [callback]);

		App.data.wget(url, (data, err) => {
			const callbacks = this.regDataStatus.callbackMap.get(target) || [];

			this.regDataStatus.callbackMap.delete(target);

			if (err) {
				for (let cb of callbacks) {
					try {
						// eslint-disable-next-line callback-return
						cb(null, err);
					} catch (ex) {
						App.reportCrash(ex);
					}
				}
				return;
			}

			try {
				data = JSON.parseNoPrototype(data);
			} catch (error) {
				for (let cb of callbacks) {
					try {
						// eslint-disable-next-line callback-return
						cb(null, error);
					} catch (ex) {
						App.reportCrash(ex);
					}
				}
				return;
			}

			if (typeof data.registertime !== "number" || data.registertime <= 0) {
				// User not registered
				for (let cb of callbacks) {
					try {
						// eslint-disable-next-line callback-return
						cb(null);
					} catch (ex) {
						App.reportCrash(ex);
					}
				}
				return;
			}

			this.regDataStatus.cache.cache(target, data);

			for (let cb of callbacks) {
				try {
					// eslint-disable-next-line callback-return
					cb(data);
				} catch (ex) {
					App.reportCrash(ex);
				}
			}
		});
	};

	ProfilesModule.queryResponseCallbacks = new Map();

	ProfilesModule.getUserDetails = function (user, callback) {
		user = Text.toId(user);
		if (this.queryResponseCallbacks.has(user)) {
			this.queryResponseCallbacks.get(user).callbacks.push(callback);
			return;
		}

		const cbData = {
			callbacks: [callback],
			timeout: setTimeout(() => {
				const c = this.queryResponseCallbacks.get(user);

				if (!c) {
					return;
				}

				this.queryResponseCallbacks.delete(user);

				for (let cb of c.callbacks) {
					try {
						// eslint-disable-next-line callback-return
						cb(null);
					} catch (ex) {
						App.reportCrash(ex);
					}
				}
			}, 10000),
		};

		this.queryResponseCallbacks.set(user, cbData);

		App.bot.send(["|/cmd userdetails " + user]);
	};

	ProfilesModule.getUserProfileInfo = function (user, callback) {
		user = Text.toId(user);

		const result = {
			id: user,
			name: user,
			avatar: "lucas",
			status: "",
			group: " ",
			online: false,
			color: this.getCustomColor(user) || Chat.usernameColor(user),
			regDate: null,
			regName: user,
			lastSeen: App.userdata.getLastSeen(user),
			profileImage: this.data.profileImages[user] || null,
			badges: Object.values(this.data.badges).filter(badge => {
				return badge.holders && badge.holders[user];
			}),
		};

		let userDetailsFetched = false;
		let registerDataFetched = false;

		this.getUserDetails(user, queryResponse => {
			userDetailsFetched = true;

			if (queryResponse && (!queryResponse.userid || queryResponse.userid === user)) {
				result.name = (queryResponse.name || result.name) + "";
				result.online = !!queryResponse.rooms;
				result.avatar = (BattleAvatarNames[queryResponse.avatar] || queryResponse.avatar || "lucas") + "";
				result.status = (queryResponse.status || "") + "";
				result.group = (queryResponse.group || " ") + "";
			}

			if (registerDataFetched) {
				return callback(result);
			}
		});

		this.getRegisterData(user, registerData => {
			registerDataFetched = true;

			if (registerData) {
				result.regDate = new Date(registerData.registertime * 1000);
				result.regName = (registerData.username || user) + "";
			}

			if (userDetailsFetched) {
				return callback(result);
			}
		});
	};

	ProfilesModule.start = function () {
		App.bot.on('formats', () => {
			this.downloadCustomColors();
		});

		App.bot.on('connect', () => {
			this.queryResponseCallbacks.forEach(c => {
				clearTimeout(c.timeout);

				for (let cb of c.callbacks) {
					try {
						// eslint-disable-next-line callback-return
						cb(null);
					} catch (ex) {
						App.reportCrash(ex);
					}
				}
			});
			this.queryResponseCallbacks.clear();
		});

		App.bot.on('queryresponse', response => {
			if (!response.startsWith("userdetails|")) {
				return;
			}

			response = response.substring("userdetails|".length);

			let parsedResponse = null;

			try {
				parsedResponse = JSON.parseNoPrototype(response);
			} catch (ex) { }

			if (typeof parsedResponse !== "object" || !parsedResponse || typeof parsedResponse.id !== "string") {
				parsedResponse = null;
			}

			if (!parsedResponse) {
				return;
			}

			const userId = Text.toId(parsedResponse.id);

			const cbData = this.queryResponseCallbacks.get(userId);

			if (!cbData) {
				return;
			}

			clearTimeout(cbData.timeout);

			this.queryResponseCallbacks.delete(userId);

			for (let cb of cbData.callbacks) {
				try {
					// eslint-disable-next-line callback-return
					cb(parsedResponse);
				} catch (ex) {
					App.reportCrash(ex);
				}
			}
		});

		this.downloadCustomColors();
	};

	ProfilesModule.start();

	return ProfilesModule;
};
