/**
 * Battle helpers
 */

'use strict';

const Text = Tools('text');
const Path = require("path");
const Calc = require(Path.resolve(__dirname, "..", "bot-modules", "battle", "battle-ai", "calc.js"));

exports.CustomBattleModule = function (App, id, config, setup) {
	const setupFunction = function (Data) {
		const deciders = setup(Data, Calc);

		function checkDecisionGroup(g, rules) {
			const result = {
				ruleFound: false,
				value: 0,
			};
			let active = 0;
			for (let decision of g) {
				const r = checkDecision(decision, rules, active);

				if (r.ruleFound) {
					result.ruleFound = true;
					result.value += r.value;
				}

				active++;
			}
			return result;
		}

		function checkDecision(decision, rules, active) {
			const result = {
				ruleFound: false,
				value: 0,
			};

			for (let rule of rules) {
				const r = checkDecisionRule(decision, rule, active);

				if (r.ruleFound) {
					if (!result.ruleFound || r.value > result.value) {
						result.value = r.value;
					}

					result.ruleFound = true;
				}
			}

			return result;
		}

		function checkDecisionRule(decision, rule, active) {
			const result = {
				ruleFound: false,
				value: 0,
			};

			if (decision.type === rule.type && (rule.active === undefined || active === rule.active)) {
				switch (decision.type) {
					case "move":
						{
							if (rule.move !== undefined) {
								if (Text.toId(rule.move) !== Text.toId(decision.move)) {
									break; // Rule broken
								}
							}

							if (rule.moveId !== undefined) {
								if (rule.moveId !== decision.moveId) {
									break;
								}
							}

							if (rule.mega !== undefined) {
								if (rule.mega !== decision.mega) {
									break;
								}
							}

							if (rule.zmove !== undefined) {
								if (rule.zmove !== decision.zmove) {
									break;
								}
							}

							if (rule.ultra !== undefined) {
								if (rule.ultra !== decision.ultra) {
									break;
								}
							}

							if (rule.dynamax !== undefined) {
								if (rule.dynamax !== decision.dynamax) {
									break;
								}
							}

							if (rule.terastallize !== undefined) {
								if (rule.terastallize !== decision.terastallize) {
									break;
								}
							}

							if (rule.target !== undefined) {
								if (rule.target !== decision.target) {
									break;
								}
							}

							result.ruleFound = true;
							result.value = rule.value;
						}
						break;
					case "switch":
						{
							if (rule.poke !== undefined) {
								if (Text.toId(rule.poke) !== Text.toId(decision.poke)) {
									break; // Rule broken
								}
							}

							if (rule.pokeId !== undefined) {
								if (rule.pokeId !== decision.pokeId) {
									break;
								}
							}

							result.ruleFound = true;
							result.value = rule.value;
						}
						break;
					case "team":
						{
							if (rule.team !== undefined) {
								let desTeam = decision.team || [0, 1, 2, 3, 4, 5];
								let ruleBroken = false;

								for (let i = 0; i < rule.team.length; i++) {
									if (desTeam[i] !== rule.team[i]) {
										ruleBroken = true;
										break;
									}
								}

								if (ruleBroken) {
									break;
								}
							}

							result.ruleFound = true;
							result.value = rule.value;
						}
						break;
					default:
						result.ruleFound = true;
						result.value = rule.value;
				}
			}

			return result;
		}

		const BattleModule = Object.create(null);
		BattleModule.id = id;

		BattleModule.fallback = config.fallback;

		BattleModule.decide = function (battle, decisions) {
			let decider;

			if (battle.request.teamPreview) {
				decider = deciders.onTeamPreview;
			} else if (battle.request.forceSwitch) {
				decider = deciders.onForceSwitch;
			} else {
				decider = deciders.onTurnDecision;
			}

			if (decider) {
				const rules = [];

				decider(battle, rules);

				battle.debug("Decision Rules: " + JSON.stringify(rules));

				let decisionChosen = false;
				let options = [];
				let decisionValue = 0;

				for (let decision of decisions) {
					const r = checkDecisionGroup(decision, rules);

					if (r.ruleFound) {
						if (!decisionChosen || decisionValue < r.value) {
							decisionChosen = true;
							decisionValue = r.value;
							options = [decision];
						} else if (decisionChosen && decisionValue === r.value) {
							options.push(decision);
						}
					}
				}

				if (options.length > 0) {
					return options[Math.floor(Math.random() * options.length)];
				} else {
					battle.debug("[Module cannot decide] Falling back to: " + BattleModule.fallback);
				}
			} else {
				battle.debug("[Module cannot decide (No Decider)] Falling back to: " + BattleModule.fallback);
			}
		};

		return BattleModule;
	};

	return Tools('add-on').forApp(App).install({
		customInstall: function () {
			App.modules.battle.system.BattleBot.addCustomModule(id, config.formats || [config.format], setupFunction);
		},

		customUninstall: function () {
			App.modules.battle.system.BattleBot.removeCustomModule(id);
		},
	});
};
