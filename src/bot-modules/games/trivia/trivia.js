/**
 * Trivia
 */

'use strict';

const Wait_Time = 2000;
const Default_Answer_Time = 30 * 1000;

const Path = require('path');

const Text = Tools('text');
const Chat = Tools('chat');
const normalize = Tools('normalize');
const randomize = Tools('randomize');

const Lang_File = Path.resolve(__dirname, 'trivia.translations');

function toWordId(str) {
	if (!str) return '';
	str = normalize(str);
	return str.toLowerCase().replace(/[^a-z0-9\u00f1]/g, '');
}

exports.setup = function (App) {
	function getLanguage(room) {
		return App.config.language.rooms[room] || App.config.language['default'];
	}

	class Trivia {
		constructor(room, games, maxpoints, ansTime) {
			this.room = room;
			this.lang = getLanguage(this.room);
			this.games = games || 0;
			this.maxpoints = maxpoints || 0;
			this.ansTime = ansTime || Default_Answer_Time;

			this.status = 'new';
			this.validAnswers = [];
			this.validAnswersIds = [];
			this.clue = '';

			this.ngame = 0;
			this.points = {};
			this.names = {};
			this.timer = null;

			let data = App.modules.games.system.templates.trivia.data;
			this.questions = randomize(Object.values(data));
			this.qid = -1;
		}

		mlt(key, vars) {
			return App.multilang.mlt(Lang_File, this.lang, key, vars);
		}

		parseWinners(winners) {
			let res = {
				type: 'win',
				text: Chat.bold(winners[0]),
			};
			if (winners.length < 2) return res;
			res.type = 'tie';
			for (let i = 1; i < winners.length - 1; i++) {
				res.text += ", " + Chat.bold(winners[i]);
			}
			res.text += " " + this.mlt('and') + " " + Chat.bold(winners[winners.length - 1]);
			return res;
		}

		send(txt) {
			App.bot.sendTo(this.room, txt);
		}

		start() {
			let txt = Chat.bold(this.mlt(0)) + ". ";
			if (this.games) {
				txt += this.mlt(1) + " " + this.games + " " + this.mlt(2) + ". ";
			}
			if (this.maxpoints) {
				txt += this.mlt(3) + " " + this.maxpoints + " " + this.mlt(4) + ". ";
			}
			txt += this.mlt(5) + " " + Math.floor(this.ansTime / 1000) + " " + this.mlt(6) + ". ";
			txt += this.mlt(7) + " " + Chat.code((App.config.parser.tokens[0] || "") +
			this.mlt(8)) + " " + this.mlt(9) + ".";
			this.send(txt);
			this.status = 'start';
			this.wait();
		}

		wait() {
			this.status = 'wait';
			this.ngame++;
			this.timer = setTimeout(this.nextAnswer.bind(this), Wait_Time);
		}

		nextAnswer() {
			this.timer = null;
			if (this.games && this.ngame > this.games) {
				return this.end();
			}
			if (this.maxpoints) {
				for (let k in this.points) {
					if (this.points[k] >= this.maxpoints) {
						return this.end();
					}
				}
			}
			this.qid++;
			if (this.qid >= this.questions.length) {
				this.qid = 0;
				this.questions = randomize(this.questions);
			}
			let question = this.questions[this.qid];
			this.clue = question.clue;
			this.validAnswers = question.answers.slice();
			this.validAnswersIds = [];
			for (let i = 0; i < this.validAnswers.length; i++) {
				this.validAnswersIds.push(toWordId(this.validAnswers[i]));
			}
			this.status = 'question';
			this.send(Chat.bold("Trivia:") + " " + this.clue);
			this.timer = setTimeout(this.timeout.bind(this), this.ansTime);
		}

		timeout() {
			this.status = 'wait';
			this.timer = null;
			this.send(Chat.bold(this.mlt(10)) + " " + this.mlt('10b') + ": " +
			Chat.italics(this.validAnswers.join(', ')));
			this.wait();
		}

		guess(user, word) {
			let ident = Text.parseUserIdent(user);
			word = toWordId(word);
			if (this.status !== 'question') return;
			if (this.validAnswersIds.indexOf(word) >= 0) {
				this.status = 'wait';
				clearTimeout(this.timer);
				this.timer = null;
				if (!this.points[ident.id]) this.points[ident.id] = 0;
				this.points[ident.id]++;
				this.names[ident.id] = ident.name;
				let ind = this.validAnswersIds.indexOf(word);
				this.send(Chat.bold(this.mlt(11)) + " " + Chat.bold(ident.name) + " " + this.mlt(12) + ": " +
				Chat.italics(this.validAnswers[ind]) + ". " + this.mlt(13) + ": " + this.points[ident.id]);
				this.wait();
			}
		}

		end() {
			this.status = 'end';
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
			let winners = [], points = 0;
			for (let i in this.points) {
				if (this.points[i] === points) {
					winners.push(this.names[i]);
				} else if (this.points[i] > points) {
					points = this.points[i];
					winners = [];
					winners.push(this.names[i]);
				}
			}
			if (!points) {
				this.send(Chat.bold(this.mlt('end')) + " " + this.mlt('lose') + "!");
				App.modules.games.system.terminateGame(this.room);
				return;
			}
			let t = this.parseWinners(winners);
			let txt = Chat.bold(this.mlt('end')) + " ";
			switch (t.type) {
			case 'win':
				txt += this.mlt('grats1') + " " + t.text + " " + this.mlt('grats2') +
					" " + Chat.italics(points + " " + this.mlt('points')) + "!";
				break;
			case 'tie':
				txt += this.mlt('tie1') + " " + Chat.italics(points + " " + this.mlt('points')) +
					" " + this.mlt('tie2') + " " + t.text;
				break;
			}

			this.send(txt);
			App.modules.games.system.terminateGame(this.room);
		}

		destroy() {
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
		}
	}

	return Trivia;
};
