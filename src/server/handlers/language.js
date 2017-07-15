/**
 * Server Handler: Bot Language
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const Template = Tools('html-template');
const SubMenu = Tools('submenu');
const TranslationFile = Tools('translate');

const mainTemplate = new Template(Path.resolve(__dirname, 'templates', 'language.html'));
const customTemplate = new Template(Path.resolve(__dirname, 'templates', 'customlangs.html'));
const customExportTemplate = new Template(Path.resolve(__dirname, 'templates', 'lang-export.html'));

exports.setup = function (App) {
	/* Menu Options */
	App.server.setMenuOption('lang', 'Languages', '/lang/', 'bot', 1);

	/* Handlers */
	App.server.setHandler('lang', (context, parts) => {
		if (!context.user || !context.user.can('bot')) {
			context.endWith403();
			return;
		}

		let submenu = new SubMenu("Bot&nbsp;Languages", parts, context, [
			{id: 'config', title: 'Bot&nbsp;Language&nbsp;Configuration', url: '/lang/', handler: configHandler},
			{id: 'custom', title: 'Customize&nbsp;Language&nbsp;Files', url: '/lang/custom/', handler: customHandler},
			{id: 'export', title: 'Export&nbsp;/&nbsp;Import&nbsp;Custom&nbsp;Languages', url: '/lang/export/', handler: customExportHandler},
		], 'config');

		return submenu.run();
	});

	function configHandler(context, html, parts) {
		let error = null, ok = null;
		let languages = App.multilang.getLanguages();
		if (context.post.setfilter) {
			for (let lang in languages) {
				App.config.langfilter[lang] = !!context.post['lang-' + lang];
			}
			App.db.write();
			App.logServerAction(context.user.id, "Change language configuration");
			ok = "Changed language configuration.";
		} else if (context.post.setdefault) {
			let lang = Text.toId(context.post.language);
			try {
				check(lang && languages[lang] && App.multilang.isLangEnabled(lang), "Invalid Language.");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				App.config.language['default'] = lang;
				App.db.write();
				App.logServerAction(context.user.id, "Set Default language");
				ok = "Default language set to <strong>" + languages[lang] + "</strong>";
			}
		} else if (context.post.addroom) {
			let lang = Text.toId(context.post.language);
			let room = Text.toRoomid(context.post.room);
			try {
				check(lang && languages[lang] && App.multilang.isLangEnabled(lang), "Invalid Language.");
				check(room, "You must specify a room.");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				App.config.language.rooms[room] = lang;
				App.db.write();
				App.logServerAction(context.user.id, "Set Room language. Room: " + room + ", Lang: " + lang);
				ok = "Language for room " + room + " set to <strong>" + languages[lang] + "</strong>";
			}
		} else if (context.post.deleteroom) {
			let room = Text.toRoomid(context.post.room);
			try {
				check(room, "You must specify a room.");
				check(App.config.language.rooms[room], "Invalid room.");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				delete App.config.language.rooms[room];
				App.db.write();
				App.logServerAction(context.user.id, "Set Room language to default. Room: " + room);
				ok = "Language for room " + room + " set to default";
			}
		} else if (context.post.addcustomlang) {
			let customlang = Text.toId(context.post.lang);
			try {
				check(customlang, "You must specify a language.");
				check(!languages[customlang], "The language you specified already exists.");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				App.multilang.data.langdefs[customlang] = Text.trim(context.post.lang);
				App.multilang.saveData();
				App.logServerAction(context.user.id, "Add Custom Language: " + customlang);
				ok = "Added custom language: " + Text.escapeHTML(context.post.lang);
				languages = App.multilang.getLanguages();
			}
		} else if (context.post.removecustomlang) {
			let customlang = Text.toId(context.post.lang);
			try {
				check(customlang, "You must specify a language.");
				check(App.multilang.data.langdefs[customlang], "Invalid language.");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				delete App.multilang.data.langdefs[customlang];
				delete App.multilang.data.langdata[customlang];
				App.multilang.saveData();
				App.logServerAction(context.user.id, "Removed Custom Language: " + customlang);
				ok = "Removed custom language: " + Text.escapeHTML(context.post.lang);
				languages = App.multilang.getLanguages();
			}
		}

		let htmlVars = {};

		htmlVars.langchecks = '';
		for (let lang in languages) {
			htmlVars.langchecks += '<p><input type="checkbox" name="lang-' + lang + '" value="true" ' +
				(App.config.langfilter[lang] === false ? '' : 'checked="checked"') + ' />&nbsp;' +
				Text.escapeHTML(languages[lang]) + '</p>';
		}

		htmlVars.langdefs = '';
		for (let lang in App.multilang.data.langdefs) {
			let rmbutton = '<button onclick="showRemoveConfirm(\'' + lang +
					'\');">Remove</button><span id="confirm-remove-' + lang + '">&nbsp;</span>';
			htmlVars.langdefs += '<tr><td>' + Text.escapeHTML(languages[lang]) + '</td><td>' + rmbutton + '</td></tr>';
		}

		htmlVars.list_a = getLanguageComboBox(App.config.language['default']);
		htmlVars.list_b = getLanguageComboBox();

		htmlVars.rooms = '';
		for (let room in App.config.language.rooms) {
			htmlVars.rooms += '<tr><td>' + room + '</td><td>' + App.config.language.rooms[room] +
			'</td><td><div align="center"><form method="post" action="" style="display:inline;"><input type="hidden" name="room" value="' +
			room + '" /><label><input type="submit" name="deleteroom" value="Use Default" /></label></form></div></td></tr>';
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(html + mainTemplate.make(htmlVars), {title: "Bot language configuration - Showdown ChatBot"});
	}

	function customHandler(context, html, parts) {
		let htmlVars = {};
		let languages = App.multilang.getLanguages();
		let langfiles = App.multilang.langfiles;
		let ok = null, error = null;
		let selectedLang = Text.toId(context.get.lang);
		let selectedFile = Text.toRoomid(context.get.tfile);
		let langdata = App.multilang.data.langdata;

		if (context.post.edit) {
			try {
				check(selectedLang && languages[selectedLang], "Invalid Language.");
				check(selectedFile && langfiles[selectedFile], "Invalid File.");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				let dataFile = new TranslationFile(langfiles[selectedFile]);
				if (!langdata[selectedLang]) langdata[selectedLang] = {};
				langdata[selectedLang][selectedFile] = {};
				let listKeys = dataFile.getKeys();
				for (let key of listKeys) {
					if (context.post['custom-' + key]) {
						langdata[selectedLang][selectedFile][key] = Text.trim(context.post['custom-' + key]);
					}
				}
				App.multilang.saveData();
				App.logServerAction(context.user.id, "Edit Custom Language: " + selectedLang + ", File: " + selectedFile);
				ok = "Translations file was saved.";
			}
		} else if (context.post.remove) {
			try {
				check(selectedLang && languages[selectedLang], "Invalid Language.");
				check(selectedFile && langfiles[selectedFile], "Invalid File.");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				if (!langdata[selectedLang]) langdata[selectedLang] = {};
				langdata[selectedLang][selectedFile] = {};
				App.multilang.saveData();
				App.logServerAction(context.user.id, "Edit Custom Language: " + selectedLang + ", File: " + selectedFile + ", (Set To default)");
				ok = "Translations file was set to default.";
			}
		}

		let opts = [];
		let files = Object.keys(langfiles).sort();
		for (let tfile of files) {
			opts.push('<a class="submenu-option' + (tfile === selectedFile ? '-selected' : '') +
				'" href="/lang/custom/?tfile=' + tfile + '&lang=english">' + Text.escapeHTML(tfile) + '</a>');
		}
		htmlVars.files_menu = opts.join('&nbsp;| ');

		let content = '';

		if (selectedFile in langfiles) {
			opts = [];
			for (let l in languages) {
				opts.push('<a class="submenu-option' + (l === selectedLang ? '-selected' : '') +
					'" href="/lang/custom/?tfile=' + selectedFile + '&lang=' + l + '">' + Text.escapeHTML(languages[l]) + '</a>');
			}
			content += "<big><b><u>Current Language:</u></b></big> " + opts.join('&nbsp;| ') + "<hr />";

			content += '<form method="post" action="">';
			if (selectedLang in languages) {
				let dataFile = new TranslationFile(langfiles[selectedFile]);
				if (!langdata[selectedLang]) langdata[selectedLang] = {};
				if (!langdata[selectedLang][selectedFile]) langdata[selectedLang][selectedFile] = {};
				let dataFileMod = langdata[selectedLang][selectedFile];
				let listKeys = dataFile.getKeys();
				for (let key of listKeys) {
					content += '<br /><table border="1">';
					content += '<tr><td width="200px"><b>Key ID</b></td><td width="500px"><b>' + key + '</b></td></tr>';
					content += '<tr><td>Default (English)</td><td>' + Text.escapeHTML(dataFile.get(key, "english")) + '</td></tr>';
					content += '<tr><td>Custom (' + Text.escapeHTML(languages[selectedLang]) + ')</td><td>' +
						'<input type="text" name="custom-' + key + '" value=' + JSON.stringify(dataFileMod[key] || "") +
						' placeholder=' + JSON.stringify(dataFile.get(key, selectedLang) || "") + ' size="100" />' + '</td></tr>';
					content += '</table>';
				}
			}
			content += '<p><input type="submit" name="edit" value="Save Changes" /></p>';
			content += '</form>';
			content += '<p><button onclick="showRemoveConfirm();">Set Default Values</button><span id="confirm-remove">&nbsp;</span></p>';
		}

		htmlVars.content = content;
		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(html + customTemplate.make(htmlVars), {title: "Bot language customize - Showdown ChatBot"});
	}

	function customExportHandler(context, html, parts) {
		let htmlVars = {};
		let languages = App.multilang.getLanguages();
		let langdata = App.multilang.data.langdata;
		let ok = null, error = null;
		let selectedLang = Text.toId(context.get.lang) || "english";

		if (context.post.edit) {
			try {
				check(selectedLang && languages[selectedLang], "Invalid Language.");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				langdata[selectedLang] = importLanguage(context.post.content || "");
				App.multilang.saveData();
				App.logServerAction(context.user.id, "Edit Custom Language: " + selectedLang + " (Import)");
				ok = "Language customization loaded for: " + selectedLang;
			}
		}

		let opts = [];
		for (let l in languages) {
			opts.push('<a class="submenu-option' + (l === selectedLang ? '-selected' : '') +
				'" href="/lang/export/?lang=' + l + '">' + Text.escapeHTML(languages[l]) + '</a>');
		}
		htmlVars.menu = "<big><b><u>Current Language:</u></b></big> " + opts.join('&nbsp;| ') + "<hr />";

		if (selectedLang in languages) {
			htmlVars.content = JSON.stringify(exportLanguage(langdata, selectedLang));
		}

		htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
		htmlVars.request_msg = (ok ? ok : (error || ""));

		context.endWithWebPage(html + customExportTemplate.make(htmlVars), {title: "Bot language customize - Showdown ChatBot"});
	}

	/* Auxiliar Functions */
	function getLanguageComboBox(selected) {
		let html = '';
		let languages = App.multilang.getLanguages();
		html += '<select name="language">';
		for (let lang in languages) {
			if (!App.multilang.isLangEnabled(lang)) continue;
			html += '<option value="' + lang + '" ' + (lang === selected ? 'selected="selected"' : '') + '>' + languages[lang] + '</option>';
		}
		html += '</select>';
		return html;
	}

	function exportLanguage(langdata, lang) {
		let lines = [];
		lines.push('# Exportable language customization');
		lines.push('# Showdown-Chatbot v' + App.env.package.version);
		lines.push('# Language: ' + lang);
		lines.push('');

		if (langdata[lang]) {
			for (let file in langdata[lang]) {
				if (Object.keys(langdata[lang][file]).length === 0) continue;
				lines.push("# File: " + file);
				lines.push("@" + file);

				for (let key in langdata[lang][file]) {
					lines.push("$" + key + " = " + langdata[lang][file][key]);
				}

				lines.push('');
			}
		}

		return lines.join("\n");
	}

	function importLanguage(str) {
		let lines = str.split("\n");
		let data = {};

		let currFile = null;
		let aux, id;

		for (let line of lines) {
			switch (line.charAt(0)) {
			case '@':
				currFile = Text.toRoomid(line.substr(1));
				if (!data[currFile]) data[currFile] = {};
				break;
			case '$':
				if (!currFile) continue;
				aux = line.substr(1).split('=');
				id = Text.toId(aux.shift());
				if (!id) continue;
				data[currFile][id] = aux.join('=').trim();
				break;
			}
		}

		return data;
	}
};
