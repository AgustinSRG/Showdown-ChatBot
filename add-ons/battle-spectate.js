// Add-on for the bot to spectate server battles

'use strict';

const SPECTATE_TOURNAMENT_BATTLES = true;
const SPECTATE_SERVER_BATTLES = true;

/* Setup function: Called on add-on installation */
exports.setup = function (App) {
	function shouldSpectateTournament(room) {
		if (!App.bot.rooms[room] || App.bot.rooms[room].type !== 'chat') {
			return false;
		}

		return SPECTATE_TOURNAMENT_BATTLES;
	}

	function isBattleBotBattle(room) {
		if (!App.modules.battle || !App.modules.battle.system) {
			return false;
		}

		const battleBot = App.modules.battle.system.BattleBot;

		return battleBot.battles[room] && !!battleBot.battles[room].self;
	}

	return Tools('add-on').forApp(App).install({
		events: {
			"line": function (room, line, spl, isIntro) {
				// Join battles announced in the server lobby
				if (!isIntro && spl[0] === "b" && SPECTATE_SERVER_BATTLES && App.bot.rooms[room] && App.bot.rooms[room].type === 'chat') {
					App.bot.sendTo('', '/noreply /join ' + spl[1]);
				}
		
				// Join tournament battles
				if (!isIntro && spl[0] === 'tournament' && spl[1] === 'battlestart' && spl[4]) {
					if (shouldSpectateTournament(room)) {
						App.bot.sendTo('', '/noreply /join ' + spl[4]);
					}
				}

				if (App.bot.rooms[room] && App.bot.rooms[room].type === 'battle') {
					// Leave battles after they end
					if (spl[0] === "win" || spl[0] === "tie" || spl[0] === "prematureend") {
						if (!isBattleBotBattle(room)) {
							App.bot.sendTo("", "/noreply /leave " + room);
						}
					}
				}
			},
		},
	});
};
