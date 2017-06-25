/**
 * Players Auction Commands (Configuration)
 */

'use strict';

const Path = require('path');
const Chat = Tools('chat');
const Text = Tools('text');
const LineSplitter = Tools('line-splitter');

const Lang_File = Path.resolve(__dirname, 'auction.translations');

module.exports = {
	makeauction: function (App) {
		this.setLangFile(Lang_File);
		let room = this.targetRoom;
		if (!this.can('makeauction', this.room)) return this.replyAccessDenied('makeauction');
		if (this.getRoomType(room) !== 'chat') return this.errorReply(this.mlt('nochat'));
		if (App.modules.playersauction.system.rooms[room]) return this.errorReply(this.mlt(49, {room: Chat.italics(this.parser.getRoomTitle(room))}));
		App.modules.playersauction.system.createAuction(room);
		App.modules.playersauction.system.saveData();
		this.addToSecurityLog();
		this.reply(this.mlt(50, {room: Chat.italics(this.parser.getRoomTitle(room))}));
	},

	auction: function (App) {
		this.setLangFile(Lang_File);
		let auction = App.modules.playersauction.system.rooms[this.targetRoom || ""];
		if (!auction) return this.errorReply(this.mlt('err2'));
		let opt = Text.toId(this.args[0]);

		switch (opt) {
		case 'report':
			this.cmd = 'auctionreport';
			return this.parser.exec(this);
		case 'status':
			this.cmd = 'auctionstaus';
			return this.parser.exec(this);
		case 'teams':
			this.cmd = 'auctionteams';
			return this.parser.exec(this);
		case 'teaminfo':
			this.cmd = 'auctionteaminfo';
			this.arg = this.args.slice(1).join(',');
			this.args = this.arg.split(',');
			return this.parser.exec(this);
		case 'players':
			this.cmd = 'auctionplayers';
			return this.parser.exec(this);
		case 'freeplayers':
			this.cmd = 'auctionfreeplayers';
			return this.parser.exec(this);
		}

		if (!this.can('auction', this.room)) return this.replyAccessDenied('auction');
		if (auction.status !== "paused" && opt !== 'stop') {
			return this.errorReply(this.mlt('err1'));
		}

		if (opt === 'teamadd') {
			let team = Text.trim(this.args[1]);
			if (!team || !Text.toId(team)) return this.errorReply(this.usage({desc: "team add", optional: true}, {desc: this.mlt('u1')}));
			if (auction.addTeam(team)) {
				this.reply(this.mlt(3, {team: team}));
				auction.saveData();
				this.addToSecurityLog();
			} else {
				this.errorReply(this.mlt(4));
			}
		} else if (opt === 'teamremove') {
			let team = Text.toId(this.args[1]);
			if (!team) return this.errorReply(this.usage({desc: "team remove", optional: true}, {desc: this.mlt('u2')}));
			if (auction.removeTeam(team)) {
				this.reply(this.mlt(5, {team: team}));
				auction.saveData();
				this.addToSecurityLog();
			} else {
				this.errorReply(this.mlt(6));
			}
		} else if (opt === 'playersadd') {
			if (this.args.length < 2) {
				return this.errorReply(this.usage({desc: "players add", optional: true}, {desc: this.mlt('u3')}, {desc: "...", optional: true}));
			}
			let players = [];
			for (let i = 1; i < this.args.length; i++) {
				let player = Text.trim(this.args[i]);
				if (auction.addPlayer(player)) {
					players.push(player);
				}
			}
			if (players.length) {
				this.reply(this.mlt(7, {players: players.join(', ')}));
				auction.saveData();
				this.addToSecurityLog();
			} else {
				this.errorReply(this.mlt(8));
			}
		} else if (opt === 'playersremove') {
			if (this.args.length < 2) {
				return this.errorReply(this.usage({desc: "players remove", optional: true}, {desc: this.mlt('u3')}, {desc: "...", optional: true}));
			}
			let players = [];
			for (let i = 1; i < this.args.length; i++) {
				let player = Text.trim(this.args[i]);
				if (auction.removePlayer(player)) {
					players.push(player);
				}
			}
			if (players.length) {
				this.reply(this.mlt(9, {players: players.join(', ')}));
				auction.saveData();
				this.addToSecurityLog();
			} else {
				this.errorReply(this.mlt(10));
			}
		} else if (opt === 'mincost') {
			let money = parseFloat(this.args[1]);
			if (isNaN(money) || money < 0) return this.errorReply(this.usage({desc: "mincost", optional: true}, {desc: this.mlt('u4')}));
			if ((money * 10) % 5 !== 0) return this.errorReply(this.mlt(11));
			auction.data.mincost = money;
			this.reply(this.mlt(12, {money: Chat.italics(money + "K")}));
			auction.saveData();
			this.addToSecurityLog();
		} else if (opt === 'minplayers') {
			let players = parseInt(this.args[1]);
			if (isNaN(players) || players < 0) {
				return this.errorReply(this.usage({desc: "minplayers", optional: true}, {desc: this.mlt('u5')}));
			}
			auction.data.minplayers = players;
			this.reply(this.mlt(13, {minp: Chat.italics(players)}));
			auction.saveData();
			this.addToSecurityLog();
		} else if (opt === 'timer') {
			let time = parseInt(this.args[1]);
			if (isNaN(time) || time < 0) return this.errorReply(this.usage({desc: "timer", optional: true}, {desc: this.mlt('u6')}));
			if (time < 10) return this.errorReply(this.mlt(14));
			auction.data.timer = time * 1000;
			this.reply(this.mlt(15, {seg: Chat.italics(time)}));
			auction.saveData();
			this.addToSecurityLog();
		} else if (opt === 'turn') {
			let teamId = Text.toId(this.args[1]);
			if (!teamId) return this.errorReply(this.usage({desc: "turn", optional: true}, {desc: this.mlt('u2')}));
			let team = auction.getTeam(teamId);
			if (!team) return this.errorReply(this.mlt(16, {team: Chat.italics(teamId)}));
			auction.setTurn(team);
			this.reply(this.mlt(17, {team: Chat.italics(team.name)}));
			auction.saveData();
			this.addToSecurityLog();
		} else if (opt === 'stop') {
			auction.setTurn({id: null});
			this.reply(this.mlt(18));
			auction.saveData();
			this.addToSecurityLog();
		} else if (opt === 'setmoney') {
			let teamId = Text.toId(this.args[1]);
			let money = parseFloat(this.args[2]);
			if (!teamId || isNaN(money) || money < 0) {
				return this.errorReply(this.usage({desc: "setmoney", optional: true}, {desc: this.mlt('u2')}, {desc: this.mlt('u7')}));
			}
			if ((money * 10) % 5 !== 0) return this.errorReply(this.mlt(11));
			let team = auction.getTeam(teamId);
			if (!team) return this.errorReply(this.mlt(16, {team: Chat.italics(teamId)}));
			team.money = money;
			this.reply(this.mlt(19, {team: Chat.italics(team.name), money: Chat.italics(money + "K")}));
			auction.saveData();
			this.addToSecurityLog();
		} else if (opt === 'assignplayer') {
			let teamId = Text.toId(this.args[1]);
			let id = Text.toId(this.args[2]);
			let money = parseFloat(this.args[3]);
			if (!teamId || !id || isNaN(money) || money < 0) {
				return this.errorReply(this.usage({desc: "assign player", optional: true}, {desc: this.mlt('u2')}, {desc: this.mlt('u3')}, {desc: this.mlt('u8')}));
			}
			if ((money * 10) % 5 !== 0) {
				return this.errorReply(this.mlt(11));
			}
			let team = auction.getTeam(teamId);
			if (!team) return this.errorReply(this.mlt(16, {team: Chat.italics(teamId)}));
			let player = auction.getPlayer(id);
			if (!player) return this.errorReply(this.mlt(20, {player: Chat.italics(id)}));
			if (player.team) return this.errorReply(this.mlt(37, {player: Chat.italics(id)}));
			auction.setPlayerToTeam(player, team, money);
			team.money -= money;
			if (team.money < 0) team.money = 0;
			this.reply(this.mlt(21, {player: Chat.italics(player.name), team: Chat.italics(team.name), money: Chat.italics(money + "K")}));
			auction.saveData();
			this.addToSecurityLog();
		} else if (opt === 'freeplayer') {
			let id = Text.toId(this.args[1]);
			if (!id) return this.errorReply(this.usage({desc: "free player", optional: true}, {desc: this.mlt('u3')}));
			let player = auction.getPlayer(id);
			if (!player) return this.errorReply(this.mlt(20, {player: Chat.italics(id)}));
			let fdata = auction.setFreePlayer(player);
			this.reply(this.mlt(22, {player: Chat.italics(player.name), money: Chat.italics(fdata.cost + "K"), team: Chat.italics(fdata.team)}));
			auction.saveData();
			this.addToSecurityLog();
		} else if (opt === 'captain') {
			let teamId = Text.toId(this.args[1]);
			let id = Text.toId(this.args[2]);
			if (!teamId || !id) return this.errorReply(this.usage({desc: "captain", optional: true}, {desc: this.mlt('u2')}, {desc: this.mlt('u9')}));
			let team = auction.getTeam(teamId);
			if (!team) return this.errorReply(this.mlt(16, {team: Chat.italics(teamId)}));
			team.captain = id;
			this.reply(this.mlt(23, {team: Chat.italics(team.name), user: Chat.italics(id)}));
			auction.saveData();
			this.addToSecurityLog();
		} else if (opt === 'subcaptain') {
			let teamId = Text.toId(this.args[1]);
			let id = Text.toId(this.args[2]);
			if (!teamId || !id) return this.errorReply(this.usage({desc: "subcaptain", optional: true}, {desc: this.mlt('u2')}, {desc: this.mlt('u10')}));
			let team = auction.getTeam(teamId);
			if (!team) return this.errorReply(this.mlt(16, {team: Chat.italics(teamId)}));
			team.subcaptain = id;
			this.reply(this.mlt('23b', {team: Chat.italics(team.name), user: Chat.italics(id)}));
			auction.saveData();
			this.addToSecurityLog();
		} else {
			this.errorReply(this.usage({desc: "turn | stop | mincost | minplayers | timer | teamadd | teamremove | setmoney | captain | subcaptain | playersadd | playersremove | assignplayer | freeplayer"}));
		}
	},

	auctionstaus: function (App) {
		this.setLangFile(Lang_File);
		let auction = App.modules.playersauction.system.rooms[this.targetRoom || ""];
		if (!auction) return this.errorReply(this.mlt('err2'));
		if (auction.status === "paused") {
			if (auction.data.turn) {
				this.restrictReply(this.mlt(24, {team: Chat.bold(auction.getTeam(auction.data.turn).name)}), "info");
			} else {
				this.restrictReply(this.mlt(25), "info");
			}
		} else if (auction.status === "nominated") {
			this.restrictReply(this.mlt(26, {player: Chat.bold(auction.nominated.name),
				team: Chat.italics(auction.nominatedTeam.name), cost: Chat.italics(auction.nominatedCost + "K")}), "info");
		}
	},

	auctionteams: function (App) {
		this.setLangFile(Lang_File);
		let auction = App.modules.playersauction.system.rooms[this.targetRoom || ""];
		if (!auction) return this.errorReply(this.mlt('err2'));
		let spl = new LineSplitter(this.parser.app.config.bot.maxMessageLength);
		spl.add(Chat.bold(this.mlt(27) + ":"));
		let teams = Object.values(auction.data.teams);
		if (teams.length === 0) return this.restrictReply(this.mlt(28), "info");
		for (let i = 0; i < teams.length; i++) {
			spl.add(" " + teams[i].name + (i < (teams.length - 1) ? ',' : ''));
		}
		return this.restrictReply(spl.getLines(), 'info');
	},

	auctionteaminfo: function (App) {
		this.setLangFile(Lang_File);
		let auction = App.modules.playersauction.system.rooms[this.targetRoom || ""];
		if (!auction) return this.errorReply(this.mlt('err2'));
		let teamId = Text.toId(this.arg);
		if (!teamId) return this.errorReply(this.usage({desc: this.mlt('u2')}));
		let team = auction.getTeam(teamId);
		if (!team) return this.errorReply(this.mlt(16, {team: Chat.italics(teamId)}));
		let spl = new LineSplitter(this.parser.app.config.bot.maxMessageLength);
		spl.add(this.mlt(29, {team: Chat.bold(team.name), money: team.money + "K",
			captain: (team.captain || '-'), subcaptain: (team.subcaptain || '-')}) + " ");
		let players = auction.playersForTeam(team);
		if (players.length === 0) {
			spl.add(" __(" + this.mlt(30) + ")__");
		} else {
			for (let i = 0; i < players.length; i++) {
				let player = players[i];
				spl.add(Chat.bold(player.name) + " (" + player.cost + "K" + ")" + (i < players.length - 1 ? ", " : ""));
			}
		}
		return this.restrictReply(spl.getLines(), 'info');
	},

	auctionplayers: function (App) {
		this.setLangFile(Lang_File);
		let auction = App.modules.playersauction.system.rooms[this.targetRoom || ""];
		if (!auction) return this.errorReply(this.mlt('err2'));
		let spl = new LineSplitter(this.parser.app.config.bot.maxMessageLength);
		spl.add(Chat.bold(this.mlt(31) + ":"));
		let players = Object.values(auction.data.players);
		if (players.length === 0) return this.restrictReply(this.mlt(32), "info");
		for (let i = 0; i < players.length; i++) {
			spl.add(" " + players[i].name + (i < (players.length - 1) ? ',' : ''));
		}
		return this.restrictReply(spl.getLines(), 'info');
	},

	auctionfreeplayers: function (App) {
		this.setLangFile(Lang_File);
		let auction = App.modules.playersauction.system.rooms[this.targetRoom || ""];
		if (!auction) return this.errorReply(this.mlt('err2'));
		let spl = new LineSplitter(this.parser.app.config.bot.maxMessageLength);
		spl.add(Chat.bold(this.mlt(33) + ":"));
		let players = Object.values(auction.data.players);
		let empty = true;
		for (let i = 0; i < players.length; i++) {
			if (players[i].team) continue;
			empty = false;
			spl.add(" " + players[i].name + (i < (players.length - 1) ? ',' : ''));
		}
		if (empty) return this.restrictReply(this.mlt(34), "info");
		return this.restrictReply(spl.getLines(), 'info');
	},

	auctionreport: function (App) {
		this.setLangFile(Lang_File);
		let auction = App.modules.playersauction.system.rooms[this.targetRoom || ""];
		if (!auction) return this.errorReply(this.mlt('err2'));
		if (!this.can('auction', this.room)) return this.replyAccessDenied('auction');
		let server = this.parser.app.config.server.url;
		if (!server) {
			return this.errorReply(this.mlt(35));
		}
		let html = '<html>';
		html += '<head><title>Players Auction</title><style type="text/css">p {padding:5px;} td {padding:5px;}</style></head>';
		html += '<body>';
		html += '<h2 align="center">Players Auction</h2>';
		html += '<h3>Configuration</h3>';
		html += '<p>- <strong>Room:</strong> ' + Text.escapeHTML(auction.room) + '</p>';
		html += '<p>- <strong>Nomination Cost:</strong> ' + Text.escapeHTML(auction.data.mincost || "0") + ' K</p>';
		html += '<p>- <strong>Players for team:</strong> ' + Text.escapeHTML(auction.data.minplayers || "-") + '</p>';
		html += '<p> - <strong>Bid Timer:</strong> ' + Text.escapeHTML(Math.floor(auction.data.timer / 1000)) + ' seconds</p>';
		html += '<h3>Auction Teams</h3>';
		for (let id in auction.data.teams) {
			let team = auction.data.teams[id];
			html += '<table width="100%" border="1">';
			html += '<tr><td width="139px"><strong>Name</strong></td><td>' + Text.escapeHTML(team.name) + '</td></tr>';
			html += '<tr><td><strong>Money</strong></td><td>' + Text.escapeHTML(team.money || "0") + ' K</td></tr>';
			html += '<tr><td><strong>Captain</strong></td><td>' + Text.escapeHTML(team.captain || "-") + '</td></tr>';
			html += '<tr><td><strong>Sub-Captain</strong></td><td>' + Text.escapeHTML(team.subcaptain || "-") + '</td></tr>';
			let playersTeam = auction.playersForTeam(team).map(player => ("<strong>" + Text.escapeHTML(player.name) + "</strong> (" + player.cost + " K)"));
			html += '<tr><td colspan="2">' + (playersTeam.join('<br />') || "-") + '</td></tr>';
			html += '</table>';
			html += '<br /><br />';
		}
		html += '<h3>Players without team</h3>';
		let freePlayers = auction.getFreePlayers().map(player => player.name);
		html += '<p>' + Text.escapeHTML(freePlayers.join(', ') || "(none)") + '</p>';
		html += '</body>';
		html += '</html>';
		let key = this.parser.app.data.temp.createTempFile(html);
		if (server.charAt(server.length - 1) === '/') {
			return this.pmReply(this.parser.app.config.server.url + 'temp/' + key);
		} else {
			return this.pmReply(this.parser.app.config.server.url + '/temp/' + key);
		}
	},

	nominate: function (App) {
		this.setLangFile(Lang_File);
		let auction = App.modules.playersauction.system.rooms[this.targetRoom || ""];
		if (!auction) return this.errorReply(this.mlt('err2'));
		if (auction.status === "paused" && auction.data.turn) {
			let team = auction.getTeam(auction.data.turn);
			if (!team || team.captain === this.byIdent.id || team.subcaptain === this.byIdent.id) {
				if (team.money < auction.data.mincost) return this.errorReply(this.mlt(36, {cost: auction.data.mincost + "K"}));
				let playerId = Text.toId(this.arg);
				if (!playerId) return this.errorReply(this.usage({desc: this.mlt('u3')}));
				let player = auction.getPlayer(playerId);
				if (!player) return this.errorReply(this.mlt(20, {player: Chat.italics(playerId)}));
				if (player.team) return this.errorReply(this.mlt(37, {player: Chat.italics(playerId)}));
				auction.nominate(player, team);
				this.reply(this.mlt(38, {player: Chat.bold(auction.nominated.name), team: Chat.italics(auction.nominatedTeam.name),
					cost: Chat.italics(auction.nominatedCost + "K"), seg: Math.floor(auction.data.timer / 1000)}));
			} else {
				this.pmReply(this.mlt(39, {team: Chat.italics(team.name)}));
			}
		} else {
			this.pmReply(this.mlt(40));
		}
	},

	passturn: function (App) {
		this.setLangFile(Lang_File);
		let auction = App.modules.playersauction.system.rooms[this.targetRoom || ""];
		if (!auction) return this.errorReply(this.mlt('err2'));
		if (auction.status === "paused" && auction.data.turn) {
			let team = auction.getTeam(auction.data.turn);
			if (!team || team.captain === this.byIdent.id || team.subcaptain === this.byIdent.id) {
				if (auction.data.minplayers && auction.playersForTeam(team).length < auction.data.minplayers) {
					this.pmReply(this.mlt(41));
				} else {
					auction.setNextTurn();
					auction.db.write();
				}
			} else {
				this.pmReply(this.mlt(39, {team: Chat.italics(team.name)}));
			}
		} else {
			this.pmReply(this.mlt(40));
		}
	},

	bid: function (App) {
		this.setLangFile(Lang_File);
		let auction = App.modules.playersauction.system.rooms[this.targetRoom || ""];
		if (!auction) return this.errorReply(this.mlt('err2'));
		if (auction.status === "nominated") {
			let team = auction.getTeamByMember(this.byIdent.id);
			if (team) {
				if (team.id !== auction.nominatedTeam.id) {
					let money = auction.nominatedCost + 0.5;
					if (this.arg) {
						money = parseFloat(this.arg);
					}
					if (isNaN(money) || money < 0) return this.pmReply(this.usage({desc: this.mlt('u7'), optional: true}));
					if ((money * 10) % 5 !== 0) return this.pmReply(this.mlt(11));
					if (team.money < money) return this.pmReply(this.mlt(42, {money: money + "K"}));
					if (team.money - money < ((auction.data.minplayers - auction.playersForTeam(team).length - 1) * auction.data.mincost)) {
						return this.pmReply(this.mlt(43));
					}
					if (money <= auction.nominatedCost) return this.pmReply(this.mlt(44));
					auction.bid(team, money);
					this.reply(this.mlt(45, {team: Chat.bold(auction.nominatedTeam.name), cost: Chat.bold(auction.nominatedCost + "K"),
						player: Chat.bold(auction.nominated.name), seg: Math.floor(auction.data.timer / 1000)}));
				} else {
					this.pmReply(this.mlt(46));
				}
			} else {
				this.pmReply(this.mlt(47));
			}
		} else {
			this.errorReply(this.mlt(48));
		}
	},

	endbid: function (App) {
		this.setLangFile(Lang_File);
		let auction = App.modules.playersauction.system.rooms[this.targetRoom || ""];
		if (!auction) return this.errorReply(this.mlt('err2'));
		if (!this.can('auction', this.room)) return this.replyAccessDenied('auction');
		if (auction.status === "nominated") {
			auction.timeout(true);
		} else {
			this.errorReply(this.mlt(48));
		}
	},
};
