/**
 * External battle service client
 */

'use strict';

const HTTP = require('http');
const HTTPS = require('https');

const FAILURE_RETRY_DELAY = 2000;
const MAX_FAILURE_COUNT = 10;

exports.setup = function (App) {
	if (!App.config.modules.battle.externalService) {
		App.config.modules.battle.externalService = {
			enabled: false,
			url: "http://127.0.0.1:8081",
			authToken: "",
			authHeader: "Authorization",
		};
	}

	return {
		pendingUpdates: new Map(),
		busy: false,
		retryTimeout: null,

		isEnabled: function () {
			return !!App.config.modules.battle.externalService.enabled;
		},

		getOrCreatePendingUpdate: function (id) {
			if (!this.pendingUpdates.has(id)) {
				this.pendingUpdates.set(id, {
					id: id,
					nonce: 0,
					decideNonce: 0,
					log: [],
					decide: false,
					clear: false,
					callback: null,
					failureCount: 0,
				});
			}

			return this.pendingUpdates.get(id);
		},

		addBattleLine: function (id, line) {
			const pu = this.getOrCreatePendingUpdate(id);

			pu.log.push(line);
			pu.nonce++;

			this.flush();
		},

		decide: function (id, callback) {
			const pu = this.getOrCreatePendingUpdate(id);

			if (pu.callback) {
				try {
					pu.callback("");
				} catch (ex) {
					App.reportCrash(ex);
				}
			}

			pu.decide = true;
			pu.decideNonce++;
			pu.callback = callback;
			pu.nonce++;

			this.flush();
		},

		clearBattle: function (id) {
			const pu = this.getOrCreatePendingUpdate(id);

			pu.clear = true;
			pu.nonce++;

			this.flush();
		},

		clearPending: function () {
			this.pendingUpdates.forEach(pu => {
				if (pu.callback) {
					try {
						pu.callback(null);
					} catch (ex) {
						App.reportCrash(ex);
					}
				}
			});
			this.pendingUpdates.clear();
		},

		onRequestFailed: function (toFlush) {
			toFlush.forEach(pu => {
				pu.failureCount++;

				if (pu.callback) {
					try {
						pu.callback(null);
					} catch (ex) {
						App.reportCrash(ex);
					}
					pu.callback = null;
				}

				if (pu.clear || pu.failureCount > MAX_FAILURE_COUNT) {
					this.pendingUpdates.delete(pu.id);
				}
			});
		},

		setupRetry: function () {
			if (this.retryTimeout) {
				clearTimeout(this.retryTimeout);
				this.retryTimeout = null;
			}

			this.retryTimeout = setTimeout(() => {
				this.retryTimeout = null;
				this.busy = false;
				this.flush();
			}, FAILURE_RETRY_DELAY);
		},

		flush: function () {
			if (this.busy) {
				return;
			}

			const toFlush = Array.from(this.pendingUpdates.values());

			if (toFlush.length === 0) {
				return;
			}

			const requestBody = toFlush.map(pu => {
				return {
					id: pu.id,
					log: pu.log.slice(),
					decide: pu.decide,
					clear: pu.clear,
				};
			});

			const recoveryData = new Map();

			toFlush.forEach(pu => {
				recoveryData.set(pu.id, {
					decide: pu.decide,
					clear: pu.clear,
					nonce: pu.nonce,
					decideNonce: pu.decideNonce,
					logLength: pu.log.length,
				});
			});

			if (!this.isEnabled()) {
				this.clearPending();
				return;
			}

			let url;

			try {
				url = new URL("./battle-bot", App.config.modules.battle.externalService.url + "");
			} catch (ex) {
				App.reportCrash(ex);
				this.clearPending();
				return;
			}

			const http = url.protocol === "https:" ? HTTPS : HTTP;

			const headers = Object.create(null);

			headers[App.config.modules.battle.externalService.authHeader || "Authorization"] = App.config.modules.battle.externalService.authToken;
			headers["Content-Type"] = "application/json; charset=utf-8";

			const requestOptions = {
				method: "POST",
				headers: headers,
			};

			this.busy = true;

			const req = http.request(url, requestOptions, res => {
				let bodyStr = "";

				res.setEncoding('utf8');

				res.on('data', chunk => {
					bodyStr += chunk;
				});

				res.on('end', () => {
					if (res.statusCode !== 200) {
						// Request failed
						App.log("[ERROR] Failed calling external battle bot service (" + url.toString() + "): Status code: " + res.statusCode + "\n" + bodyStr);
						this.onRequestFailed(toFlush);
						this.setupRetry();
						return;
					}

					let body;

					try {
						body = JSON.parse(bodyStr);
					} catch (ex) {
						App.log("[ERROR] Failed calling external battle bot service (" + url.toString() + "): Invalid JSON body:\n" + bodyStr);
						this.onRequestFailed(toFlush);
						this.setupRetry();
						return;
					}

					const responses = new Map();

					if (Array.isArray(body)) {
						for (let bodyRes of body) {
							if (!bodyRes || typeof bodyRes !== "object") {
								continue;
							}

							const id = bodyRes.id + "";
							let decision = bodyRes.decision;

							if (typeof decision !== "string") {
								decision = null;
							}

							responses.set(id, decision);
						}
					}

					toFlush.forEach(pu => {
						const recovery = recoveryData.get(pu.id);

						let decision = responses.has(pu.id) ? responses.get(pu.id) : null;

						if (recovery.decide && pu.callback) {
							try {
								pu.callback(decision);
							} catch (ex) {
								App.reportCrash(ex);
							}

							pu.callback = null;
						}

						if (recovery.clear || pu.nonce === recovery.nonce) {
							this.pendingUpdates.delete(pu.id);
						} else {
							if (recovery.decide && recovery.decideNonce === pu.decideNonce) {
								pu.decide = false;
							}
							if (recovery.logLength > 0) {
								pu.log = pu.log.slice(recovery.logLength);
							}
						}
					});

					this.busy = false;
					this.flush();
				});
			});

			req.on("error", e => {
				App.log("[ERROR] Failed calling external battle bot service (" + url.toString() + "): " + e.message);
				this.onRequestFailed(toFlush);
				this.setupRetry();
			});

			req.write(JSON.stringify(requestBody));
			req.end();
		},
	};
};
