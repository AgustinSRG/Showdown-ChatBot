/**
 * Bot Module: Players Auction
 */

'use strict';

const Path = require('path');
const Auction = require(Path.resolve(__dirname, 'auction.js'));

exports.setup = function (App) {
	function getLanguage(room) {
		return App.config.language.rooms[room] || App.config.language['default'];
	}

	const PlayersAuctionMod = {};

	PlayersAuctionMod.rooms = {};

	PlayersAuctionMod.db = App.dam.getDataBase('players-auction.json');
	PlayersAuctionMod.data = PlayersAuctionMod.db.data;

	PlayersAuctionMod.saveData = function () {
		this.db.write();
	};

	PlayersAuctionMod.sendTo = function (room, msg) {
		App.bot.sendTo(room, msg);
	};

	PlayersAuctionMod.mlt = function (file, room, key, vars) {
		return App.multilang.mlt(file, getLanguage(room), key, vars);
	};

	PlayersAuctionMod.linkAuctionData = function (room) {
		if (!this.data[room]) {
			this.data[room] = {};
		}

		return this.data[room];
	};

	PlayersAuctionMod.createAuction = function (room) {
		PlayersAuctionMod.rooms[room] = new Auction(PlayersAuctionMod, room);
	};

	PlayersAuctionMod.removeAuction = function (room) {
		if (PlayersAuctionMod.rooms[room]) {
			PlayersAuctionMod.rooms[room].clearTimer();
			delete PlayersAuctionMod.rooms[room];
			delete PlayersAuctionMod.data[room];
		}
	};

	for (let room in PlayersAuctionMod.data) {
		PlayersAuctionMod.createAuction(room);
	}

	App.bot.on('disconnect', () => {
		for (let room in PlayersAuctionMod.rooms) {
			PlayersAuctionMod.rooms[room].clearTimer();
		}
	});

	return PlayersAuctionMod;
};
