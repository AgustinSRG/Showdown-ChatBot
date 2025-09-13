/**
 * Commands File
 *
 * userprofile: Displays the profile of an user
 * setuserprofileimage: Sets the profile image
 * deleteuserprofileimage: Deletes the profile image
 */

'use strict';

const Path = require('path');

const Text = Tools('text');

const Lang_File = Path.resolve(__dirname, 'profile.translations');

const MonthsAbv = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function botCanHtml(room, App) {
	let roomData = App.bot.rooms[room];
	let botid = Text.toId(App.bot.getBotNick());
	return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'bot'));
}

function botGetHtmlRoom(App) {
	for (let room of Object.keys(App.bot.rooms)) {
		let roomData = App.bot.rooms[room];
		let botid = Text.toId(App.bot.getBotNick());
		const canHtml = (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'bot'));

		if (canHtml) {
			return room;
		}
	}

	return null;
}

const usersBusy = Object.create(null);

const USERS_BUSY_COOLDOWN = 10 * 1000;

const MAX_IMG_WIDTH = 1024;
const MAX_IMG_HEIGHT = 128;

module.exports = {
	profile: "userprofile",
	userprofile: function (App) {
		this.setLangFile(Lang_File);

		const caller = Text.toId(this.by);

		let target = Text.toId(this.arg) || Text.toId(this.by);
		if (!target || target.length > 18) {
			return this.errorReply(this.mlt('inv'));
		}

		const Mod = App.modules.profiles.system;

		const room = this.room;

		const useHtmlBox = this.room && botCanHtml(this.room, App) && this.can("profile", this.room);

		const pmHtmlRoom = botGetHtmlRoom(App);

		if (!useHtmlBox && !pmHtmlRoom) {
			return this.errorReply(this.mlt('nobot'));
		}

		const busyTs = usersBusy[caller] || 0;

		if (Date.now() - busyTs < USERS_BUSY_COOLDOWN) {
			return this.errorReply(this.mlt('busy'));
		}

		usersBusy[caller] = Date.now();

		Mod.getUserProfileInfo(target, data => {
			delete usersBusy[caller];

			let html = '';

			// Create HTML profile

			html += '<table cellspacing="0" cellpadding="3" style="min-width:100%;">';

			html += '<tr>';


			html += '<td style="width: 80px; text-align: center; border-right: solid 1px black; padding: 12px;">';

			// Username
			const username = data.online ? data.name : data.regName;
			html += '<div style="text-align: center; padding-bottom: 6px;"><b class="username" style="color: ' + Text.escapeHTML(data.color) + ';">' + Text.escapeHTML(username) + '</b></div>';

			// Avatar
			html += '<div style="text-align: center;"><img width="80" height="80" src="https://play.pokemonshowdown.com/sprites/trainers/' + Text.escapeHTML(data.avatar) + '.png"></div>';

			html += '</td>';


			html += '<td>';

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
			const hasRoomRank = App.bot.rooms[room] && App.bot.rooms[room].users[target] && App.bot.rooms[room].users[target] !== " " && App.bot.rooms[room].users[target] !== data.group;
			if (hasRoomRank) {
				if (data.group && data.group !== " ") {
					html += '<p style="margin: 4px 0"><u>' + this.mlt("rank") + ' (' + Text.escapeHTML(App.bot.rooms[room].title || room) + '):</u> <b>';

					if (rankMappings[data.group]) {
						html += Text.escapeHTML(rankMappings[data.group] + " (" + data.group + ")");
					} else {
						html += Text.escapeHTML(data.group);
					}

					html += '</b></p>';
				}
			}

			// Rank
			if (data.group && data.group !== " ") {
				html += '<p style="margin: 4px 0"><u>' + this.mlt("rank") + (hasRoomRank ? (' (' + this.mlt('global') + ')') : "") + ':</u> <b>';

				if (rankMappings[data.group]) {
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

			html += '</td>';

			html += '</tr>';

			html += '</table>';

			// Send html

			if (useHtmlBox) {
				this.send("/addhtmlbox " + html, this.room);
			} else {
				this.send("/pminfobox " + this.byIdent.id + ", " + html, pmHtmlRoom || 'lobby');
			}
		});
	},

	setprofileimage: "setuserprofileimage",
	setuserprofileimage: function (App) {
		this.setLangFile(Lang_File);

		let user = Text.toId(this.by);
		let argOffset = 0;

		if (this.args.length === 4) {
			argOffset = 1;

			if (!this.can('profileadmin', this.room)) return this.replyAccessDenied('profileadmin');

			user = Text.toId(this.args[0]);

			if (!user || user.length > 18) {
				return this.errorReply(this.mlt('inv'));
			}
		} else if (this.args.length === 3) {
			if (!this.can('profileimage', this.room)) return this.replyAccessDenied('profileimage');
		} else {
			return this.errorReply(this.usage({ desc: this.usageTrans('user'), optional: true }, { desc: this.mlt("imageurl") }, { desc: this.mlt("imagewidth") }, { desc: this.mlt("imageheight") }));
		}

		const Mod = App.modules.profiles.system;

		const url = this.args[argOffset].trim();

		if (!Text.validateHttpsURL(url)) {
			return this.errorReply(this.mlt('invalidurl'));
		}

		const width = parseInt(this.args[argOffset + 1]) || 0;

		if (width < 1 || width > MAX_IMG_WIDTH) {
			return this.errorReply(this.mlt('invalidwidth'));
		}

		const height = parseInt(this.args[argOffset + 2]) || 0;

		if (height < 1 || height > MAX_IMG_HEIGHT) {
			return this.errorReply(this.mlt('invalidheight'));
		}

		Mod.data.profileImages[user] = {
			url: url,
			width: width,
			height: height,
		};

		Mod.db.write();
		this.addToSecurityLog();

		this.reply(this.mlt("profileimageset"));
	},

	deleteprofileimage: "deleteuserprofileimage",
	deleteuserprofileimage: function (App) {
		this.setLangFile(Lang_File);

		let user = Text.toId(this.by);

		if (this.arg) {
			if (!this.can('profileadmin', this.room)) return this.replyAccessDenied('profileadmin');

			user = Text.toId(this.args[0]);

			if (!user || user.length > 18) {
				return this.errorReply(this.mlt('inv'));
			}
		} else {
			if (!this.can('profileimage', this.room)) return this.replyAccessDenied('profileimage');
		}

		const Mod = App.modules.profiles.system;

		if (!Mod.data.profileImages[user]) {
			return this.errorReply(this.mlt('noprofileimage'));
		}

		delete Mod.data.profileImages[user];

		Mod.db.write();
		this.addToSecurityLog();

		this.reply(this.mlt("profileimagedeleted"));
	},
};
