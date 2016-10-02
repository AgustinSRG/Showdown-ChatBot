/**
 * Battle manager
 */

'use strict';

const Path = require('path');
const DataBase = Tools.get('json-db.js');

exports.setup = function (App) {
	const Battle = require(Path.resolve(__dirname, 'battle.js')).setup(App);
	const autoJoinDataBase = new DataBase(Path.resolve(App.confDir, "battle-autojoin-tmp.json"));

	return {
		battles: {},
		battlesCount: 0,

		init: function () {
			for (let room in this.battles) {
				try {
					this.battles[room].destroy();
				} catch (e) {}
				delete this.battles[room];
			}
			this.battlesCount = 0;
		},

		autoJoinData: autoJoinDataBase.data,

		tryJoinAbandonedBattles: function () {
			let cmds = [];
			for (let i in this.autoJoinData) {
				if (!this.battles[i]) {
					cmds.push('|/join ' + i);
					cmds.push(i + '|/joinbattle');
				}
				delete this.autoJoinData[i];
			}
			autoJoinDataBase.write();
			return cmds;
		},

		updateBattleAutojoin: function () {
			for (let i in this.autoJoinData) {
				delete this.autoJoinData[i];
			}
			for (let room in this.battles) {
				this.autoJoinData[room] = 1;
			}
			autoJoinDataBase.write();
		},

		receive: function (room, data, isIntro) {
			if (data.charAt(0) === ">") return;
			let spl = data.substr(1).split("|");
			if (spl[0] === 'init') {
				if (this.battles[room]) {
					try {
						this.battles[room].destroy();
					} catch (e) {}
				}
				this.battles[room] = new Battle(room);
				this.battlesCount++;
				this.updateBattleAutojoin();
			}
			if (this.battles[room]) {
				this.battles[room].add(data, isIntro);
			}
			if (spl[0] === 'deinit' || spl[0] === 'expire') {
				if (this.battles[room]) {
					try {
						this.battles[room].destroy();
					} catch (e) {}
					delete this.battles[room];
					this.battlesCount--;
					this.updateBattleAutojoin();
				}
			}
		},

		destroy: function () {
			for (let room in this.battles) {
				try {
					this.battles[room].destroy();
				} catch (e) {}
				delete this.battles[room];
				this.battlesCount--;
			}
		},
	};
};
