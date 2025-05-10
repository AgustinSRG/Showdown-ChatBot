/**
 * Commands File
 *
 * pokebattle: Simulates a battle between 2 pokemon
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const Chat = Tools('chat');

const Calc = require(Path.resolve(__dirname, "..", "battle-ai", "calc.js"));

const BattleDataMod = require(Path.resolve(__dirname, "..", "battle-ai", "battle-data.js"));

const Lang_File = Path.resolve(__dirname, 'commands.translations');

function botCanHtml(room, App) {
    let roomData = App.bot.rooms[room];
    let botid = Text.toId(App.bot.getBotNick());
    return (roomData && roomData.users[botid] && App.parser.equalOrHigherGroup({ group: roomData.users[botid] }, 'bot'));
}

function randomItem(App) {
    let items;
    try {
        items = App.data.getItems();
    } catch (err) {
        App.reportCrash(err);
        return "";
    }

    const itemsKeys = Object.keys(items);
    return items[itemsKeys[Math.floor(Math.random() * itemsKeys.length)]].name;
}

function randomMoves(App, poke) {
    let pokedex;
    let moves;
    let learnSets;

    try {
        pokedex = App.data.getPokedex();
        moves = App.data.getMoves();
        learnSets = App.data.getLearnsets();
    } catch (err) {
        App.reportCrash(err);
        return [];
    }

    poke = Text.toId(poke);

    if (pokedex[poke] && pokedex[poke].baseSpecies) {
        poke = Text.toId(pokedex[poke].baseSpecies);
    }

    if (!learnSets[poke]) {
        return [];
    }

    const learnMoves = Object.keys(learnSets[poke].learnset || {}).filter(function (m) {
        const mData = moves[Text.toId(m)];

        if (!mData) {
            return false;
        }

        return mData.category !== "Status";
    });

    const result = [];

    for (let i = 0; i < 4 && learnMoves.length > 0; i++) {
        const mIndex = Math.floor(Math.random() * learnMoves.length);
        const move = learnMoves.splice(mIndex, 1)[0];

        if (move) {
            result.push(move);
        }
    }

    return result;
}

const GENDERS = ['M', 'F'];

const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const NATURES = Object.keys(require(Path.resolve(__dirname, "..", "battle-ai", "natures.js")).Natures);

module.exports = {
    pokebattle: function (App) {
        this.setLangFile(Lang_File);

        const PokeBattleManager = App.modules.battle.system.PokeBattleManager;

        // Check restrictions

        if (this.getRoomType(this.room) !== 'chat') return this.errorReply(this.mlt('nochat'));
        if (!this.can('pokebattle', this.room)) return this.replyAccessDenied('pokebattle');
        if (!botCanHtml(this.room, App)) {
            return this.errorReply(this.mlt('nobot'));
        }

        // Parse options

        if (!this.arg) {
            return this.errorReply(this.mlt('usage') + ": " + Chat.italics('<Pokemon> VS <Pokemon>'));
        }

        if (Text.toId(this.arg) in { 'stop': 1, 'interrupt': 1, 'cancel': 1 }) {
            if (PokeBattleManager.stopBattle(this.room)) {
                return this.errorReply(this.mlt(4));
            } else {
                return this.reply(this.mlt(5));
            }
        }

        const BattleData = BattleDataMod.setup(App);

        const arg = this.arg.replace(/\svs\s/gi, " vs ");

        const argParts = arg.split(" vs ");

        if (argParts.length !== 2) {
            return this.errorReply(this.mlt('usage') + ": " + Chat.italics('<Pokemon> VS <Pokemon>'));
        }

        const pokes = [null, null];

        for (let i = 0; i < argParts.length; i++) {
            const argPart = argParts[i];

            const pokeArgParts = argPart.split("@");

            const pokeSpecies = Text.toId(pokeArgParts[0]);

            const pokeTemplate = BattleData.getPokemon(pokeSpecies);

            if (!pokeTemplate || !pokeTemplate.types || pokeTemplate.types.length === 0) {
                return this.errorReply(this.mlt(1) + ": " + Chat.italics(pokeSpecies));
            }

            const gender = pokeTemplate.gender || GENDERS[Math.floor(Math.random() * GENDERS.length)];

            const ivs = {
                hp: Math.floor(Math.random() * 31),
                atk: Math.floor(Math.random() * 31),
                def: Math.floor(Math.random() * 31),
                spa: Math.floor(Math.random() * 31),
                spd: Math.floor(Math.random() * 31),
                spe: Math.floor(Math.random() * 31),
            };

            const evs = {
                hp: 0,
                atk: 0,
                def: 0,
                spa: 0,
                spd: 0,
                spe: 0,
            };

            const shiny = Math.floor(Math.random() * 4096) <= 1;

            let evsStat = Object.keys(evs);

            let totalEvs = 0;

            while (totalEvs < 510) {
                const stat = evsStat[Math.floor(Math.random() * evsStat.length)];

                const minPlus = 1;
                const maxPlus = Math.min(255 - evs[stat], 510 - totalEvs);

                const randomPlus = minPlus + Math.floor(Math.random() * (maxPlus - minPlus));

                evs[stat] += randomPlus;

                if (evs[stat] >= 255) {
                    evsStat = evsStat.filter(s => s !== stat);
                }

                totalEvs += randomPlus;
            }

            const nature = BattleData.getNature(NATURES[Math.floor(Math.random() * NATURES.length)]);

            let item = randomItem(App) || null;

            if (item) {
                item = BattleData.getItem(item);
            }

            let ability = null;

            if (pokeTemplate.abilities && typeof pokeTemplate.abilities === "object") {
                const keys = Object.keys(pokeTemplate.abilities);

                ability = pokeTemplate.abilities[keys[Math.floor(Math.random() * keys.length)]] || null;

                if (ability) {
                    ability = BattleData.getAbility(ability);
                }
            }

            const moves = randomMoves(App, pokeTemplate.species).map(function (move) {
                return BattleData.getMove(move);
            });

            const poke = new Calc.Pokemon(pokeTemplate, {
                gender: gender,
                ivs: ivs,
                evs: evs,
                shiny: shiny,
                item: item,
                ability: ability,
                moves: moves,
                nature: nature,
            });

            pokes[i] = poke;

            const detailsArg = pokeArgParts.slice(1).join("@");

            const detailsArgParts = detailsArg.split(",");

            for (let part of detailsArgParts) {
                let partS = part.split("=");
                let s = "=";

                if (partS.length === 1) {
                    partS = part.split(":");
                    s = ":";
                }

                const propName = Text.toId(partS[0]);

                if (!propName) {
                    continue;
                }

                const propValue = partS.slice(1).join(s);

                switch (propName) {
                    case "shiny":
                        poke.shiny = Text.toId(propValue) !== "no";
                        break;
                    case "gender":
                        poke.gender = (propValue.charAt(0) || "N").toUpperCase();
                        break;
                    case "item":
                        if (propValue) {
                            poke.item = BattleData.getItem(propValue);
                        }
                        break;
                    case "ability":
                        if (propValue) {
                            poke.ability = BattleData.getAbility(propValue);
                        }
                        break;
                    case "moves":
                        {
                            const moveNames = propValue.split("/");
                            const customMoves = [];

                            for (let moveName of moveNames) {
                                const moveId = Text.toId(moveName);

                                if (moveId) {
                                    customMoves.push(BattleData.getMove(moveId));
                                }
                            }

                            poke.moves = customMoves;
                        }
                        break;
                    case "ivs":
                        {
                            const statParts = propValue.split("/");

                            const customIvs = {
                                hp: 31,
                                atk: 31,
                                def: 31,
                                spa: 31,
                                spd: 31,
                                spe: 31,
                            };

                            const customIvsKeys = Object.keys(customIvs);

                            let statIndex = 0;
                            for (let statPart of statParts) {
                                statPart = statPart.trim();

                                let num = "";
                                let statName = "";

                                for (let j = 0; j < statPart.length; j++) {
                                    const c = statPart.charAt(j);

                                    if (NUMBERS.indexOf(c) >= 0) {
                                        num += c;
                                    } else {
                                        num = Math.max(0, Math.min(31, parseInt(num) || 0));
                                        statName = Text.toId(statPart.substring(j));

                                        if (!statName) {
                                            statName = customIvsKeys[statIndex] || "";
                                        }

                                        break;
                                    }
                                }

                                if (customIvsKeys.indexOf(statName) >= 0) {
                                    customIvs[statName] = num;
                                }

                                statIndex++;
                            }

                            poke.ivs = customIvs;
                        }
                        break;
                    case "evs":
                        {
                            const statParts = propValue.split("/");

                            const customEvs = {
                                hp: 0,
                                atk: 0,
                                def: 0,
                                spa: 0,
                                spd: 0,
                                spe: 0,
                            };

                            const customEvsKeys = Object.keys(customEvs);

                            let statIndex = 0;
                            for (let statPart of statParts) {
                                statPart = statPart.trim();

                                let num = "";
                                let statName = "";

                                for (let j = 0; j < statPart.length; j++) {
                                    const c = statPart.charAt(j);

                                    if (NUMBERS.indexOf(c) >= 0) {
                                        num += c;
                                    } else {
                                        num = Math.max(0, Math.min(255, parseInt(num) || 0));
                                        statName = Text.toId(statPart.substring(j));

                                        if (!statName) {
                                            statName = customEvsKeys[statIndex] || "";
                                        }

                                        break;
                                    }
                                }

                                if (customEvsKeys.indexOf(statName) >= 0) {
                                    customEvs[statName] = num;
                                }

                                statIndex++;
                            }

                            poke.evs = customEvs;
                        }
                        break;
                    case "nature":
                        if (propValue) {
                            poke.nature = BattleData.getNature(propValue);
                        }
                        break;
                    case "level":
                        if (propValue) {
                            poke.level = Math.min(9999, Math.max(1, parseInt(propValue) || 100));
                        }
                        break;
                    case "happiness":
                        if (propValue) {
                            poke.happiness = Math.min(255, Math.max(0, parseInt(propValue) || 0));
                        }
                        break;
                    case "hp":
                        if (propValue) {
                            poke.hp = Math.min(100, Math.max(1, parseInt(propValue) || 100));
                        }
                        break;
                    case "name":
                        if (propValue) {
                            poke.name = propValue.substring(0, 40).trim();
                        }
                        break;
                    default:
                        return this.errorReply(this.mlt(2) + ": " + Chat.italics(propName));
                }
            }
        }

        const pokeA = pokes[0];
        const pokeB = pokes[1];

        if (!pokeA || !pokeB) {
            return this.errorReply(this.mlt('usage') + ": " + Chat.italics('<Pokemon> VS <Pokemon>'));
        }

        if (PokeBattleManager.battles[this.room]) {
            return this.errorReply(this.mlt(3));
        }

        this.reply(Chat.bold(this.mlt(6)) + ": " + Chat.bold(pokeA.name) + " VS " + Chat.bold(pokeB.name));

        PokeBattleManager.createBattle(this.room, pokeA, pokeB);
    }
};
