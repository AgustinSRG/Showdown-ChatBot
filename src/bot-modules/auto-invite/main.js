/**
 * Bot Module: AutoInvite
 */

'use strict';

const Roomauth_Check_Interval = 30 * 1000;

const Text = Tools('text');

exports.setup = function (App) {
	if (!App.config.modules.autoinvite) {
		App.config.modules.autoinvite = {
			room: '',
			"public": '',
			rank: 'voice',
		};
	}

	class AutoInviteModule {
		constructor() {
			this.roomAuth = {};
			this.roomAuthChanged = false;
			this.timer = null;
		}

		getInitCmds() {
			let cmds = [];
			if (App.config.modules.autoinvite.room) {
				cmds.push(App.config.modules.autoinvite.room + '|/roomauth');
				if (this.popupHandler) {
					App.bot.removeListener('popup', this.popupHandler);
					this.popupHandler = null;
				}
				this.popupHandler = this.parsePopup.bind(this);
				App.bot.on('popup', this.popupHandler);
			}
			return cmds;
		}

		parsePopup(popup) {
			if (Text.toId(popup.substr(0, 4)) === 'room') {
				let auth = {};
				let _message = popup.replace("Moderators", ":");
				_message = _message.replace("Drivers", ":");
				_message = _message.replace("Voices", ":");
				let parts = _message.split(':');
				let rank = " ";
				let usersList;
				for (let i = 0; i < parts.length - 1; i += 2) {
					usersList = parts[i + 1].split("||||")[0].split(',');
					if (parts[i].indexOf("(") > -1) rank = parts[i].substr(parts[i].indexOf("(") + 1, 1);
					for (let f = 0; f < usersList.length; f++) {
						auth[Text.toId(usersList[f])] = rank;
					}
				}
				this.roomAuth = auth;
				App.log("[AUTO-INVITE] Roomauth realoaded from room: " + App.config.modules.autoinvite.room);
				App.bot.removeListener('popup', this.popupHandler);
				this.popupHandler = null;
			}
		}

		checkRoomAuth() {
			if (this.roomAuthChanged) {
				this.roomAuthChanged = false;
				let cmds = this.getInitCmds();
				if (cmds.length) {
					App.bot.send(cmds);
				}
			}
		}

		userCanBeInvited(room, ident) {
			if (room !== App.config.modules.autoinvite.public) return;
			let tarRoom = App.config.modules.autoinvite.room;
			if (!tarRoom) return false;
			if (tarRoom === room) return false;
			if (App.bot.rooms[tarRoom] && App.bot.rooms[tarRoom].users[ident.id]) return false;
			let rank = this.roomAuth[ident.id];
			let tarRank = App.config.modules.autoinvite.rank;
			if (App.parser.equalOrHigherGroup({group: rank}, tarRank)) {
				return true;
			} else {
				return false;
			}
		}
	}

	const mod = new AutoInviteModule();

	App.bot.on('userjoin', (room, by) => {
		let user = Text.parseUserIdent(by);
		if (mod.userCanBeInvited(room, user)) {
			App.bot.sendTo(App.config.modules.autoinvite.room, '/invite ' + user.id);
		}
	});

	App.bot.on('userrename', (room, old, by) => {
		let user = Text.parseUserIdent(by);
		if (user.id === Text.toId(old)) return;
		if (mod.userCanBeInvited(room, user)) {
			App.bot.sendTo(App.config.modules.autoinvite.room, '/invite ' + user.id);
		}
	});

	App.bot.on('userchat', (room, time, by, msg) => {
		if (!App.bot.rooms[room] || App.bot.rooms[room].type !== 'chat') return;
		if (!App.config.modules.autoinvite.room || App.config.modules.autoinvite.room !== room) return;
		if (msg.substr(0, 5) === "/log ") {
			let line = msg.substr(5);
			if (line.indexOf(" was promoted ") >= 0 || line.indexOf(" was demoted ") >= 0) {
				mod.roomAuthChanged = true;
			}
		}
	});

	App.bot.on('line', (room, line, spl, isIntro) => {
		if (isIntro) return;
		if (!App.bot.rooms[room] || App.bot.rooms[room].type !== "chat") return;
		if (!App.config.modules.autoinvite.room || App.config.modules.autoinvite.room !== room) return;
		if (line.substr(0) !== '|') {
			if (line.indexOf(" was promoted ") >= 0 || line.indexOf(" was demoted ") >= 0) {
				mod.roomAuthChanged = true;
			}
		}
	});

	App.bot.on('connect', () => {
		if (mod.timer) {
			clearInterval(mod.timer);
			mod.timer = null;
		}
		mod.timer = setInterval(mod.checkRoomAuth.bind(mod), Roomauth_Check_Interval);
	});

	App.bot.on('disconnect', () => {
		if (mod.timer) {
			clearInterval(mod.timer);
			mod.timer = null;
		}
	});

	return mod;
};
