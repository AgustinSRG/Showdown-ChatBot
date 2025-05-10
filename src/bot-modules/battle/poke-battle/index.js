/**
 * Poke battle manager
 */

'use strict';

const Path = require('path');
const PokeBattle = require(Path.resolve(__dirname, "poke-battle.js")).PokeBattle;

exports.setup = function (App) {
    const PokeBattleManager = Object.create(null);

    PokeBattleManager.battles = Object.create(null);

    PokeBattleManager.nextBattleId = 0;

    PokeBattleManager.getBattleId = function () {
        this.nextBattleId++;

        const ts = Math.floor(Date.now() / 1000);

        return 'pokebattle-' + ts + "-" + this.nextBattleId;
    };

    PokeBattleManager.clean = function () {
        for (let room of Object.keys(this.battles)) {
            this.battles[room].destroy();
        }

        this.battles = Object.create(null);
    };

    PokeBattleManager.battleEnded = function (room) {
        delete this.battles[room];
    };

    PokeBattleManager.createBattle = function (room, pokeA, pokeB) {
        if (this.battles[room]) {
            return false;
        }

        const pokeBattle = new PokeBattle(App, room, pokeA, pokeB, this.getBattleId(), this.battleEnded.bind(this));

        this.battles[room] = pokeBattle;

        pokeBattle.start();

        return true;
    };

    PokeBattleManager.stopBattle = function (room) {
        if (!this.battles[room]) {
            return false;
        }

        this.battles[room].destroy();
        delete this.battles[room];

        return true;
    };

    return PokeBattleManager;
};
