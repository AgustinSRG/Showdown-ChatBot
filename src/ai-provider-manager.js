/**
 * AI Provider Manager
 * Handles multiple AI provider integrations with secure API key management
 */

'use strict';

const crypto = require('crypto');
const https = require('https');
const http = require('http');

class AIProviderManager {
	constructor(App) {
		this.App = App;
		this.providers = new Map();
		this.config = App.data.cache.get('ai-config.json') || this.getDefaultConfig();
		this.initializeProviders();
	}

	getDefaultConfig() {
		return {
			encryptionKey: crypto.randomBytes(32).toString('hex'),
			providers: {},
			defaultProvider: null,
			usageLimits: {
				daily: 100,
				perHour: 10
			},
			privacySettings: {
				sendBattleLogs: false,
				sendUserMessages: false,
				anonymizeData: true
			},
			enabled: false
		};
	}

	initializeProviders() {
		// OpenAI/ChatGPT Provider
		this.providers.set('openai', {
			name: 'OpenAI (ChatGPT)',
			endpoint: 'https://api.openai.com/v1/chat/completions',
			makeRequest: this.makeOpenAIRequest.bind(this),
			validateKey: this.validateOpenAIKey.bind(this)
		});

		// Google Gemini Provider
		this.providers.set('gemini', {
			name: 'Google Gemini',
			endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
			makeRequest: this.makeGeminiRequest.bind(this),
			validateKey: this.validateGeminiKey.bind(this)
		});

		// Anthropic Claude Provider
		this.providers.set('anthropic', {
			name: 'Anthropic Claude',
			endpoint: 'https://api.anthropic.com/v1/messages',
			makeRequest: this.makeAnthropicRequest.bind(this),
			validateKey: this.validateAnthropicKey.bind(this)
		});
	}

	// Encryption/Decryption for API keys
	encryptAPIKey(apiKey) {
		const cipher = crypto.createCipher('aes-256-cbc', this.config.encryptionKey);
		let encrypted = cipher.update(apiKey, 'utf8', 'hex');
		encrypted += cipher.final('hex');
		return encrypted;
	}

	decryptAPIKey(encryptedKey) {
		try {
			const decipher = crypto.createDecipher('aes-256-cbc', this.config.encryptionKey);
			let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
			decrypted += decipher.final('utf8');
			return decrypted;
		} catch (err) {
			this.App.reportCrash(err);
			return null;
		}
	}

	// Provider-specific request methods
	makeOpenAIRequest(prompt, callback) {
		if (!this.config.providers.openai || !this.config.providers.openai.apiKey) {
			return callback(new Error('OpenAI API key not configured'));
		}

		const apiKey = this.decryptAPIKey(this.config.providers.openai.apiKey);
		const data = JSON.stringify({
			model: 'gpt-3.5-turbo',
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 150,
			temperature: 0.7
		});

		this.makeHTTPSRequest('api.openai.com', '/v1/chat/completions', {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		}, data, (err, response) => {
			if (err) return callback(err);
			try {
				const result = JSON.parse(response);
				if (result.choices && result.choices[0]) {
					callback(null, result.choices[0].message.content);
				} else {
					callback(new Error('Invalid response from OpenAI'));
				}
			} catch (parseErr) {
				callback(parseErr);
			}
		});
	}

	makeGeminiRequest(prompt, callback) {
		if (!this.config.providers.gemini || !this.config.providers.gemini.apiKey) {
			return callback(new Error('Gemini API key not configured'));
		}

		const apiKey = this.decryptAPIKey(this.config.providers.gemini.apiKey);
		const data = JSON.stringify({
			contents: [{
				parts: [{ text: prompt }]
			}]
		});

		this.makeHTTPSRequest('generativelanguage.googleapis.com', `/v1/models/gemini-pro:generateContent?key=${apiKey}`, {
			'Content-Type': 'application/json'
		}, data, (err, response) => {
			if (err) return callback(err);
			try {
				const result = JSON.parse(response);
				if (result.candidates && result.candidates[0] && result.candidates[0].content) {
					callback(null, result.candidates[0].content.parts[0].text);
				} else {
					callback(new Error('Invalid response from Gemini'));
				}
			} catch (parseErr) {
				callback(parseErr);
			}
		});
	}

	makeAnthropicRequest(prompt, callback) {
		if (!this.config.providers.anthropic || !this.config.providers.anthropic.apiKey) {
			return callback(new Error('Anthropic API key not configured'));
		}

		const apiKey = this.decryptAPIKey(this.config.providers.anthropic.apiKey);
		const data = JSON.stringify({
			model: 'claude-3-haiku-20240307',
			max_tokens: 150,
			messages: [{ role: 'user', content: prompt }]
		});

		this.makeHTTPSRequest('api.anthropic.com', '/v1/messages', {
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			'Content-Type': 'application/json'
		}, data, (err, response) => {
			if (err) return callback(err);
			try {
				const result = JSON.parse(response);
				if (result.content && result.content[0]) {
					callback(null, result.content[0].text);
				} else {
					callback(new Error('Invalid response from Anthropic'));
				}
			} catch (parseErr) {
				callback(parseErr);
			}
		});
	}

	// Generic HTTPS request helper
	makeHTTPSRequest(hostname, path, headers, data, callback) {
		const options = {
			hostname: hostname,
			path: path,
			method: 'POST',
			headers: {
				'Content-Length': Buffer.byteLength(data),
				...headers
			}
		};

		const req = https.request(options, (res) => {
			let responseData = '';
			res.on('data', (chunk) => {
				responseData += chunk;
			});
			res.on('end', () => {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					callback(null, responseData);
				} else {
					callback(new Error(`HTTP ${res.statusCode}: ${responseData}`));
				}
			});
		});

		req.on('error', callback);
		req.write(data);
		req.end();
	}

	// API key validation
	validateOpenAIKey(apiKey, callback) {
		this.makeHTTPSRequest('api.openai.com', '/v1/models', {
			'Authorization': `Bearer ${apiKey}`
		}, '', (err, response) => {
			if (err) return callback(false);
			try {
				const result = JSON.parse(response);
				callback(result.data && Array.isArray(result.data));
			} catch (e) {
				callback(false);
			}
		});
	}

	validateGeminiKey(apiKey, callback) {
		this.makeHTTPSRequest('generativelanguage.googleapis.com', `/v1/models?key=${apiKey}`, {}, '', (err, response) => {
			if (err) return callback(false);
			try {
				const result = JSON.parse(response);
				callback(result.models && Array.isArray(result.models));
			} catch (e) {
				callback(false);
			}
		});
	}

	validateAnthropicKey(apiKey, callback) {
		const data = JSON.stringify({
			model: 'claude-3-haiku-20240307',
			max_tokens: 1,
			messages: [{ role: 'user', content: 'Hi' }]
		});

		this.makeHTTPSRequest('api.anthropic.com', '/v1/messages', {
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			'Content-Type': 'application/json'
		}, data, (err, response) => {
			callback(!err);
		});
	}

	// Public API methods
	addProvider(providerId, apiKey, callback) {
		if (!this.providers.has(providerId)) {
			return callback(new Error('Unknown provider'));
		}

		const provider = this.providers.get(providerId);
		provider.validateKey(apiKey, (isValid) => {
			if (!isValid) {
				return callback(new Error('Invalid API key'));
			}

			this.config.providers[providerId] = {
				apiKey: this.encryptAPIKey(apiKey),
				enabled: true,
				added: Date.now()
			};

			if (!this.config.defaultProvider) {
				this.config.defaultProvider = providerId;
			}

			this.saveConfig();
			callback(null, 'Provider added successfully');
		});
	}

	removeProvider(providerId) {
		delete this.config.providers[providerId];
		if (this.config.defaultProvider === providerId) {
			const remaining = Object.keys(this.config.providers);
			this.config.defaultProvider = remaining.length > 0 ? remaining[0] : null;
		}
		this.saveConfig();
	}

	generateResponse(prompt, options = {}) {
		return new Promise((resolve, reject) => {
			if (!this.config.enabled) {
				return reject(new Error('AI integration is disabled'));
			}

			const providerId = options.provider || this.config.defaultProvider;
			if (!providerId || !this.config.providers[providerId]) {
				return reject(new Error('No AI provider configured'));
			}

			const provider = this.providers.get(providerId);
			provider.makeRequest(prompt, (err, response) => {
				if (err) return reject(err);
				resolve(response);
			});
		});
	}

	getProviders() {
		const result = {};
		for (const [id, provider] of this.providers) {
			result[id] = {
				name: provider.name,
				configured: !!this.config.providers[id],
				enabled: this.config.providers[id] ? this.config.providers[id].enabled : false
			};
		}
		return result;
	}

	saveConfig() {
		this.App.data.cache.set('ai-config.json', this.config);
	}

	getConfig() {
		// Return config without sensitive data
		const safeConfig = JSON.parse(JSON.stringify(this.config));
		for (const providerId in safeConfig.providers) {
			delete safeConfig.providers[providerId].apiKey;
		}
		delete safeConfig.encryptionKey;
		return safeConfig;
	}
}

module.exports = AIProviderManager;
