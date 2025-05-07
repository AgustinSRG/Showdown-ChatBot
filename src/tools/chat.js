/**
 * Chat Formats Converters
 */

'use strict';

const Crypto = require("crypto");
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

function HSLToRGB(H, S, L) {
	let C = (100 - Math.abs(2 * L - 100)) * S / 100 / 100;
	let X = C * (1 - Math.abs((H / 60) % 2 - 1));
	let m = L / 100 - C / 2;

	let R1;
	let G1;
	let B1;
	switch (Math.floor(H / 60)) {
		case 1:
			R1 = X;
			G1 = C;
			B1 = 0;
			break;
		case 2:
			R1 = 0;
			G1 = C;
			B1 = X;
			break;
		case 3:
			R1 = 0;
			G1 = X;
			B1 = C;
			break;
		case 4:
			R1 = X;
			G1 = 0;
			B1 = C;
			break;
		case 5:
			R1 = C;
			G1 = 0;
			B1 = X;
			break;
		default:
			R1 = C;
			G1 = X;
			B1 = 0;
			break;
	}
	let R = R1 + m;
	let G = G1 + m;
	let B = B1 + m;
	return { R: R, G: G, B: B };
}

function hexByte(x) {
	const hex = Math.round(x * 255).toString(16);
	return hex.length === 1 ? '0' + hex : hex;
}

/**
 * Calculates the color of an username
 * @param {string} name The username
 */
exports.usernameColor = function (name) {
	name = Text.toId(name);

	const hash = Crypto.createHash("md5").update(Buffer.from(name, 'utf-8')).digest().toString("hex");

	let H = parseInt(hash.substring(4, 8), 16) % 360;
	let S = parseInt(hash.substring(0, 4), 16) % 50 + 40;
	let L = Math.floor(parseInt(hash.substring(8, 12), 16) % 20 + 30);

	let rgb = HSLToRGB(H, S, L);
	let R = rgb.R;
	let G = rgb.G;
	let B = rgb.B;

	let lum = R * R * R * 0.2126 + G * G * G * 0.7152 + B * B * B * 0.0722;

	let HLmod = (lum - 0.2) * -150;

	if (HLmod > 18) {
		HLmod = (HLmod - 18) * 2.5;
	} else if (HLmod < 0) {
		HLmod /= 3;
	} else {
		HLmod = 0;
	}

	let Hdist = Math.min(Math.abs(180 - H), Math.abs(240 - H));
	if (Hdist < 15) {
		HLmod += (15 - Hdist) / 3;
	}

	L += HLmod;

	let rgbFinal = HSLToRGB(H, S, L);

	return "#" + hexByte(rgbFinal.R) + hexByte(rgbFinal.G) + hexByte(rgbFinal.B);
};
