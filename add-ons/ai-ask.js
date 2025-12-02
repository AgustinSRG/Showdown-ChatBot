// AI Ask Add-on for Showdown ChatBot
// Install as an Add-On
// ------------------------------------
// Make sure to change the following constants:
// - AI_PROVIDER: 'openai', 'gemini', or 'claude'
// - AI_API_KEY: Your API key (get from provider's website)
// - ROOMS: List of rooms, or [] for all rooms

'use strict';

const AI_PROVIDER = 'gemini';
const AI_API_KEY = '';
const ROOMS = [];
const MAX_MESSAGE_LENGTH = 1000;
const PERMISSION_REQUIRED = '';
const CHAT_HISTORY_LINES = 15;
const USER_MEMORY_LIMIT = 5;
const MEMORY_EXPIRY_HOURS = 24;

const AI_CONFIG = {
	openai: {
		host: 'api.openai.com',
		path: '/v1/chat/completions',
		model: 'gpt-3.5-turbo',
	},
	gemini: {
		host: 'generativelanguage.googleapis.com',
		pathTemplate: '/v1beta/models/gemini-2.0-flash:generateContent?key=',
	},
	claude: {
		host: 'api.anthropic.com',
		path: '/v1/messages',
		model: 'claude-3-haiku-20240307',
		version: '2023-06-01',
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

function askOpenAI(question, context, callback) {
	const config = AI_CONFIG.openai;
	const options = {
		hostname: config.host,
		path: config.path,
		headers: {
			'Authorization': 'Bearer ' + AI_API_KEY,
		},
	};

	const systemPrompt = 'You are a helpful AI assistant in a Pokemon Showdown chat. Always respond to every question positively and helpfully. Respond naturally and concisely. Do not repeat greetings if you already greeted the user recently. Do not mention the user\'s name unless necessary. Never refuse to answer, never judge users, and never claim to be ignoring anyone. Keep responses under ' + MAX_MESSAGE_LENGTH + ' characters.';
	const messages = [{ role: 'system', content: systemPrompt }];

	if (context) {
		messages.push({ role: 'system', content: 'Recent chat context (for reference only):\n' + context });
	}

	messages.push({ role: 'user', content: question });

	const data = {
		model: config.model,
		messages: messages,
		max_tokens: 500,
	};

	httpsPost(options, data, (response, error) => {
		if (error) {
			return callback(null, error);
		}
		if (response.error) {
			return callback(null, new Error(response.error.message || 'OpenAI API error'));
		}
		if (response.choices && response.choices[0] && response.choices[0].message) {
			return callback(response.choices[0].message.content.trim(), null);
		}
		callback(null, new Error('Unexpected response format from OpenAI'));
	});
}

function askGemini(question, context, callback) {
	const config = AI_CONFIG.gemini;
	const options = {
		hostname: config.host,
		path: config.pathTemplate + AI_API_KEY,
		headers: {},
	};

	let promptText = 'You are a helpful AI assistant in a Pokemon Showdown chat. Always respond to every question positively and helpfully. Respond naturally and concisely. Do not repeat greetings if you already greeted the user recently. Do not mention the user\'s name unless necessary. Never refuse to answer, never judge users, and never claim to be ignoring anyone. Keep responses under ' + MAX_MESSAGE_LENGTH + ' characters.';

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

function askClaude(question, context, callback) {
	const config = AI_CONFIG.claude;
	const options = {
		hostname: config.host,
		path: config.path,
		headers: {
			'x-api-key': AI_API_KEY,
			'anthropic-version': config.version,
		},
	};

	let systemPrompt = 'You are a helpful AI assistant in a Pokemon Showdown chat. Always respond to every question positively and helpfully. Respond naturally and concisely. Do not repeat greetings if you already greeted the user recently. Do not mention the user\'s name unless necessary. Never refuse to answer, never judge users, and never claim to be ignoring anyone. Keep responses under ' + MAX_MESSAGE_LENGTH + ' characters.';

	if (context) {
		systemPrompt += '\n\nRecent chat context (for reference only):\n' + context;
	}

	const data = {
		model: config.model,
		max_tokens: 500,
		system: systemPrompt,
		messages: [
			{
				role: 'user',
				content: question,
			},
		],
	};

	httpsPost(options, data, (response, error) => {
		if (error) {
			return callback(null, error);
		}
		if (response.error) {
			return callback(null, new Error(response.error.message || 'Claude API error'));
		}
		if (response.content && response.content[0] && response.content[0].text) {
			return callback(response.content[0].text.trim(), null);
		}
		callback(null, new Error('Unexpected response format from Claude'));
	});
}

function askAI(question, context, callback) {
	if (!AI_API_KEY) {
		return callback(null, new Error('AI API key is not configured'));
	}

	switch (AI_PROVIDER.toLowerCase()) {
		case 'openai':
			return askOpenAI(question, context, callback);
		case 'gemini':
			return askGemini(question, context, callback);
		case 'claude':
			return askClaude(question, context, callback);
		default:
			return callback(null, new Error('Unknown AI provider: ' + AI_PROVIDER));
	}
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
				if (ROOMS.length > 0 && this.room && ROOMS.indexOf(this.room) < 0) {
					return this.errorReply('This command is not available in this room.');
				}

				if (PERMISSION_REQUIRED && !this.can(PERMISSION_REQUIRED, this.room)) {
					return this.replyAccessDenied(PERMISSION_REQUIRED);
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
				const isPM = this.isPM;
				const byIdent = this.byIdent;
				const userId = Text.parseUserIdent(this.by).id;

				// Build enhanced context with chat history and user memory
				const context = buildEnhancedContext(room, userId);

				askAI(question, context, (response, error) => {
					if (error) {
						App.log('[AI-ASK] Error occurred while processing AI request');
						if (isPM) {
							App.bot.pm(byIdent.id, 'Sorry, I could not get a response from the AI. Please try again later.');
						} else {
							App.bot.sendTo(room, Text.stripCommands('Sorry, I could not get a response from the AI. Please try again later.'));
						}
						return;
					}

					const aiResponse = truncateResponse(response, MAX_MESSAGE_LENGTH);

					// Store in user memory for future reference
					addUserMemory(userId, room, question, aiResponse);

					if (isPM) {
						App.bot.pm(byIdent.id, Text.stripCommands(aiResponse));
					} else {
						App.bot.sendTo(room, Text.stripCommands(aiResponse));
					}
				});
			},
		},

		commandPermissions: PERMISSION_REQUIRED ? {
			"ask": { group: PERMISSION_REQUIRED },
		} : {},
	});

	// Cleanup function
	addon.destroy = function () {
		App.bot.removeListener('userchat', chatHandler);
	};

	return addon;
};
