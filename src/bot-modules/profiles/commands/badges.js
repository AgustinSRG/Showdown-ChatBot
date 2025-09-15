/**
 * Commands File
 *
 * addbadge: Creates a badge
 * updatebadge: Updates a badge
 * rmbadge: Deletes a badge
 * givebadge: Gives a badge to an user
 * takebadge: Takes a badge from an user
 * listbadges: Lists the badges
 * listbadgesraw: Lists the badges (raw format)
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Chat = Tools('chat');

const Lang_File = Path.resolve(__dirname, 'badges.translations');

const MAX_BADGE_NAME = 20;

const BADGE_IMG_WIDTH = 16;
const BADGE_IMG_HEIGHT = 16;

module.exports = {
	createbadge: "addbadge",
	addbadge: function (App) {
		this.setLangFile(Lang_File);

		if (!this.can('badgeadmin', this.room)) return this.replyAccessDenied('badgeadmin');

		const Mod = App.modules.profiles.system;

		if (this.args.length < 2) {
			return this.errorReply(this.usage({ desc: this.mlt("badgename") }, { desc: this.mlt("imageurl") }, { desc: this.mlt("badgedescription"), optional: true }));
		}

		const name = this.args[0].trim();
		const id = Text.toId(name);

		if (!id || name.length > MAX_BADGE_NAME) {
			return this.errorReply(this.mlt('invalidname') + " | " + this.usage({ desc: this.mlt("badgename") }, { desc: this.mlt("imageurl") }, { desc: this.mlt("badgedescription"), optional: true }));
		}

		const url = this.args[1].trim();

		if (!Text.validateHttpsURL(url)) {
			return this.errorReply(this.mlt('invalidurl') + " | " + this.usage({ desc: this.mlt("badgename") }, { desc: this.mlt("imageurl") }, { desc: this.mlt("badgedescription"), optional: true }));
		}

		let description = "";

		if (this.args.length > 2) {
			description = this.args.slice(2).join(",").trim();
		}

		if (Mod.data.badges[id]) {
			return this.errorReply(this.mlt('badgenameinuse') + ": " + Chat.italics(id));
		}

		Mod.data.badges[id] = {
			name: name,
			url: url,
			description: description,
			holders: Object.create(null),
		};

		Mod.db.write();
		this.addToSecurityLog();

		this.reply(this.mlt("badgecreated") + ": " + Chat.bold(name));
	},

	modbadge: "updatebadge",
	updatebadge: function (App) {
		this.setLangFile(Lang_File);

		if (!this.can('badgeadmin', this.room)) return this.replyAccessDenied('badgeadmin');

		const Mod = App.modules.profiles.system;

		if (this.args.length < 3) {
			return this.errorReply(this.usage({ desc: this.mlt("badgename") }, { desc: this.mlt("badgenewname") }, { desc: this.mlt("imageurl") }, { desc: this.mlt("badgedescription"), optional: true }));
		}

		const oldId = Text.toId(this.args[0]);

		if (!oldId) {
			return this.errorReply(this.usage({ desc: this.mlt("badgename") }, { desc: this.mlt("badgenewname") }, { desc: this.mlt("imageurl") }, { desc: this.mlt("badgedescription"), optional: true }));
		}

		const name = this.args[1].trim();
		const id = Text.toId(name);

		if (!id || name.length > MAX_BADGE_NAME) {
			return this.errorReply(this.mlt('invalidname') + " | " + this.usage({ desc: this.mlt("badgename") }, { desc: this.mlt("badgenewname") }, { desc: this.mlt("imageurl") }, { desc: this.mlt("badgedescription"), optional: true }));
		}

		const url = this.args[2].trim();

		if (!Text.validateHttpsURL(url)) {
			return this.errorReply(this.mlt('invalidurl') + " | " + this.usage({ desc: this.mlt("badgename") }, { desc: this.mlt("badgenewname") }, { desc: this.mlt("imageurl") }, { desc: this.mlt("badgedescription"), optional: true }));
		}

		let description = "";

		if (this.args.length > 3) {
			description = this.args.slice(3).join(",").trim();
		}

		if (!Mod.data.badges[oldId]) {
			return this.errorReply(this.mlt('badgenotfound') + ": " + Chat.italics(oldId));
		}

		if (oldId !== id) {
			if (Mod.data.badges[id]) {
				return this.errorReply(this.mlt('badgenameinuse') + ": " + Chat.italics(id));
			}

			Mod.data.badges[id] = Mod.data.badges[oldId];
			delete Mod.data.badges[oldId];
		}


		Mod.data.badges[id].name = name;
		Mod.data.badges[id].url = url;
		Mod.data.badges[id].description = description;

		Mod.db.write();
		this.addToSecurityLog();

		this.reply(this.mlt("badgeupdated") + ": " + Chat.bold(name));
	},

	deletebadge: "rmbadge",
	removebadge: "rmbadge",
	rmbadge: function (App) {
		this.setLangFile(Lang_File);

		if (!this.can('badgeadmin', this.room)) return this.replyAccessDenied('badgeadmin');

		const Mod = App.modules.profiles.system;

		if (!this.arg) {
			return this.errorReply(this.usage({ desc: this.mlt("badgename") }));
		}

		const id = Text.toId(this.args[0]);

		if (!Mod.data.badges[id]) {
			return this.errorReply(this.mlt('badgenotfound') + ": " + Chat.italics(id));
		}

		const name = Mod.data.badges[id].name;

		delete Mod.data.badges[id];

		Mod.db.write();
		this.addToSecurityLog();

		this.reply(this.mlt("badgedeleted") + ": " + Chat.bold(name));
	},

	givebadge: function (App) {
		this.setLangFile(Lang_File);

		if (!this.can('badgegive', this.room)) return this.replyAccessDenied('badgegive');

		const Mod = App.modules.profiles.system;

		if (this.args.length !== 2) {
			return this.errorReply(this.usage({ desc: this.usageTrans('user') }, { desc: this.mlt("badgename") }));
		}

		const user = Text.toId(this.args[0]);
		const id = Text.toId(this.args[1]);

		if (!user || user.length > 18) {
			return this.errorReply(this.mlt('inv'));
		}

		if (!id) {
			return this.errorReply(this.mlt('invalidname'));
		}

		if (!Mod.data.badges[id]) {
			return this.errorReply(this.mlt('badgenotfound') + ": " + Chat.italics(id) + " | " + this.usage({ desc: this.usageTrans('user') }, { desc: this.mlt("badgename") }));
		}

		const badgeName = Mod.data.badges[id].name;

		if (Mod.data.badges[id].holders[user]) {
			return this.errorReply(this.mlt('alreadyholder1') + " " + Chat.bold(user) + " " + this.mlt('alreadyholder2') + " " + Chat.bold(badgeName));
		}

		Mod.data.badges[id].holders[user] = 1;

		Mod.db.write();
		this.addToSecurityLog();

		return this.errorReply(this.mlt('givenbadge1') + " " + Chat.bold(badgeName) + " " + this.mlt('givenbadge2') + " " + Chat.bold(user));
	},

	takebadge: function (App) {
		this.setLangFile(Lang_File);

		if (!this.can('badgegive', this.room)) return this.replyAccessDenied('badgegive');

		const Mod = App.modules.profiles.system;

		if (this.args.length !== 2) {
			return this.errorReply(this.usage({ desc: this.usageTrans('user') }, { desc: this.mlt("badgename") }));
		}

		const user = Text.toId(this.args[0]);
		const id = Text.toId(this.args[1]);

		if (!user || user.length > 18) {
			return this.errorReply(this.mlt('inv'));
		}


		if (!id) {
			return this.errorReply(this.mlt('invalidname'));
		}

		if (!Mod.data.badges[id]) {
			return this.errorReply(this.mlt('badgenotfound') + ": " + Chat.italics(id));
		}

		const badgeName = Mod.data.badges[id].name;

		if (!Mod.data.badges[id].holders[user]) {
			return this.errorReply(this.mlt('noholder1') + " " + Chat.bold(user) + " " + this.mlt('noholder2') + " " + Chat.bold(badgeName));
		}

		delete Mod.data.badges[id].holders[user];

		Mod.db.write();
		this.addToSecurityLog();

		return this.errorReply(this.mlt('takenbadge1') + " " + Chat.bold(badgeName) + " " + this.mlt('takenbadge2') + " " + Chat.bold(user));
	},

	badges: "listbadges",
	listbadges: function (App) {
		this.setLangFile(Lang_File);

		let user = "";
		let userName = "";

		if (this.arg) {
			user = Text.toId(this.arg);

			if (!user || user.length > 18) {
				return this.errorReply(this.mlt('inv'));
			}

			userName = this.arg.trim();
		}

		const Mod = App.modules.profiles.system;

		let tableHtml = '';

		tableHtml += '<table border="1" cellspacing="0" cellpadding="3" style="min-width:100%;">';

		tableHtml += '<tr>';
		tableHtml += '<th style="width: 16px;">' + Text.escapeHTML(this.mlt("image")) + '</th>';
		tableHtml += '<th>' + Text.escapeHTML(this.mlt("badgename")) + '</th>';
		tableHtml += '<th>' + Text.escapeHTML(this.mlt("badgedescription")) + '</th>';
		tableHtml += '</tr>';

		let badgeCount = 0;

		for (let id of Object.keys(Mod.data.badges)) {
			const badge = Mod.data.badges[id];

			if (user && (!badge.holders || !badge.holders[user])) {
				continue;
			}

			badgeCount++;

			tableHtml += '<tr>';

			tableHtml += '<td style="text-align: center;"><img src="' + Text.escapeHTML(badge.url) + '" width="' + BADGE_IMG_WIDTH + '" height="' + BADGE_IMG_HEIGHT + '"></td>';

			tableHtml += '<td><b>' + Text.escapeHTML(badge.name) + '</b></td>';

			tableHtml += '<td>' + Text.escapeHTML(badge.description) + '</td>';

			tableHtml += '</tr>';
		}

		tableHtml += '</table>';

		if (badgeCount === 0) {
			if (user) {
				return this.errorReply(this.mlt('usernobadges1') + " " + Chat.bold(user) + " " + this.mlt('usernobadges2'));
			} else {
				return this.errorReply(this.mlt('empty'));
			}
		}

		let html = '';

		const height = (user ? 22 : 0) + 22 + (31 * Math.min(3, badgeCount));

		html += '<div style="overflow: auto; height: ' + height + 'px; width: 100%;">';

		if (user) {
			html += '<p style="margin: 4px 0;">' + Text.escapeHTML(this.mlt("userbadges")) + " " + "<b>" + Text.escapeHTML(userName) + '</b>:</p>';
		}

		html += tableHtml;

		html += '</div>';

		// Send html

		this.htmlRestrictReply(html, "profile");
	},

	listbadgesraw: function (App) {
		this.setLangFile(Lang_File);

		const Mod = App.modules.profiles.system;

		if (Object.keys(Mod.data.badges).length === 0) {
			return this.errorReply(this.mlt('empty'));
		}

		const text = Object.values(Mod.data.badges).map(badge => {
			let lines = [
				this.mlt("badgename") + ": " + badge.name,
				this.mlt("imageurl") + ": " + badge.url,
			];

			if (badge.description) {
				lines.push(this.mlt("badgedescription") + ": " + badge.description);
			}

			if (badge.holders && Object.keys(badge.holders).length > 0) {
				lines.push(this.mlt("badgeholders") + ": " + Object.keys(badge.holders).join(", "));
			}

			return lines.join("\n");
		}).join("\n\n");

		this.restrictReply("!code " + text, "profile");
	},
};
