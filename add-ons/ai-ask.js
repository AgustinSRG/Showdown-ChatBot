// AI Ask Add-on for Showdown ChatBot
// Install as an Add-On
// ------------------------------------
// Make sure to change the following constants:
// - AI_API_KEY: Your Gemini API key (get from https://aistudio.google.com/app/apikey)
// - DEFAULT_ALLOWED_GROUP: Group allowed to use the command by default. Can be a symbol or a group name.

'use strict';

const AI_API_KEY = '';
const DEFAULT_ALLOWED_GROUP = 'admin';

const MAX_MESSAGE_LENGTH = 1000;
const CHAT_HISTORY_LINES = 15;
const USER_MEMORY_LIMIT = 5;
const MEMORY_EXPIRY_HOURS = 24;

const AI_CONFIG = {
	gemini: {
		host: 'generativelanguage.googleapis.com',
		pathTemplate: '/v1beta/models/gemini-3.0-flash:generateContent?key=',
	},
};

const Https = require('https');
const Text = Tools('text');

const chatHistory = Object.create(null);

const userMemory = Object.create(null);

function httpsPost(options, data, callback) {
	const postData = JSON.stringify(data);
	options.method = 'POST';
	options.headers = options.headers || {};
	options.headers['Content-Type'] = 'application/json';
	options.headers['Content-Length'] = Buffer.byteLength(postData);

	const req = Https.request(options, res => {
		let responseData = '';
		res.on('data', chunk => {
			responseData += chunk;
		});
		res.on('end', () => {
			try {
				const parsed = JSON.parse(responseData);
				return callback(parsed, null);
			} catch (e) {
				return callback(null, new Error('Failed to parse response: ' + e.message));
			}
		});
	});

	req.on('error', err => {
		return callback(null, err);
	});

	req.write(postData);
	req.end();
}

function askGemini(question, context, callback) {
	const config = AI_CONFIG.gemini;
	const options = {
		hostname: config.host,
		path: config.pathTemplate + AI_API_KEY,
		headers: {},
	};

	let promptText = 'You\'re a friendly, laid-back AI hanging out in a Pokemon Showdown chat room. Talk like a real person would — casual, warm, and genuine. Use contractions, keep things conversational, and don\'t be stiff or formal. If something\'s funny, be funny. If someone\'s struggling, be real and empathetic with them. You\'ve got personality, you\'re curious, and you actually care about what people are asking. Keep your replies short and snappy — nobody wants to read an essay in a chatroom. Aim to stay under ' + MAX_MESSAGE_LENGTH + ' characters. Don\'t sound like you\'re reading off a script or a FAQ page — just have a real conversation. If you don\'t know the answer or aren\'t sure about something, say so casually — like "idk man", "no idea tbh", "honestly not sure lol" — never say anything stiff like "I don\'t have information about that in my training data" or "I\'m unable to assist with that".';

	if (context) {
		promptText += '\n\nRecent chat context (for reference only):\n' + context;
	}

	promptText += '\n\nUser: ' + question;

	const data = {
		contents: [
			{
				parts: [
					{
						text: promptText,
					},
				],
			},
		],
		generationConfig: {
			maxOutputTokens: 500,
		},
	};

	httpsPost(options, data, (response, error) => {
		if (error) {
			return callback(null, error);
		}
		if (response.error) {
			return callback(null, new Error(response.error.message || 'Gemini API error'));
		}
		if (response.candidates && response.candidates[0] && response.candidates[0].content &&
			response.candidates[0].content.parts && response.candidates[0].content.parts[0]) {
			return callback(response.candidates[0].content.parts[0].text.trim(), null);
		}
		callback(null, new Error('Unexpected response format from Gemini'));
	});
}

function askAI(question, context, callback) {
	if (!AI_API_KEY) {
		return callback(null, new Error('AI API key is not configured'));
	}
	return askGemini(question, context, callback);
}

function truncateResponse(text, maxLength) {
	if (!text) return '';
	text = text.replace(/\n/g, ' ').trim();
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength - 3) + '...';
}

function getUserMemoryKey(userId, room) {
	return Text.toId(userId) + '@' + Text.toRoomid(room || 'pm');
}

function getUserMemory(userId, room) {
	const key = getUserMemoryKey(userId, room);
	if (!userMemory[key]) {
		return [];
	}

	// Clean up expired memories
	const now = Date.now();
	const expiryTime = MEMORY_EXPIRY_HOURS * 60 * 60 * 1000;
	userMemory[key] = userMemory[key].filter(mem => {
		return (now - mem.timestamp) < expiryTime;
	});

	return userMemory[key];
}

function addUserMemory(userId, room, question, answer) {
	const key = getUserMemoryKey(userId, room);
	if (!userMemory[key]) {
		userMemory[key] = [];
	}

	userMemory[key].push({
		question: question,
		answer: answer,
		timestamp: Date.now(),
	});

	if (userMemory[key].length > USER_MEMORY_LIMIT) {
		userMemory[key].shift();
	}
}

function buildEnhancedContext(room, userId) {
	let contextParts = [];

	if (room && chatHistory[room] && chatHistory[room].length > 0) {
		const recentChat = chatHistory[room]
			.filter(msg => !msg.message.startsWith('/') && !msg.message.startsWith('!'))
			.slice(-CHAT_HISTORY_LINES)
			.map(msg => `${msg.user}: ${msg.message}`)
			.join('\n');

		if (recentChat) {
			contextParts.push('Recent chat messages:\n' + recentChat);
		}
	}

	const memory = getUserMemory(userId, room);
	if (memory.length > 0) {
		const memoryText = memory.map(mem =>
			`User asked: "${mem.question}"\nYou responded: "${mem.answer}"`
		).join('\n\n');

		contextParts.push('Previous conversation with this user:\n' + memoryText);
	}

	return contextParts.join('\n\n---\n\n');
}

exports.setup = function (App) {
	function chatHandler(room, time, by, msg) {
		if (!chatHistory[room]) {
			chatHistory[room] = [];
		}

		const userIdent = Text.parseUserIdent(by);
		chatHistory[room].push({
			user: userIdent.name,
			message: msg,
			time: time,
		});

		if (chatHistory[room].length > CHAT_HISTORY_LINES) {
			chatHistory[room].shift();
		}
	}

	App.bot.on('userchat', chatHandler);

	const addon = Tools('add-on').forApp(App).install({
		commandsOverwrite: true,
		commands: {
			"ask": function () {
				if (!this.can("ask", this.room)) {
					return this.replyAccessDenied("ask");
				}

				const question = this.arg.trim();

				if (!question) {
					return this.errorReply(this.usage({ desc: 'Question' }));
				}

				if (question.length > 500) {
					return this.errorReply('Your question is too long. Please keep it under 500 characters.');
				}

				if (!AI_API_KEY) {
					return this.errorReply('AI API key is not configured. Please configure the add-on before use.');
				}

				const room = this.room;
				const userId = Text.parseUserIdent(this.by).id;

				// Build enhanced context with chat history and user memory
				const context = buildEnhancedContext(room, userId);

				askAI(question, context, (response, error) => {
					if (error) {
						App.reportCrash(error);
						App.log('[AI-ASK] Error occurred while processing AI request');
						return this.errorReply('Sorry, I could not get a response from the AI. Please try again later.');
					}

					const aiResponse = truncateResponse(response, MAX_MESSAGE_LENGTH);

					// Store in user memory for future reference
					addUserMemory(userId, room, question, aiResponse);

					const finalResponse = Text.stripCommands(aiResponse);

					this.restrictReply((finalResponse.length > App.config.bot.maxMessageLength ? "!code " : "") + finalResponse, "ask");
				});
			},
		},

		commandPermissions: {
			"ask": { group: DEFAULT_ALLOWED_GROUP },
		},
	});

	// Cleanup function
	addon.destroy = function () {
		App.bot.removeListener('userchat', chatHandler);
	};

	return addon;
};
