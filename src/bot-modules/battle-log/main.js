/**
 * Bot Module: Battle Log
 */

'use strict';

const Text = Tools('text');
const Path = require('path');
const FileSystem = require('fs');
const ReadLine = require('readline');

exports.setup = function (App) {
	if (!App.config.modules.battlelog) {
		App.config.modules.battlelog = {
			maxbattles: 64,
		};
	}

	const BattleLogMod = {};

	BattleLogMod.db = App.dam.getDataBase('battle-log.json');
	BattleLogMod.data = BattleLogMod.db.data;
	BattleLogMod.path = Path.resolve(App.logsDir, "battle/");

	if (!BattleLogMod.data.rooms) {
		BattleLogMod.data.rooms = {};
	}

	BattleLogMod.saveData = function () {
		this.db.write();
	};

	BattleLogMod.active = {};

	BattleLogMod.getFiles = function () {
		return Object.values(BattleLogMod.data.rooms).sort(function (a, b) {
			if (a.time > b.time) {
				return -1;
			} else if (a.time < b.time) {
				return 1;
			} else {
				return 0;
			}
		}).map(function (a) {
			try {
				const file = Path.resolve(BattleLogMod.path, a.id + ".log");
				const stats = FileSystem.statSync(file);
				const date = new Date(a.time);
				return {
					id: a.id,
					file: a.id + ".log",
					title: a.title,
					date: date.toISOString(),
					size: stats ? (Math.floor((stats.size / 1024) * 100) / 100) : 0,
					psim: App.server.getPokeSimLink("/" + a.id + "-" + a.token),
				};
			} catch (ex) {
				App.reportCrash(ex);
				return a;
			}
		}).filter(function (a) {
			return a.size !== undefined;
		});
	};

	BattleLogMod.sweep = function () {
		const maxBattles = App.config.modules.battlelog.maxbattles;
		if (!maxBattles || maxBattles < 0) return;
		const battles = Object.values(BattleLogMod.data.rooms).sort(function (a, b) {
			if (a.time > b.time) {
				return -1;
			} else if (a.time < b.time) {
				return 1;
			} else {
				return 0;
			}
		});

		while (battles.length > maxBattles) {
			const battleToRemove = battles.pop();
			const id = battleToRemove.id;

			if (BattleLogMod.active[id]) {
				BattleLogMod.active[id].close();
				delete BattleLogMod.active[id];
			}

			delete BattleLogMod.data.rooms[id];

			const file = Path.resolve(BattleLogMod.path, id + ".log");

			FileSystem.unlink(file, function (err) {
				if (err) {
					App.reportCrash(err);
				}
			});
		}

		BattleLogMod.saveData();
	};


	App.bot.on('line', (room, line, spl, isIntro) => {
		if (spl[0] === "init" && spl[1] === "battle") {
			if (BattleLogMod.active[room]) {
				BattleLogMod.active[room].close();
			}
			BattleLogMod.active[room] = FileSystem.createWriteStream(Path.resolve(BattleLogMod.path, room + ".log"), { flags: 'a+' });
			BattleLogMod.data.rooms[room] = {
				id: room,
				title: "",
				time: Date.now(),
				token: Text.randomNumber(8),
			};
			BattleLogMod.sweep();
			BattleLogMod.saveData();
		}

		if (!BattleLogMod.active[room]) {
			return;
		}

		if (spl[0] === "request") {
			return; // Ignore requests
		}

		if (spl[0] === "deinit") {
			BattleLogMod.active[room].close();
			delete BattleLogMod.active[room];
			return;
		}

		if (spl[0] === "title") {
			BattleLogMod.data.rooms[room].title = spl[1] || "";
			BattleLogMod.saveData();
		}

		BattleLogMod.active[room].write(line + "\n");
	});

	App.server.websoketHandlers.push(function (ws, req) {
		if ((req.url + "").startsWith("/showdown/")) {
			let waiting = true;
			let closed = false;
			let timeout = setTimeout(function () {
				if (waiting) {
					ws.send("a" + JSON.stringify(["|popup|Timed out"]));
					ws.close();
				}
			}, 5000);

			ws.on("close", function () {
				closed = true;
			});

			ws.on("message", function (data) {
				if (!waiting) return;
				data = data.utf8Data || data;
				if (typeof data !== "string") {
					data = JSON.stringify(data);
				}
				if (data.length > 1024) return; // Too big
				if (data.charAt(0) !== "[") return; // Invalid
				let msg;

				try {
					msg = JSON.parse(data);
				} catch (ex) {
					return; // Invalid JSON
				}

				const realMsg = msg[0] + "";

				if (realMsg.startsWith("|/join ")) {
					waiting = false;
					clearTimeout(timeout);
					let room = Text.toRoomid(realMsg.substr("|/join ".length));
					let la = room.lastIndexOf("-");

					if (la < 0) {
						ws.send("a" + JSON.stringify(["|popup|The battle you requested does not exists"]));
						ws.close(); // Not found
						return;
					}

					let token = room.substr(la + 1);
					room = room.substr(0, la);

					if (!BattleLogMod.data.rooms[room] || BattleLogMod.data.rooms[room].token !== token) {
						ws.send("a" + JSON.stringify(["|popup|The battle you requested does not exists"]));
						ws.close(); // Not found
						return;
					}

					ws.send("a" + JSON.stringify([">" + room + "-" + token + "\n|deinit|"]));

					const file = Path.resolve(BattleLogMod.path, room + ".log");

					if (!FileSystem.existsSync(file)) {
						ws.send("a" + JSON.stringify(["|popup|The log file does not exists"]));
						ws.close(); // Not found
						return;
					}


					// Read lines (stream)

					try {
						const lineReader = ReadLine.createInterface({
							input: FileSystem.createReadStream(file)
						});

						let buffer = [];

						lineReader.on('line', function (line) {
							if (closed) {
								lineReader.close();
								return;
							}
							if (line) {
								buffer.push(line);

								if (buffer.length >= 64) {
									ws.send("a" + JSON.stringify([">" + room + "\n" + buffer.join("\n")]));
									buffer = [];
								}
							}
						});

						lineReader.on('close', function () {
							if (closed) return;
							if (buffer.length > 0) {
								ws.send("a" + JSON.stringify([">" + room + "\n" + buffer.join("\n")]));
								buffer = [];
							}
							ws.send("a" + JSON.stringify(["|popup|Your battle is ready! Work offline using this client to spectate the battle."]));
							ws.close();
						});
					} catch (ex) {
						App.reportCrash(ex);
						ws.send("a" + JSON.stringify(["|popup|Internal error while reading the file."]));
						ws.close(); // Not found
						return;
					}
				}
			});

			ws.send("o");

			ws.send("a" + JSON.stringify([">lobby\n|deinit|"]));

			return true;
		}
	});

	return BattleLogMod;
};
