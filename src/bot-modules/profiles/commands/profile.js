/**
 * Commands File
 *
 * userprofile: Displays the profile of an user
 * setuserprofileimage: Sets the profile image
 * deleteuserprofileimage: Deletes the profile image
 * setprofilebackground: Sets the profile background (color or image)
 * clearprofilebackground: Clears the profile background
 * setprofiletextcolor: Sets the profile text color
 * clearprofiletextcolor: Clears the profile text color
 */

'use strict';

const Path = require('path');

const Text = Tools('text');

const Lang_File = Path.resolve(__dirname, 'profile.translations');

const MonthsAbv = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const usersBusy = Object.create(null);

const USERS_BUSY_COOLDOWN = 10 * 1000;

const MAX_IMG_WIDTH = 1024;
const MAX_IMG_HEIGHT = 128;

const BADGE_IMG_WIDTH = 16;
const BADGE_IMG_HEIGHT = 16;

const MAX_USERNAME_LENGTH = 18;

/**
 * Validate if a string is a valid hex color code
 * Supports both 3-character (#RGB) and 6-character (#RRGGBB) formats
 */
function isValidHexColor(value) {
	return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);
}

function resolveAvatar(App, avatar) {
	avatar = avatar + "";

	if (avatar.charAt(0) === "#") {
		return 'https://play.pokemonshowdown.com/sprites/trainers-custom/' + Text.toId(avatar.substring(1)) + '.png';
	}

	if (avatar.includes('.')) {
		// Custom avatar served by the server

		if (!App.config.bot.secure) {
			// Insecure servers cannot have custom avatars
			// Use default avatar to show something
			return "https://play.pokemonshowdown.com/sprites/trainers/lucas.png";
		}

		const server = App.config.bot.server;
		const port = App.config.bot.port;

		return "https://" + server + ":" + port + "/avatars/" + encodeURIComponent(avatar).replace(/%3F/g, '?');
	}

	return "https://play.pokemonshowdown.com/sprites/trainers/" + avatar + ".png";
}

module.exports = {
	profile: "userprofile",
	userprofile: function (App) {
		this.setLangFile(Lang_File);

		const caller = Text.toId(this.by);

		let target = Text.toId(this.arg) || Text.toId(this.by);
		if (!target || target.length > MAX_USERNAME_LENGTH) {
			return this.errorReply(this.mlt('inv'));
		}

		const Mod = App.modules.profiles.system;

		const room = this.room;

		const busyTs = usersBusy[caller] || 0;

		if (Date.now() - busyTs < USERS_BUSY_COOLDOWN) {
			return this.errorReply(this.mlt('busy'));
		}

		usersBusy[caller] = Date.now();

		Mod.getUserProfileInfo(target, data => {
			delete usersBusy[caller];

			let html = '';

			// Build background style
			let backgroundStyle = '';
			if (data.backgroundType === 'image' && data.backgroundValue) {
				// Re-validate URL at render time for security
				if (Text.validateHttpsURL(data.backgroundValue)) {
					// URL encode special characters for safe CSS context
					const safeUrl = encodeURI(data.backgroundValue + "");
					backgroundStyle = "background-image: url('" + Text.escapeHTML(safeUrl) + "'); background-size: cover; background-position: center;";
				}
			} else if (data.backgroundType === 'color' && data.backgroundValue) {
				// Re-validate color at render time for security
				if (isValidHexColor(data.backgroundValue)) {
					backgroundStyle = "background-color: " + Text.escapeHTML(data.backgroundValue) + ";";
				}
			}

			// Build text color style
			let textColorStyle = '';
			let borderColor = '#7799BB';
			if (data.textColor) {
				// Re-validate color at render time for security
				if (isValidHexColor(data.textColor)) {
					textColorStyle = "color: " + Text.escapeHTML(data.textColor) + ";";
					borderColor = Text.escapeHTML(data.textColor);
				}
			}

			// Create HTML profile
			html += '<table cellspacing="0" cellpadding="3" style="min-width:100%; min-height:150px; border-collapse: collapse;' + backgroundStyle + '">';

			html += '<tr>';


			// Start of avatar section
			html += '<td style="width: 80px; text-align: center; border-right: solid 1px ' + borderColor + '; padding: 12px;' + textColorStyle + '">';

			// Username
			const username = data.online ? data.name : data.regName;
			html += '<div style="text-align: center; padding-bottom: 6px;"><b class="username" style="color: ' + Text.escapeHTML(data.color) + ';">' + Text.escapeHTML(username) + '</b></div>';

			// Avatar
			html += '<div style="text-align: center;"><img width="80" height="80" class="pixelated" style="vertical-align: middle;" src="' + Text.escapeHTML(resolveAvatar(App, data.avatar)) + '"></div>';

			// Badges
			if (data.badges && data.badges.length > 0) {
				html += '<div style="text-align: center; padding-top: 6px;">';

				for (let badge of data.badges) {
					const badgeTitle = badge.name + (badge.description ? (": " + badge.description) : "");
					html += '<img src="' + Text.escapeHTML(badge.url) +
						'" alt="' + Text.escapeHTML(badge.name) +
						'" width="' + BADGE_IMG_WIDTH +
						'" height="' + BADGE_IMG_HEIGHT +
						'" title="' + Text.escapeHTML(badgeTitle) +
						'" style="margin: 2px;">';
				}

				html += '</div>';
			}

			// End of avatar section
			html += '</td>';

			// Start of info section
			html += '<td style="' + textColorStyle + '">';

			// Username (info section)
			html += '<p style="margin: 4px 0"><u>' + this.mlt("name") + ':</u> <b class="username" style="color: ' + Text.escapeHTML(data.color) + ';">' + Text.escapeHTML(username) + '</b></p>';

			// Status
			html += '<p style="margin: 4px 0"><u>' + this.mlt("status") + ':</u> ';

			if (data.online) {
				if (data.status) {
					if (data.status.charAt(0) === "!") {
						data.status = data.status.substring(1);

						if (data.status.startsWith("(Idle)")) {
							data.status = data.status.substring("(Idle)".length).trim();
							html += '<b style="color: gray;">●&nbsp;' + this.mlt("idle") + '</b>' + (data.status ? (" - " + Text.escapeHTML(data.status)) : "");
						} else if (data.status.startsWith("(Busy)")) {
							data.status = data.status.substring("(Busy)".length).trim();
							html += '<b style="color: orange;">●&nbsp;' + this.mlt("busy") + '</b>' + (data.status ? (" - " + Text.escapeHTML(data.status)) : "");
						} else {
							html += '<b style="color: green;">●&nbsp;' + this.mlt("online") + '</b> - ' + Text.escapeHTML(data.status);
						}
					} else {
						html += '<b style="color: green;">●&nbsp;' + this.mlt("online") + '</b> - ' + Text.escapeHTML(data.status);
					}
				} else {
					html += '<b style="color: green;">●&nbsp;' + this.mlt("online") + '</b>';
				}
			} else {
				html += '<b style="color: red;">●&nbsp;' + this.mlt("offline") + '</b>';
			}

			html += '</p>';

			const rankMappings = Object.create(null);
			rankMappings[App.config.parser.admin] = this.mlt("admin");
			rankMappings[App.config.parser.owner] = this.mlt("owner");
			rankMappings[App.config.parser.bot] = this.mlt("bot");
			rankMappings[App.config.parser.mod] = this.mlt("mod");
			rankMappings[App.config.parser.driver] = this.mlt("driver");
			rankMappings[App.config.parser.voice] = this.mlt("voice");

			// Room rank
			const hasRoomRank = room && App.bot.rooms[room] && App.bot.rooms[room].users[target] && App.bot.rooms[room].users[target] !== " " && App.bot.rooms[room].users[target] !== data.group;
			if (hasRoomRank) {
				const roomRank = App.bot.rooms[room].users[target];

				html += '<p style="margin: 4px 0"><u>' + this.mlt("rank") + ' (' + Text.escapeHTML(App.bot.rooms[room].title || room) + '):</u> <b>';

				if (Mod.customGroups.has(roomRank)) {
					html += Text.escapeHTML(Mod.customGroups.get(roomRank) + " (" + roomRank + ")");
				} else if (rankMappings[roomRank]) {
					html += Text.escapeHTML(rankMappings[roomRank] + " (" + roomRank + ")");
				} else {
					html += Text.escapeHTML(roomRank);
				}

				html += '</b></p>';
			}

			// Rank
			if (data.group && data.group !== " ") {
				html += '<p style="margin: 4px 0"><u>' + this.mlt("rank") + (hasRoomRank ? (' (' + this.mlt('global') + ')') : "") + ':</u> <b>';

				if (Mod.customGroups.has(data.group)) {
					html += Text.escapeHTML(Mod.customGroups.get(data.group) + " (" + data.group + ")");
				} else if (rankMappings[data.group]) {
					html += Text.escapeHTML(rankMappings[data.group] + " (" + data.group + ")");
				} else {
					html += Text.escapeHTML(data.group);
				}

				html += '</b></p>';
			}

			// Last seen (offline)
			if (data.lastSeen && !data.online) {
				let time = Math.round((Date.now() - data.lastSeen.lastSeen.time) / 1000);

				let times = [];
				let aux;

				/* Get Time difference */

				aux = time % 60; // Seconds
				if (aux > 0 || time === 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt('second') : this.mlt('seconds')));
				time = Math.floor(time / 60);

				aux = time % 60; // Minutes
				if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt('minute') : this.mlt('minutes')));
				time = Math.floor(time / 60);

				aux = time % 24; // Hours
				if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? this.mlt('hour') : this.mlt('hours')));

				time = Math.floor(time / 24); // Days
				if (time > 0) times.unshift(time + ' ' + (time === 1 ? this.mlt('day') : this.mlt('days')));

				html += '<p style="margin: 4px 0"><u>' + this.mlt("lastseen") + ':</u> <span>' + this.mlt("lastseen1") + " " + Text.escapeHTML(times.join(', ')) + " " + this.mlt("lastseen2") + '</span></p>';
			}

			// Registration date
			if (data.regDate) {
				html += '<p style="margin: 4px 0"><u>' + this.mlt("regdate") + ':</u> <span>' + Text.escapeHTML(this.mlt("date", {
					day: data.regDate.getDate(),
					month: this.mlt(MonthsAbv[data.regDate.getMonth()]),
					year: data.regDate.getFullYear(),
				})) + '</span></p>';
			}

			if (data.profileImage && typeof data.profileImage === "object") {
				html += '<img src="' + Text.escapeHTML(data.profileImage.url + "") + '" width="' + Text.escapeHTML(data.profileImage.width + "") + '" height="' + Text.escapeHTML(data.profileImage.height + "") + '">';
			}

			// End of info section
			html += '</td>';

			html += '</tr>';

			html += '</table>';

			// Send html

			this.htmlRestrictReply(html, "profile");
		});
	},

	setprofileimage: "setuserprofileimage",
	setuserprofileimage: function (App) {
		this.setLangFile(Lang_File);

		let user = Text.toId(this.by);
		let argOffset = 0;

		if (this.args.length === 4) {
			argOffset = 1;

			user = Text.toId(this.args[0]);

			if (!user || user.length > MAX_USERNAME_LENGTH) {
				return this.errorReply(this.mlt('inv'));
			}

			if (user !== this.byIdent.id) {
				if (!this.can('profileadmin', this.room)) return this.replyAccessDenied('profileadmin');
			} else {
				if (!this.can('profilesettings', this.room)) return this.replyAccessDenied('profilesettings');
			}
		} else if (this.args.length === 3) {
			if (!this.can('profilesettings', this.room)) return this.replyAccessDenied('profilesettings');
		} else {
			return this.errorReply(this.usage({ desc: this.usageTrans('user'), optional: true }, { desc: this.mlt("imageurl") }, { desc: this.mlt("imagewidth") }, { desc: this.mlt("imageheight") }));
		}

		const Mod = App.modules.profiles.system;

		const url = this.args[argOffset].trim();

		if (!Text.validateHttpsURL(url)) {
			return this.errorReply(this.mlt('invalidurl') + " | " + this.usage({ desc: this.usageTrans('user'), optional: true }, { desc: this.mlt("imageurl") }, { desc: this.mlt("imagewidth") }, { desc: this.mlt("imageheight") }));
		}

		const width = parseInt(this.args[argOffset + 1]) || 0;

		if (width < 1 || width > MAX_IMG_WIDTH) {
			return this.errorReply(this.mlt('invalidwidth') + " | " + this.usage({ desc: this.usageTrans('user'), optional: true }, { desc: this.mlt("imageurl") }, { desc: this.mlt("imagewidth") }, { desc: this.mlt("imageheight") }));
		}

		const height = parseInt(this.args[argOffset + 2]) || 0;

		if (height < 1 || height > MAX_IMG_HEIGHT) {
			return this.errorReply(this.mlt('invalidheight') + " | " + this.usage({ desc: this.usageTrans('user'), optional: true }, { desc: this.mlt("imageurl") }, { desc: this.mlt("imagewidth") }, { desc: this.mlt("imageheight") }));
		}

		Mod.data.profileImages[user] = {
			url: url,
			width: width,
			height: height,
		};

		Mod.db.write();
		this.addToSecurityLog();

		this.restrictReply(this.mlt("profileimageset"), 'info');
	},

	deleteprofileimage: "deleteuserprofileimage",
	deleteuserprofileimage: function (App) {
		this.setLangFile(Lang_File);

		let user = Text.toId(this.by);

		if (this.arg) {
			user = Text.toId(this.args[0]);

			if (!user || user.length > MAX_USERNAME_LENGTH) {
				return this.errorReply(this.mlt('inv'));
			}

			if (user !== this.byIdent.id) {
				if (!this.can('profileadmin', this.room)) return this.replyAccessDenied('profileadmin');
			} else {
				if (!this.can('profilesettings', this.room)) return this.replyAccessDenied('profilesettings');
			}
		} else {
			if (!this.can('profilesettings', this.room)) return this.replyAccessDenied('profilesettings');
		}

		const Mod = App.modules.profiles.system;

		if (!Mod.data.profileImages[user]) {
			return this.errorReply(this.mlt('noprofileimage'));
		}

		delete Mod.data.profileImages[user];

		Mod.db.write();
		this.addToSecurityLog();

		this.restrictReply(this.mlt("profileimagedeleted"), 'info');
	},

	setprofilebg: "setprofilebackground",
	setprofilebackground: function (App) {
		this.setLangFile(Lang_File);

		let user = Text.toId(this.by);
		let bgValue = this.arg.trim();
		let isSettingForOther = false;

		if (this.args.length === 2) {
			user = Text.toId(this.args[0]);

			if (!user || user.length > MAX_USERNAME_LENGTH) {
				return this.errorReply(this.mlt('inv'));
			}

			bgValue = this.args.slice(1).join(',').trim();

			if (user !== this.byIdent.id) {
				if (!this.can('profileadmin', this.room)) return this.replyAccessDenied('profileadmin');
				isSettingForOther = true;
			}
		} else if (this.args.length !== 1) {
			return this.errorReply(this.usage({ desc: this.usageTrans('user'), optional: true }, { desc: this.mlt("imageurl") + " | " + this.mlt("color") }));
		}

		if (!isSettingForOther) {
			if (!this.can('profilesettings', this.room)) return this.replyAccessDenied('profilesettings');
		}

		if (!bgValue) {
			return this.errorReply(this.usage({ desc: this.usageTrans('user'), optional: true }, { desc: this.mlt("imageurl") + " | " + this.mlt("color") }));
		}

		let backgroundType;
		let successMsg;

		if (isValidHexColor(bgValue)) {
			backgroundType = "color";
			successMsg = this.mlt("bgcolorset");
		} else if (Text.validateHttpsURL(bgValue)) {
			successMsg = this.mlt("bgimageset");
			backgroundType = "image";
		} else {
			return this.errorReply(this.mlt('invalidbg'));
		}

		bgValue = bgValue.trim();

		const Mod = App.modules.profiles.system;

		if (!Mod.data.profileSettings[user]) {
			Mod.data.profileSettings[user] = {};
		}

		Mod.data.profileSettings[user].backgroundType = backgroundType;
		Mod.data.profileSettings[user].backgroundValue = bgValue;
		Mod.db.write();

		this.addToSecurityLog();

		this.restrictReply(successMsg + ": " + bgValue, 'info');
	},

	clearprofilebg: "clearprofilebackground",
	clearprofilebackground: function (App) {
		this.setLangFile(Lang_File);

		let user = Text.toId(this.by);
		let isClearingForOther = false;

		if (this.arg) {
			user = Text.toId(this.arg);

			if (!user || user.length > MAX_USERNAME_LENGTH) {
				return this.errorReply(this.mlt('inv'));
			}

			if (user !== this.byIdent.id) {
				if (!this.can('profileadmin', this.room)) return this.replyAccessDenied('profileadmin');
				isClearingForOther = true;
			}
		}

		if (!isClearingForOther) {
			if (!this.can('profilesettings', this.room)) return this.replyAccessDenied('profilesettings');
		}

		const Mod = App.modules.profiles.system;

		if (!Mod.data.profileSettings[user] || (!Mod.data.profileSettings[user].backgroundType && !Mod.data.profileSettings[user].backgroundValue)) {
			return this.errorReply(this.mlt('nobg'));
		}

		delete Mod.data.profileSettings[user].backgroundType;
		delete Mod.data.profileSettings[user].backgroundValue;

		if (Object.keys(Mod.data.profileSettings[user]).length === 0) {
			delete Mod.data.profileSettings[user];
		}

		Mod.db.write();
		this.addToSecurityLog();

		this.restrictReply(this.mlt("bgcleared"), 'info');
	},

	settextcolor: "setprofiletextcolor",
	setprofiletextcolor: function (App) {
		this.setLangFile(Lang_File);

		let user = Text.toId(this.by);
		let value = this.arg;
		let isSettingForOther = false;

		// Check if admin is setting for another user
		if (this.args.length === 2) {
			user = Text.toId(this.args[0]);

			if (!user || user.length > MAX_USERNAME_LENGTH) {
				return this.errorReply(this.mlt('inv'));
			}

			value = this.args[1].trim();

			if (user !== this.byIdent.id) {
				if (!this.can('profileadmin', this.room)) return this.replyAccessDenied('profileadmin');
				isSettingForOther = true;
			}
		} else if (this.args.length !== 1) {
			return this.errorReply(this.usage({ desc: this.usageTrans('user'), optional: true }, { desc: this.mlt("color") }));
		}

		if (!isSettingForOther) {
			if (!this.can('profilesettings', this.room)) return this.replyAccessDenied('profilesettings');
		}

		value = value.trim();

		if (!value || !isValidHexColor(value)) {
			return this.errorReply(this.mlt('invalidtextcolor'));
		}

		const Mod = App.modules.profiles.system;

		if (!Mod.data.profileSettings[user]) {
			Mod.data.profileSettings[user] = {};
		}

		Mod.data.profileSettings[user].textColor = value;
		Mod.db.write();

		this.addToSecurityLog();

		this.restrictReply(this.mlt("textcolorset") + ": " + value, 'info');
	},

	cleartextcolor: "clearprofiletextcolor",
	clearprofiletextcolor: function (App) {
		this.setLangFile(Lang_File);

		let user = Text.toId(this.by);
		let isClearingForOther = false;

		if (this.arg) {
			user = Text.toId(this.arg);

			if (!user || user.length > MAX_USERNAME_LENGTH) {
				return this.errorReply(this.mlt('inv'));
			}

			if (user !== this.byIdent.id) {
				if (!this.can('profileadmin', this.room)) return this.replyAccessDenied('profileadmin');
				isClearingForOther = true;
			}
		}

		if (!isClearingForOther) {
			if (!this.can('profilesettings', this.room)) return this.replyAccessDenied('profilesettings');
		}

		const Mod = App.modules.profiles.system;

		if (!Mod.data.profileSettings[user] || !Mod.data.profileSettings[user].textColor) {
			return this.errorReply(this.mlt('notextcolor'));
		}

		delete Mod.data.profileSettings[user].textColor;

		if (Object.keys(Mod.data.profileSettings[user]).length === 0) {
			delete Mod.data.profileSettings[user];
		}

		Mod.db.write();
		this.addToSecurityLog();

		this.restrictReply(this.mlt("textcolorcleared"), 'info');
	},
};