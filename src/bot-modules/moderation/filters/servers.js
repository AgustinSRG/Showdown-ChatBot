/**
 * Moderation Filter: Showdown Servers
 */

'use strict';

const Servers_Default_Value = 2;

const Path = require('path');
const Text = Tools('text');

const Lang_File = Path.resolve(__dirname, 'servers.translations');

exports.id = 'servers';

exports.parse = function (context) {
	let msg = context.msgLow;
	let val = this.getModTypeValue(exports.id, Servers_Default_Value);
	let servers = getServersAds(msg);
	let whitelistedServers = context.app.modules.moderation.system.data.serversWhitelist || [];
	for (let i = 0; i < servers.length; i++) {
		let server = servers[i];
		if (whitelistedServers.indexOf(server) >= 0) continue;
		if (server !== context.app.bot.loginUrl.serverId) {
			context.infractions.push(exports.id);
			context.totalPointVal += val;
			if (context.pointVal < val) {
				context.pointVal = val;
				context.muteMessage = context.mlt(Lang_File, 'servers');
			}
			break;
		}
	}
};

function getServersAds(text) {
	let aux = text;
	let serversAds = [];
	let spamindex;
	let actualAd = '';
	while (aux.indexOf(".psim.us") > -1) {
		spamindex = aux.indexOf(".psim.us");
		actualAd = '';
		for (let i = spamindex - 1; i >= 0; i--) {
			if (aux.charAt(i).replace(/[^a-z0-9-]/g, '') === '') break;
			actualAd = aux.charAt(i) + actualAd;
		}
		if (actualAd.length) serversAds.push(Text.toId(actualAd));
		aux = aux.substr(spamindex + ".psim.us".length);
	}
	return serversAds;
}
