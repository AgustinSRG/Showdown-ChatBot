/**
 * Players Auction (for Showdown ChatBot)
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'auction.translations');

class PlayersAuction {
	constructor(Mod, room) {
		this.room = room;
		this.mod = Mod;
		this.data = this.mod.linkAuctionData(this.room);

		if (!this.data.timer) this.data.timer = (30 * 1000);
		if (!this.data.mincost) this.data.mincost = 4;
		if (!this.data.minplayers) this.data.minplayers = 0;
		if (!this.data.teams) this.data.teams = {};
		if (!this.data.players) this.data.players = {};
		if (!this.data.turn) this.data.turn = "";

		this.status = "paused";
		this.timer = null;
		this.nominated = null;
		this.nominatedTeam = null;
		this.nominatedCost = 0;
	}

	send(text) {
		this.mod.sendTo(this.room, text);
	}

	saveData() {
		this.mod.saveData();
	}

	mlt(key, vars) {
		return this.mod.mlt(Lang_File, this.room, key, vars);
	}

	clearTimer() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		this.status = "paused";
	}

	addPlayer(name) {
		let id = Text.toId(name);
		if (id && !this.data.players[id]) {
			this.data.players[id] = {
				id: id,
				name: name,
				team: null,
				cost: 0,
			};
			return true;
		} else {
			return false;
		}
	}

	removePlayer(id) {
		if (this.data.players[id]) {
			delete this.data.players[id];
			return true;
		} else {
			return false;
		}
	}

	getPlayer(dirty) {
		let id = Text.toId(dirty);
		return this.data.players[id];
	}

	addTeam(name) {
		let id = Text.toId(name);
		if (id && id.length < 20 && !this.data.teams[id]) {
			this.data.teams[id] = {
				id: id,
				name: name,
				money: 0,
				captain: "",
				subcaptain: "",
			};
			return true;
		} else {
			return false;
		}
	}

	removeTeam(id) {
		if (this.data.teams[id]) {
			for (let player in this.data.players) {
				if (this.data.players[player].team === id) {
					this.setFreePlayer(this.data.players[player]);
				}
			}
			if (this.data.turn === id) this.data.turn = "";
			delete this.data.teams[id];
			return true;
		} else {
			return false;
		}
	}

	getTeam(dirty) {
		let id = Text.toId(dirty);
		return this.data.teams[id];
	}

	getTeamByMember(userid) {
		for (let team in this.data.teams) {
			if (this.data.teams[team].captain === userid || this.data.teams[team].subcaptain === userid) {
				return this.data.teams[team];
			}
		}
		return null;
	}

	setPlayerToTeam(player, team, cost) {
		player.team = team.id;
		player.cost = cost;
	}

	setFreePlayer(player) {
		let fdata = {cost: player.cost, team: player.team};
		if (player.team) {
			let team = this.getTeam(player.team);
			if (team) {
				team.money += player.cost;
				fdata.team = team.name;
			}
		}
		player.team = null;
		player.cost = 0;
		return fdata;
	}

	/* Active */

	setTurn(team) {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		this.data.turn = team.id;
		this.status = "paused";
	}

	setNextTurn() {
		let teams = Object.keys(this.data.teams);
		if (teams.length === 0) return;
		if (teams.length === 1) {
			this.setTurn(this.data.teams[teams[0]]);
		} else {
			let i = teams.indexOf(this.data.turn);
			if (i === -1) {
				this.setTurn(this.data.teams[teams[0]]);
			} else if (i >= (teams.length - 1)) {
				this.setTurn(this.data.teams[teams[0]]);
			} else {
				this.setTurn(this.data.teams[teams[i + 1]]);
			}
		}
		this.send(this.mlt(0, {team: Chat.bold(this.getTeam(this.data.turn).name)}));
	}

	nominate(player, team) {
		if (this.status !== "paused") return;
		this.nominated = player;
		this.nominatedCost = this.data.mincost;
		this.nominatedTeam = team;
		this.status = "nominated";
		this.timer = setTimeout(this.timeout.bind(this), this.data.timer);
	}

	playersForTeam(team) {
		let players = [];
		for (let player in this.data.players) {
			if (this.data.players[player].team === team.id) players.push(this.data.players[player]);
		}
		return players;
	}

	getFreePlayers() {
		let players = [];
		for (let player in this.data.players) {
			if (!this.data.players[player].team) players.push(this.data.players[player]);
		}
		return players;
	}

	bid(team, cost) {
		if (this.status !== "nominated") return false;
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		this.nominatedCost = cost;
		this.nominatedTeam = team;
		this.timer = setTimeout(this.timeout.bind(this), this.data.timer);
		return true;
	}

	timeout(forced) {
		if (this.status !== "nominated") return;
		this.status = "paused";
		if (this.timer && forced) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		this.timer = null;
		this.setPlayerToTeam(this.nominated, this.nominatedTeam, this.nominatedCost);
		this.nominatedTeam.money -= this.nominatedCost;

		if (!forced) {
			this.send(this.mlt(1, {player: Chat.italics(this.nominated.name),
				team: Chat.italics(this.nominatedTeam.name), cost: Chat.italics(this.nominatedCost + "K")}));
		} else {
			this.send(this.mlt(2, {player: Chat.italics(this.nominated.name),
				team: Chat.italics(this.nominatedTeam.name), cost: Chat.italics(this.nominatedCost + "K")}));
		}

		this.nominated = null;
		this.setNextTurn();
		this.saveData();
	}
}

module.exports = PlayersAuction;
