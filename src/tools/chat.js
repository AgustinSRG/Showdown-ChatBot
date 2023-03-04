/**
 * Chat Formats Converters
 */

'use strict';

const Text = Tools('text');

/**
 * @param {String} text
 * @returns {String} Text in Bold
 */
exports.bold = function (text) {
	text = Text.trim("" + text);
	return '**' + text + '**';
};

/**
 * @param {String} text
 * @returns {String} Text in Italics
 */
exports.italics = function (text) {
	text = Text.trim("" + text);
	return '__' + text + '__';
};

/**
 * @param {String} text
 * @returns {String} Text in strikethrough format
 */
exports.strikethrough = function (text) {
	text = Text.trim("" + text);
	return '~~' + text + '~~';
};

/**
 * @param {String} text
 * @returns {String} Text in code format
 */
exports.code = function (text) {
	text = Text.trim("" + text);
	return '``' + text + '``';
};

/**
 * @param {String} text
 * @returns {String} Text in superscript format
 */
exports.superscript = function (text) {
	text = Text.trim("" + text);
	return '^^' + text + '^^';
};

/**
 * @param {String} text
 * @returns {String} Link to a room
 */
exports.room = function (text) {
	return '<<' + Text.toRoomid("" + text) + '>>';
};

/**
 * @param {String} text
 * @returns {String} External link format
 */
exports.link = function (text) {
	text = Text.trim("" + text);
	return '[[' + text + ']]';
};

function unescapeHTML(str) {
	str = (str ? '' + str : '');
	return str.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
}

/**
 * @param {String} str
 * @param {Boolean} isShowdown
 * @returns {String} HTML format
 */
exports.parseMessage = function (str, isShowdown) {
	let domainRegex = '[a-z0-9\\-]+(?:[.][a-z0-9\\-]+)*';
	let parenthesisRegex = '[(](?:[^\\s()<>&]|&amp;)*[)]';
	let linkRegex = new RegExp(
		'\\b' +
		'(?:' +
		'(?:' +
		// When using www. or http://, allow any-length TLD (like .museum)
		'(?:https?://|www[.])' + domainRegex +
		'|' + domainRegex + '[.]' +
		// Allow a common TLD, or any 2-3 letter TLD followed by : or /
		'(?:com?|org|net|edu|info|us|jp|[a-z]{2,3}(?=[:/]))' +
		')' +
		'(?:[:][0-9]+)?' +
		'\\b' +
		'(?:' +
		'/' +
		'(?:' +
		'(?:' +
		'[^\\s()&]|&amp;|&quot;' +
		'|' + parenthesisRegex +
		')*' +
		// URLs usually don't end with punctuation, so don't allow
		// punctuation symbols that probably aren't related to URL.
		'(?:' +
		'[^\\s`()\\[\\]{}\'".,!?;:&]' +
		'|' + parenthesisRegex +
		')' +
		')?' +
		')?' +
		'|[a-z0-9.]+\\b@' + domainRegex + '[.][a-z]{2,3}' +
		')',
		'ig'
	);
	// ``code``
	str = str.replace(/\`\`([^< ](?:[^<`]*?[^< ])??)\`\`/g, '<code>$1</code>');
	// ~~strikethrough~~
	str = str.replace(/\~\~([^< ](?:[^<]*?[^< ])??)\~\~/g, '<s>$1</s>');
	// <<roomid>>
	if (isShowdown) {
		str = str.replace(/&lt;&lt;([a-z0-9-]+)&gt;&gt;/g, '&laquo;<a href="/$1">$1</a>&raquo;');
	} else {
		str = str.replace(/&lt;&lt;([a-z0-9-]+)&gt;&gt;/g, '&laquo;<font color="blue">$1</font>&raquo;');
	}

	// linking of URIs
	str = str.replace(linkRegex, function (uri) {
		if (/^[a-z0-9.]+\@/ig.test(uri)) {
			return '<a href="mailto:' + uri + '" target="_blank">' + uri + '</a>';
		}
		// Insert http:// before URIs without a URI scheme specified.
		let fulluri = uri.replace(/^([a-z]*[^a-z:])/g, 'http://$1');
		return '<a href="' + fulluri + '" target="_blank" rel="noopener noreferrer">' + uri + '</a>';
	});
	// google [blah]
	//   Google search for 'blah'
	str = str.replace(/\bgoogle ?\[([^\]<]+)\]/ig, function (p0, p1) {
		p1 = Text.escapeHTML(encodeURIComponent(unescapeHTML(p1)));
		return '<a href="http://www.google.com/search?ie=UTF-8&q=' + p1 +
			'" target="_blank" rel="noopener noreferrer">' + p0 + '</a>';
	});
	// wiki [blah]
	//   Search Wikipedia for 'blah' (and visit the article for 'blah' if it exists)
	str = str.replace(/\bwiki ?\[([^\]<]+)\]/ig, function (p0, p1) {
		p1 = Text.escapeHTML(encodeURIComponent(unescapeHTML(p1)));
		return '<a href="http://en.wikipedia.org/w/index.php?title=Special:Search&search=' +
			p1 + '" target="_blank" rel="noopener noreferrer">' + p0 + '</a>';
	});
	// server issue #pullreq
	//   Links to github Pokemon Showdown server pullreq number
	str = str.replace(/\bserver issue ?#(\d+)/ig, function (p0, p1) {
		p1 = Text.escapeHTML(encodeURIComponent(unescapeHTML(p1)));
		return '<a href="https://github.com/Zarel/Pokemon-Showdown/pull/' +
			p1 + '" target="_blank" rel="noopener noreferrer">' + p0 + '</a>';
	});
	// client issue #pullreq
	//   Links to github Pokemon Showdown client pullreq number
	str = str.replace(/\bclient issue ?#(\d+)/ig, function (p0, p1) {
		p1 = Text.escapeHTML(encodeURIComponent(unescapeHTML(p1)));
		return '<a href="https://github.com/Zarel/Pokemon-Showdown-Client/pull/' +
			p1 + '" target="_blank" rel="noopener noreferrer">' + p0 + '</a>';
	});
	// [[blah]]
	//   Short form of gl[blah]
	str = str.replace(/\[\[([^< ](?:[^<`]*?[^< ])??)\]\]/ig, function (p0, p1) {
		let q = Text.escapeHTML(encodeURIComponent(unescapeHTML(p1)));
		return '<a href="http://www.google.com/search?ie=UTF-8&btnI&q=' + q +
			'" target="_blank" rel="noopener noreferrer">' + p1 + '</a>';
	});
	// __italics__
	str = str.replace(/\_\_([^< ](?:[^<]*?[^< ])??)\_\_(?![^<]*?<\/a)/g, '<i>$1</i>');
	// **bold**
	str = str.replace(/\*\*([^< ](?:[^<]*?[^< ])??)\*\*/g, '<b>$1</b>');
	// Line breaks
	str = str.replace(/\|\|/g, '<br />');
	return str;
};
