// Exceptions for .hpoke command
// Install as an add-on for Showdown-ChatBot
// Will add a control panel section named 'HashPoke'

'use strict';

const Text = Tools('text');

exports.setup = function (App) {
	return Tools('add-on').forApp(App).install({
		serverMenuOptions: {
			"customhpoke": {name : "HashPoke", url: "/customhpoke/", permission: "pokemon", level: -2},
		},
		serverHandlers: {
			"customhpoke": function (context, parts) {
				if (!context.user || !context.user.can('pokemon')) {
					context.endWith403();
					return;
				}

				if (!App.config.addons) App.config.addons = {};
				if (!App.config.addons.hpoke) App.config.addons.hpoke = {};

				let config = App.config.addons.hpoke;
				let ok = null;

				if (context.post.save) {
					for (let id in config) {
						delete config[id];
					}
					let newData = (context.post.data || "").split('\n');
					for (let line of newData) {
						let spl = line.split(',');
						if (spl.length !== 2) continue;
						let id = Text.toId(spl[0]);
						let poke = Text.trim(spl.slice(1).join(","));
						config[id] = poke;
					}
					App.saveConfig();
					App.logServerAction(context.user.id, "Changed hpoke exceptions.");
					ok = "Hashpoke exceptions saved successfully.";
				}

				let exceptions = [];
				for (let id in config) {
					exceptions.push(id + ", " + config[id]);
				}

				let html = '';
				html += '<h2>Exceptions for hpoke command</h2>';
				html += '<p>Format: <b>Name, Custom Pokemon</b></p>';
				html += '<form method="post" action="">';
				html += '<textarea name="data" style="width: 100%; max-width: 100ch;" rows="30">';
				html += exceptions.join('\n');
				html += '</textarea>';
				html += '<p><input type="submit" name="save" value="Save Changes" /></p>';
				html += '</form>';
				html += '<p>';
				if (ok) {
					html += '<span class="ok-msg">' + ok + '</span>';
				}
				html += '</p>';

				context.endWithWebPage(html, {title: "Exceptions for hpoke command - Showdown ChatBot"});
			},
		},
	});
};