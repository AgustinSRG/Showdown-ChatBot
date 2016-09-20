/**
 * Server Handler: Development Tools
 */

'use strict';

const Path = require('path');

const ServerGet = Tools.get('ps-cross-server.js');
const Text = Tools.get('text.js');
const getEvalResult = Tools.get('eval.js');

/* Menu Options */

App.server.setMenuOption('tools', 'Tools', '/tools/', 'root', 2);

/* Handlers */

App.server.setHandler('tools', (context, parts) => {
	/* Permission Check */
	if (!context.user || !context.user.can('root')) {
		context.endWith403();
		return;
	}

	let html = '';
	let opt = '';
	if (parts[0]) {
		opt = parts.shift();
	}
	html += '<div align="center"><h2>Develoment Tools</h2>';
	html += '<a class="submenu-option' + (opt in {'': 1, 'getserver': 1} ? '-selected' : '') + '" href="/tools/getserver">Get-Server</a>';
	html += ' | ';
	html += '<a class="submenu-option' + (opt in {'botsend': 1} ? '-selected' : '') + '" href="/tools/botsend/">Bot-Send</a>';
	html += ' | ';
	html += '<a class="submenu-option' + (opt in {'seen': 1} ? '-selected' : '') + '" href="/tools/seen/">Seen</a>';
	html += ' | ';
	html += '<a class="submenu-option' + (opt in {'clearusers': 1} ? '-selected' : '') + '" href="/tools/clearusers/">Clear&nbsp;User-Data</a>';
	html += ' | ';
	html += '<a class="submenu-option' + (opt in {'hotpatch': 1} ? '-selected' : '') + '" href="/tools/hotpatch/">Hotpatch</a>';
	html += ' | ';
	html += '<a class="submenu-option' + (opt in {'ddata': 1} ? '-selected' : '') + '" href="/tools/ddata/">Reload&nbsp;Data</a>';
	html += ' | ';
	html += '<a class="submenu-option' + (opt in {'cache': 1} ? '-selected' : '') + '" href="/tools/cache/">Clear&nbsp;Cache</a>';
	html += ' | ';
	html += '<a class="submenu-option' + (opt in {'eval': 1} ? '-selected' : '') + '" href="/tools/eval/">Eval&nbsp;(JavaScript)</a>';
	html += '</div>';
	html += '<hr />';

	/* Sub-Options */
	switch (opt) {
	case '':
	case 'getserver':
		toolGetServer(context, html, parts);
		break;
	case 'botsend':
		toolBotSend(context, html, parts);
		break;
	case 'seen':
		toolSeen(context, html, parts);
		break;
	case 'clearusers':
		toolClearUsers(context, html, parts);
		break;
	case 'hotpatch':
		toolHotpatch(context, html, parts);
		break;
	case 'ddata':
		toolDownloadData(context, html, parts);
		break;
	case 'cache':
		toolClearCache(context, html, parts);
		break;
	case 'eval':
		toolEval(context, html, parts);
		break;
	default:
		context.endWith404();
	}
});


function toolGetServer(context, html, parts) {
	if (context.get.server) {
		App.logServerAction(context.user.id, "Tool Server-Get used: " + context.get.server);
		ServerGet.getShowdownServer(context.get.server, (err, data) => {
			let result = '';
			if (err) {
				result += '<p style="padding:5px;"><span class="error-msg">Could not get the server configuration.</span></p>';
			} else {
				result += '<p style="padding:5px;"><strong>Server</strong>:&nbsp;' + data.host + '</p>';
				result += '<p style="padding:5px;"><strong>Port</strong>:&nbsp;' + data.port + '</p>';
				result += '<p style="padding:5px;"><strong>Server-ID</strong>:&nbsp;' + data.id + '</p>';
			}
			context.endWithText(result);
		});
		return;
	}
	html += '<script type="text/javascript">';
	html += 'function escapeHtml(text) {return text.replace(/[\"&<>]/g,' +
		' function (a) {return { \'"\': \'&quot;\', \'&\': \'&amp;\', \'<\': \'&lt;\', \'>\': \'&gt;\' }[a];});}';
	html += 'var req = null;';
	html += 'function updateServer() {var server = document.getElementById("clienturl").value; if (!server) {return;}' +
		' if (req) {try {req.abort()} catch (err) {}' +
		'req = null;}document.getElementById("resultdiv").innerHTML = "<p><i>Getting server configuration for " + escapeHtml(server)' +
		'+ "...</i></p>";req = $.get("/tools/getserver/?server=" + encodeURI(server), ' +
		'function (data) {document.getElementById("resultdiv").innerHTML = data;}).fail(function () {' +
		'document.getElementById("resultdiv").innerHTML = \'<p><span class="error-msg">Request error. ' +
		'Try again later or refresh the page.</span></p>\';});}';
	html += '</script>';
	html += '<h2>Get-Server Tool</h2><label><strong>Insert the client url</strong>: ' +
		'<input id="clienturl" name="url" type="text" size="60" placeholder="example.psim.us" value="' + (context.post.url || '') +
		'" /></label>&nbsp;&nbsp;<button id="getserver" onclick="updateServer();">Get Server</button>';
	html += '<div id="resultdiv">&nbsp;</div>';
	html += '<script type="text/javascript"> var obj = document.getElementById("clienturl");' +
			' obj.addEventListener("keydown", function (e) {if (e.keyCode == 13) {updateServer();}});</script>';
	context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot", scripts: ['/static/jquery-3.0.0.min.js']});
}

function toolBotSend(context, html, parts) {
	if (context.post.snd) {
		/* Bot-Send action */
		let result = '';
		if (context.post.msg) {
			if (App.bot.isConnected()) {
				App.bot.sendTo(context.post.room || "", context.post.msg.split('\n'));
				App.logServerAction(context.user.id, "Tool Bot-Send used. Room: " + (context.post.room || '-') + " | Message: " + context.post.msg);
				result += '<p style="padding:5px;"><span class="ok-msg">Message sucessfully sent.</span></p>';
			} else {
				result += '<p style="padding:5px;"><span class="error-msg">Error: The bot is not connected.</span></p>';
			}
		} else {
			result += '<p style="padding:5px;"><span class="error-msg">Cannot send a blank message.</span></p>';
		}
		return context.endWithText(result);
	}
	html += '<script type="text/javascript">';
	html += 'function escapeHtml(text) {return text.replace(/[\"&<>]/g,' +
		' function (a) {return { \'"\': \'&quot;\', \'&\': \'&amp;\', \'<\': \'&lt;\', \'>\': \'&gt;\' }[a];});}';
	html += 'var req = null;';
	html += 'function sendMessage () {var room = document.getElementById("room").value;var msg = document.getElementById("message").value;' +
		'if (!msg) {return;}if (req) {try {req.abort()} catch (err) {} req = null;}' +
		'document.getElementById("result").innerHTML = \'<p><i>Sending Message...</i></p>\';document.getElementById("message").value = "";' +
		'req = $.post(\'/tools/botsend/\', {room: room, msg: msg, snd: "true"}, ' +
		'function (data) {document.getElementById("result").innerHTML = data;}).fail(' +
		'function () {document.getElementById("result").innerHTML = \'<p><span class="error-msg">Request error. ' +
		'Try again later or refresh the page.</span></p>\';});}';
	html += '</script>';
	html += '<h2>Bot-Send Tool</h2><strong>Room</strong>:&nbsp;' +
		'<input id="room" type="text" name="room" /><p><strong>Message</strong>:</p>' +
		'<p><textarea id="message" name="msg" cols="100" rows="4"></textarea></p>' +
		'<p><label><button onclick="sendMessage();">Send Message</button></p>';
	html += '<div id="result">&nbsp;</div>';
	context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot", scripts: ['/static/jquery-3.0.0.min.js']});
}

function toolSeen(context, html, parts) {
	let user = Text.toId(context.get.user);
	if (user) {
		if (user.length > 19) {
			context.endWithText("Error: Invalid Username");
		} else if (user === Text.toId(App.bot.getBotNick())) {
			context.endWithText("Bot nickname: " + App.bot.getBotNick() + " | No seen information");
		} else if (App.bot.users[user]) {
			let name = App.bot.users[user].name;
			let seen = App.bot.users[user].lastSeen;
			let time = Math.round((Date.now() - seen.time) / 1000);
			let times = [];
			let aux;
			/* Get Time difference */
			aux = time % 60; // Seconds
			if (aux > 0 || time === 0) times.unshift(aux + ' ' + (aux === 1 ? "second" : "seconds"));
			time = Math.floor(time / 60);
			aux = time % 60; // Minutes
			if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? "minute" : "minutes"));
			time = Math.floor(time / 60);
			aux = time % 24; // Hours
			if (aux > 0) times.unshift(aux + ' ' + (aux === 1 ? "hour" : "hours"));
			time = Math.floor(time / 24); // Days
			if (time > 0) times.unshift(time + ' ' + (time === 1 ? "day" : "days"));
			/* Reply */
			let reply = "User" + ' ' + name.trim() + ' ' +
				"was last seen" + ' ' + times.join(', ') + ' ' + "ago ";
			switch (seen.type) {
			case 'J':
				reply += 'joining' + ' ';
				break;
			case 'L':
				reply += 'leaving' + ' ';
				break;
			case 'C':
				reply += 'chatting in' + ' ';
				break;
			case 'R':
				reply += 'changing nick to' + ' ' + seen.detail;
				break;
			}
			if (seen.type in {'J': 1, 'L': 1, 'C': 1}) {
				reply += tryGetRoomTitle(seen.room);
			}
			if (App.bot.users[user].alts.length > 0) {
				reply += '\n';
				reply += 'Alts: ' + App.bot.users[user].alts.join(', ');
			}
			context.endWithText(reply);
		} else {
			context.endWithText("User \"" + user + "\" has never been seen, at least since the last restart");
		}
	} else {
		html += '<script type="text/javascript">';
		html += 'function escapeHtml(text) {return text.replace(/[\"&<>]/g,' +
			' function (a) {return { \'"\': \'&quot;\', \'&\': \'&amp;\', \'<\': \'&lt;\', \'>\': \'&gt;\' }[a];});}';
		html += 'var req = null; function updateSeen () {if (req) {try {req.abort()} catch (err) {} req = null;}' +
			' var user = document.getElementById("userseen").value; if (!user) {return;}' +
			' document.getElementById("seenresult").innerHTML = "<p><i>Getting seen data for " + escapeHtml(user) + "...</i></p>";' +
			' req = $.get(\'/tools/seen/?user=\' + encodeURI(user) + \'&time=\' + Date.now(), ' +
			'function (data) {var res = document.getElementById("seenresult");' +
			'res.innerHTML = \'<p><strong>\' + escapeHtml(data).replace(/\\n/g, "<br />") + \'</strong></p>\';}).fail(' +
			'function () {document.getElementById("seenresult").innerHTML = \'<p><span class="error-msg">' +
			'Error: Could not get seen data</span></p>\';});}';
		html += '</script>';
		html += '<h2>Seen Tool</h2>';
		html += '<p><input id="userseen" name="userseen" type="text" size="30" maxlength="19" placeholder="Username" />&nbsp;&nbsp;';
		html += '<button id="getseen" onclick="updateSeen();">Get Last Seen</button></p>';
		html += '<div id="seenresult">&nbsp;</div>';
		html += '<script type="text/javascript"> var obj = document.getElementById("userseen");' +
			' obj.addEventListener("keydown", function (e) {if (e.keyCode == 13) {updateSeen();}});</script>';
		context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot", scripts: ['/static/jquery-3.0.0.min.js']});
	}
}

function toolEval(context, html, parts) {
	if (!App.config.debug) {
		html += '<p><span class="error-msg">This tool only works in Debug Mode.</span></p>';
		context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot"});
		return;
	}
	if (global.ShellOptions && global.ShellOptions.staticmode) {
		html += '<p><span class="error-msg">Error: Static mode does not allow eval.</span></p>';
		context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot"});
		return;
	}
	if (context.post.scriptdata) {
		App.logServerAction(context.user.id, "Tool Eval used: " + context.post.scriptdata);
		context.endWithText(getEvalResult(context.post.scriptdata));
		return;
	}
	html += '<script type="text/javascript">';
	html += 'function escapeHtml(text) {return text.replace(/[\"&<>]/g,' +
		' function (a) {return { \'"\': \'&quot;\', \'&\': \'&amp;\', \'<\': \'&lt;\', \'>\': \'&gt;\' }[a];});}';
	html += 'var req = null;';
	html += 'function updateEvalResult () {var scriptdata = document.getElementById("scriptdata").value;if (!scriptdata) {return;}' +
		'if (req) {try {req.abort()} catch (err) {} req = null;}document.getElementById("evalresult").innerHTML = \'<p><i>' +
		'Getting eval result...</i></p>\';req = $.post(\'/tools/eval/\', {scriptdata: scriptdata}, function (data) ' +
		'{document.getElementById("evalresult").innerHTML = \'<p>\' + escapeHtml(data) + \'</p>\';}).fail(function () ' +
		'{document.getElementById("evalresult").innerHTML = \'<p><span class="error-msg">Request error. ' +
		'Try again later or refresh the page.</span></p>\';});}';
	html += '</script>';
	html += '<h2>Eval Tool</h2>';
	html += '<p><strong>Warning: </strong>This tool is extremely dangerous and can cause several damage to your bot if used wrong. ' +
		'Use it only if you know what are you doing.</p>';
	html += '<p><input id="scriptdata" name="scriptdata" type="text" size="70" />&nbsp;&nbsp;' +
		'<button onclick="updateEvalResult();">Eval</button></p>';
	html += '<div id="evalresult">&nbsp;</div>';
	html += '<script type="text/javascript"> var obj = document.getElementById("scriptdata");' +
			' obj.addEventListener("keydown", function (e) {if (e.keyCode == 13) {updateEvalResult();}});</script>';
	context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot", scripts: ['/static/jquery-3.0.0.min.js']});
}

function toolHotpatch(context, html, parts) {
	let ok = null, error = null;
	if (context.post.hotpatch) {
		try {
			App.hotpatchCommands(Path.resolve(__dirname, '../../bot-modules/'));
			App.logServerAction(context.user.id, 'Hotpatch Commands.');
			ok = "Commands hotpatched";
		} catch (err) {
			error = "Error: " + err.code + " - " + err.message;
		}
	}

	html += '<h2>Hotpatch Commands</h2>';
	html += '<p>This is a develoment tool used to reaload the commands without restart the application. ' +
		'Note: If you are not a developer, just restart the application intead of using this tool.</p>';
	html += '<form method="post" action="">';
	html += '<p><label><input type="submit" name="hotpatch" value="Hotpatch Commands" /></label></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot"});
}

function toolDownloadData(context, html, parts) {
	let ok = null, error = null;
	if (context.post.reloaddata) {
		App.data.downloadAll();
		App.logServerAction(context.user.id, 'Reload Data.');
		ok = "Downloading data. It will be realoaded in a few seconds. For more information watch security log";
	}

	html += '<h2>Reload Data</h2>';
	html += '<p>Data is reloaded every time the bot connects to the server, but you can manually reaload it with this option.</p>';
	html += '<form method="post" action="">';
	html += '<p><label><input type="submit" name="reloaddata" value="Reload Data" /></label></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot"});
}

function toolClearCache(context, html, parts) {
	let ok = null, error = null;
	if (context.post.clearcache) {
		let cache = App.data.cache;
		for (let url in cache.data) {
			cache.uncache(url);
		}
		cache.write();
		App.logServerAction(context.user.id, 'Clear Web Cache');
		ok = "Web Cache cleared sucessfully.";
	}

	html += '<h2>Clear Web Cache</h2>';
	html += '<p>Some features use a web cache system to reduce network consumption. ' +
		'Use this option if you want to remove the data from the web cache.</p>';
	html += '<form method="post" action="">';
	html += '<p><input type="submit" name="clearcache" value="Clear Web Cache" /></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot"});
}

function toolClearUsers(context, html, parts) {
	let ok = null, error = null;
	if (context.post.clearusers) {
		App.bot.clearUserData();
		App.logServerAction(context.user.id, 'Clear User-Data');
		ok = "User-Data cleared sucessfully.";
	}

	html += '<h2>Clear User-Data</h2>';
	html += '<p>Clears temporal data stored about pokemon showdown users. ' +
		'This includes name, last seen date, last action and alts.</p>';
	html += '<form method="post" action="">';
	html += '<p><input type="submit" name="clearusers" value="Clear User-Data" /></p>';
	html += '</form>';

	if (error) {
		html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
	} else if (ok) {
		html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
	}

	context.endWithWebPage(html, {title: "Develoment Tools - Showdown ChatBot"});
}

/* Auxiliar Functions */

function tryGetRoomTitle(room) {
	if (App.bot.rooms[room]) {
		return App.bot.rooms[room].title || room;
	} else {
		return room;
	}
}
