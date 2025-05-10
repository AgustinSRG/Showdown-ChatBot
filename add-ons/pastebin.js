// Pastebin add-on
// ----------------
// Includes a set of commands to configure things in bulk with a pastebin link
// Note: The GET commands require you to set up the 'Control panel Url' option (Admin section of the control panel)
// ----------------
//
// - setrand: Sets all the options for a random command.
//            The pastebin link must have each option in each line.
//
// -----------------------------------------------------------------
//
// - getkuncdata: Exports the data for the Kunc game.
// - setkuncdata: Imports the data for the Kunc game
//
// The Kunc data has the following format (one each line):
//     - Species||move1,move2...
// Example:
//     - Pikachu||Thunderbolt,Fake Out,Iron Tail,Extreme Speed
//
// -----------------------------------------------------------------
//
// - gettriviadata: Exports the data for the Trivia game.
// - settriviadata: Imports the data for the Trivia game
//
// The Trivia data has the following format (one each line):
//     - Clue||answer,answer...
// Example:
//     - Which is the fastest Pokemon?||Regieleki
//
// -----------------------------------------------------------------
//
// - gethangmandata: Exports the data for the Hangman game.
// - sethangmandata: Imports the data for the Hangman game
//
// The Hangman data has the following format (one each line):
//     - Clue||word,word...
// Example:
//     - Fruit||Apple,Orange,Strawberry,Pear
//
// -----------------------------------------------------------------
//
// - getanagramsdata: Exports the data for the Anagrams game.
// - setanagramsdata: Imports the data for the Anagrams game
//
// The Anagrams data has the following format (one each line):
//     - Clue||word,word...
// Example:
//     - Fruit||Apple,Orange,Strawberry,Pear
//
// ------------------------------------------------------------------


'use strict';

// Name of the permission required for the commands
const PERMISSION_REQUIRED = 'randadmin';

const Text = Tools('text');
const Chat = Tools('chat');
const HTTPS = require('https');
const Url = require('url');

function wget(url, callback) {
    url = Url.parse(url);
    HTTPS.get(url.href, response => {
        if (response.statusCode !== 200) {
            if (response.statusCode === 404) {
                return callback(null, new Error("404 - Not found"));
            } else {
                return callback(null, new Error("" + response.statusCode));
            }
        }
        let data = '';
        response.on('data', chunk => {
            data += chunk;
        });
        response.on('end', () => {
            callback(data);
        });
        response.on('error', err => {
            callback(null, err);
        });
    }).on('error', err => {
        callback(null, err);
    });
}

exports.setup = function (App) {
    return Tools('add-on').forApp(App).install({
        /* Add-on Commands */
        commandsOverwrite: true,
        commands: {
            setrand: function () {
                if (!this.can(PERMISSION_REQUIRED, this.room)) return this.replyAccessDenied(PERMISSION_REQUIRED);
                let Mod = App.modules.randcmd.system;

                if (this.args.length !== 2) {
                    return this.errorReply(this.usage({ desc: "Command" }, { desc: "Pastebin link - Tendrá cada opción del comando en una línea" }));
                }

                const cmd = Text.toId(this.args[0]);

                let link = (this.args[1] + "").trim();
                let linkRegex = /^https:\/\/pastebin\.com\/([A-Za-z0-9]+)/;
                let linkRes = linkRegex.exec(link);

                if (!linkRes) {
                    return this.errorReply("Invalid Pastebin link.");
                }

                wget("https://pastebin.com/raw/" + linkRes[1] + "", function (data, err) {
                    if (err) {
                        return this.errorReply("Could not read the Pastebin link. Error: " + err.message);
                    }

                    let discardCount = 0;

                    let lines = data.split("\n");

                    if (lines.length > 2048) {
                        return this.errorReply("The list of options cannot exceed 2048 elements.");
                    }

                    lines = lines.map(d => {
                        return d.trim();
                    }).filter(d => {
                        if (!d) {
                            return false;
                        }

                        if (d.startsWith("/addhtmlbox")) {
                            if (d.length <= (16 * 1000)) {
                                return true;
                            } else {
                                discardCount++;
                                return false;
                            }
                        } else {
                            if (d.length <= 300) {
                                return true;
                            } else {
                                discardCount++;
                                return false;
                            }
                        }
                    });

                    if (lines.length === 0) {
                        return this.errorReply("The list of options cannot be empty." + (discardCount > 0 ? (" (Discarded " + discardCount + " " + (discardCount === 1 ? "option" : "options") + " with invalid length)") : ""));
                    }

                    Mod.data.commands[cmd] = lines.join("\n");

                    Mod.db.write();
                    this.addToSecurityLog();

                    this.reply("Random command successfully configured: " + Chat.italics(this.token + cmd) + (discardCount > 0 ? (" (Discarded " + discardCount + " " + (discardCount === 1 ? "option" : "options") + " with invalid length)") : ""));
                }.bind(this));
            },

            getkuncdata: function () {
                if (!this.can(PERMISSION_REQUIRED, this.room)) return this.replyAccessDenied(PERMISSION_REQUIRED);

                const data = App.modules.games.system.templates.kunc.data;

                let text = "";

                for (let set of data.sets) {
                    text += set.species + "||" + (set.moves || []).join(", ") + "\n";
                }

                let key = App.data.temp.createTempFile(
                    "<html>" +
                    "<body><p>" +
                    Text.escapeHTML(text).replace(/\n/g, "<br>") +
                    "</p></body>" +
                    "</html>"
                );

                this.reply("Sets para el juego Kunc: " + App.server.getControlPanelLink('/temp/' + key));
            },

            setkuncdata: function () {
                if (!this.can(PERMISSION_REQUIRED, this.room)) return this.replyAccessDenied(PERMISSION_REQUIRED);

                if (this.args.length !== 1 || !this.args[0]) {
                    return this.errorReply(this.usage({ desc: "Pastebin link - Tendrá un set en cada linea, con formato: Pokemon || Movimiento, Movimiento, Movimiento, Movimiento" }));
                }

                const modData = App.modules.games.system.templates.kunc.data;
                const db = App.modules.games.system.templates.kunc.db;

                let link = (this.args[0] + "").trim();
                let linkRegex = /^https:\/\/pastebin\.com\/([A-Za-z0-9]+)/;
                let linkRes = linkRegex.exec(link);

                if (!linkRes) {
                    return this.errorReply("Invalid Pastebin link.");
                }

                const pokedex = App.data.getPokedex();
                const movedex = App.data.getMoves();

                wget("https://pastebin.com/raw/" + linkRes[1] + "", function (data, err) {
                    if (err) {
                        return this.errorReply("Could not read the Pastebin link. Error: " + err.message);
                    }

                    let sets = [];

                    let lines = data.split("\n");

                    if (lines.length > 5000) {
                        return this.errorReply("Error: No se admiten más de 5000 sets.");
                    }

                    let lineCount = 0;
                    for (let line of lines) {
                        line = line.trim();
                        lineCount++;

                        if (!line) {
                            continue;
                        }

                        let spl = line.split("||");

                        if (spl.length !== 2) {
                            return this.errorReply("Error: La línea " + lineCount + " del Pastebin no tiene el formato correcto.");
                        }

                        const poke = pokedex[Text.toId(spl[0])];

                        if (!poke) {
                            return this.errorReply("Error: La línea " + lineCount + " del Pastebin especifica un Pokemon inexistente: " + spl[0].substr(0, 80));
                        }

                        let moves = [];

                        spl = spl[1].split(",");

                        for (let s of spl) {
                            if (!Text.toId(s)) {
                                continue;
                            }

                            const move = movedex[Text.toId(s)];

                            if (!move) {
                                return this.errorReply("Error: La línea " + lineCount + " del Pastebin especifica un movimiento inexistente: " + s.substr(0, 80));
                            }

                            moves.push(move);
                        }

                        if (moves.length === 0) {
                            return this.errorReply("Error: La línea " + lineCount + " del Pastebin contiene un set sin movimientos válidos.");
                        }

                        if (moves.length > 4) {
                            return this.errorReply("Error: La línea " + lineCount + " del Pastebin contiene más de 4 movimientos.");
                        }

                        sets.push({
                            species: poke.name,
                            moves: moves.map(m => {
                                return m.name;
                            }),
                        });
                    }

                    if (sets.length === 0) {
                        return this.errorReply("Error: La lista de sets no puede estar vacía");
                    }

                    modData.sets = sets;
                    db.write();

                    this.addToSecurityLog();

                    this.reply("Los sets para el juego Kunc han sido modificados correctamente.");
                }.bind(this));
            },

            gettriviadata: function () {
                if (!this.can(PERMISSION_REQUIRED, this.room)) return this.replyAccessDenied(PERMISSION_REQUIRED);

                const data = App.modules.games.system.templates.trivia.data;

                let text = "";

                for (let id of Object.keys(data)) {
                    text += data[id].clue + "||" + (data[id].answers || []).join(", ") + "\n";
                }

                let key = App.data.temp.createTempFile(
                    "<html>" +
                    "<body><p>" +
                    Text.escapeHTML(text).replace(/\n/g, "<br>") +
                    "</p></body>" +
                    "</html>"
                );

                this.reply("Preguntas para el juego de Trivia: " + App.server.getControlPanelLink('/temp/' + key));
            },

            settriviadata: function () {
                if (!this.can(PERMISSION_REQUIRED, this.room)) return this.replyAccessDenied(PERMISSION_REQUIRED);

                if (this.args.length !== 1 || !this.args[0]) {
                    return this.errorReply(this.usage({ desc: "Pastebin link - Tendrá una pregunta en cada línea, con formato: Pregunta || Respuesta, Respuesta..." }));
                }

                let mod = App.modules.games.system.templates.trivia;

                let link = (this.args[0] + "").trim();
                let linkRegex = /^https:\/\/pastebin\.com\/([A-Za-z0-9]+)/;
                let linkRes = linkRegex.exec(link);

                if (!linkRes) {
                    return this.errorReply("Invalid Pastebin link.");
                }

                wget("https://pastebin.com/raw/" + linkRes[1] + "", function (data, err) {
                    if (err) {
                        return this.errorReply("Could not read the Pastebin link. Error: " + err.message);
                    }

                    let questions = [];

                    let lines = data.split("\n");

                    if (lines.length > 5000) {
                        return this.errorReply("Error: No se admiten más de 5000 preguntas.");
                    }

                    let lineCount = 0;
                    for (let line of lines) {
                        line = line.trim();
                        lineCount++;

                        if (!line) {
                            continue;
                        }

                        let spl = line.split("||");

                        if (spl.length !== 2) {
                            return this.errorReply("Error: La línea " + lineCount + " del Pastebin no tiene el formato correcto.");
                        }

                        const clue = spl[0].trim();

                        if (!clue || clue.length > 200) {
                            return this.errorReply("Error: La línea " + lineCount + " del Pastebin contiene una pregunta no válida.");
                        }

                        const answers = spl[1].split(",").map(a => {
                            return a.trim();
                        }).filter(a => {
                            return !!a && a.length < 100;
                        });

                        if (answers.length === 0) {
                            return this.errorReply("Error: La línea " + lineCount + " del Pastebin contiene una pregunta sin respuestas.");
                        }

                        questions.push({
                            clue: clue,
                            answers: answers,
                        });
                    }

                    if (questions.length === 0) {
                        return this.errorReply("Error: La lista de preguntas no puede estar vacía");
                    }

                    for (let id in Object.keys(mod.data)) {
                        delete mod.data[id];
                    }

                    for (let q of questions) {
                        mod.addQuestion(q.clue, q.answers);
                    }

                    mod.db.write();

                    this.addToSecurityLog();

                    this.reply("Las preguntas del juego de Trivia han sido modificadas correctamente.");
                }.bind(this));
            },

            gethangmandata: function () {
                if (!this.can(PERMISSION_REQUIRED, this.room)) return this.replyAccessDenied(PERMISSION_REQUIRED);

                const data = App.modules.games.system.templates.wordgames.data;

                let text = "";

                for (let group of Object.keys(data)) {
                    text += group + "||" + (data[group] || []).join(", ") + "\n";
                }

                let key = App.data.temp.createTempFile(
                    "<html>" +
                    "<body><p>" +
                    Text.escapeHTML(text).replace(/\n/g, "<br>") +
                    "</p></body>" +
                    "</html>"
                );

                this.reply("Palabras para el juego Hangman: " + App.server.getControlPanelLink('/temp/' + key));
            },

            sethangmandata: function () {
                if (!this.can(PERMISSION_REQUIRED, this.room)) return this.replyAccessDenied(PERMISSION_REQUIRED);

                if (this.args.length !== 1 || !this.args[0]) {
                    return this.errorReply(this.usage({ desc: "Pastebin link - Tendrá un grupo de palabras en cada línea, con formato: Pista del Grupo || Palabra, Palabra..." }));
                }

                let mod = App.modules.games.system.templates.wordgames;

                let link = (this.args[0] + "").trim();
                let linkRegex = /^https:\/\/pastebin\.com\/([A-Za-z0-9]+)/;
                let linkRes = linkRegex.exec(link);

                if (!linkRes) {
                    return this.errorReply("Invalid Pastebin link.");
                }

                wget("https://pastebin.com/raw/" + linkRes[1] + "", function (data, err) {
                    if (err) {
                        return this.errorReply("Could not read the Pastebin link. Error: " + err.message);
                    }

                    let groups = [];

                    let lines = data.split("\n");

                    if (lines.length > 5000) {
                        return this.errorReply("Error: No se admiten más de 5000 grupos.");
                    }

                    let lineCount = 0;
                    for (let line of lines) {
                        line = line.trim();
                        lineCount++;

                        if (!line) {
                            continue;
                        }

                        let spl = line.split("||");

                        if (spl.length !== 2) {
                            return this.errorReply("Error: La línea " + lineCount + " del Pastebin no tiene el formato correcto.");
                        }

                        const group = spl[0].trim();

                        if (!group || group.length > 200) {
                            return this.errorReply("Error: La línea " + lineCount + " del Pastebin contiene un grupo válido.");
                        }

                        const words = spl[1].split(",").map(a => {
                            return a.trim();
                        }).filter(a => {
                            return !!a && a.length < 100;
                        });

                        if (words.length === 0) {
                            return this.errorReply("Error: La línea " + lineCount + " del Pastebin contiene un grupo vacío.");
                        }

                        groups.push({
                            group: group,
                            words: words,
                        });
                    }

                    if (groups.length === 0) {
                        return this.errorReply("Error: La lista de palabras no puede estar vacía");
                    }

                    for (let id in Object.keys(mod.data)) {
                        delete mod.data[id];
                    }

                    for (let g of groups) {
                        mod.data[g.group] = g.words;
                    }

                    mod.db.write();

                    this.addToSecurityLog();

                    this.reply("Las palabras del juego Hangman han sido modificadas correctamente.");
                }.bind(this));
            },

            // Anagrams

            getanagramsdata: function () {
                if (!this.can(PERMISSION_REQUIRED, this.room)) return this.replyAccessDenied(PERMISSION_REQUIRED);

                const data = App.modules.games.system.templates.wordgames.data;

                let text = "";

                for (let group of Object.keys(data)) {
                    text += group + "||" + (data[group] || []).join(", ") + "\n";
                }

                let key = App.data.temp.createTempFile(
                    "<html>" +
                    "<body><p>" +
                    Text.escapeHTML(text).replace(/\n/g, "<br>") +
                    "</p></body>" +
                    "</html>"
                );

                this.reply("Palabras para el juego Anagrams: " + App.server.getControlPanelLink('/temp/' + key));
            },

            setanagramsdata: function () {
                if (!this.can(PERMISSION_REQUIRED, this.room)) return this.replyAccessDenied(PERMISSION_REQUIRED);

                if (this.args.length !== 1 || !this.args[0]) {
                    return this.errorReply(this.usage({ desc: "Pastebin link - Tendrá un grupo de palabras en cada línea, con formato: Pista del Grupo || Palabra, Palabra..." }));
                }

                let mod = App.modules.games.system.templates.wordgames;

                let link = (this.args[0] + "").trim();
                let linkRegex = /^https:\/\/pastebin\.com\/([A-Za-z0-9]+)/;
                let linkRes = linkRegex.exec(link);

                if (!linkRes) {
                    return this.errorReply("Invalid Pastebin link.");
                }

                wget("https://pastebin.com/raw/" + linkRes[1] + "", function (data, err) {
                    if (err) {
                        return this.errorReply("Could not read the Pastebin link. Error: " + err.message);
                    }

                    let groups = [];

                    let lines = data.split("\n");

                    if (lines.length > 5000) {
                        return this.errorReply("Error: No se admiten más de 5000 grupos.");
                    }

                    let lineCount = 0;
                    for (let line of lines) {
                        line = line.trim();
                        lineCount++;

                        if (!line) {
                            continue;
                        }

                        let spl = line.split("||");

                        if (spl.length !== 2) {
                            return this.errorReply("Error: La línea " + lineCount + " del Pastebin no tiene el formato correcto.");
                        }

                        const group = spl[0].trim();

                        if (!group || group.length > 200) {
                            return this.errorReply("Error: La línea " + lineCount + " del Pastebin contiene un grupo válido.");
                        }

                        const words = spl[1].split(",").map(a => {
                            return a.trim();
                        }).filter(a => {
                            return !!a && a.length < 100;
                        });

                        if (words.length === 0) {
                            return this.errorReply("Error: La línea " + lineCount + " del Pastebin contiene un grupo vacío.");
                        }

                        groups.push({
                            group: group,
                            words: words,
                        });
                    }

                    if (groups.length === 0) {
                        return this.errorReply("Error: La lista de palabras no puede estar vacía");
                    }

                    for (let id in Object.keys(mod.data)) {
                        delete mod.data[id];
                    }

                    for (let g of groups) {
                        mod.data[g.group] = g.words;
                    }

                    mod.db.write();

                    this.addToSecurityLog();

                    this.reply("Las palabras del juego Anagrams han sido modificadas correctamente.");
                }.bind(this));
            },

            // End
        },
    });
};