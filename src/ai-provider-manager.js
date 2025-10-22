/**
 * AI Provider Manager
 * Handles multiple AI provider integrations with secure API key management
 */

'use strict';

const crypto = require('crypto');
const https = require('https');

class AIProviderManager {
	constructor(App) {
		this.App = App;
		this.providers = new Map();
		// Persist config using App.dam (data access manager) to match project patterns
		this.configPath = (App.dataDir || (App.dir && (App.dir + '/data')) || 'data') + '/ai-config.json';
		this.config = this.loadConfig() || this.getDefaultConfig();
		this.initializeProviders();
	}

	loadConfig() {
		try {
			const raw = this.App.dam.getFileContent(this.configPath);
			return JSON.parse(raw);
		} catch (e) {
			return null;
		}
	}

	getDefaultConfig() {
		return {
			encryptionKey: crypto.randomBytes(32).toString('hex'),
			providers: {},
			defaultProvider: null,
			usageLimits: { daily: 100, perHour: 10 },
			privacySettings: { sendBattleLogs: false, sendUserMessages: false, anonymizeData: true },
			enabled: false,
		};
	}

	initializeProviders() {
		this.providers.set('openai', {
			name: 'OpenAI (ChatGPT)',
			endpoint: 'https://api.openai.com/v1/chat/completions',
			makeRequest: this.makeOpenAIRequest.bind(this),
			validateKey: this.validateOpenAIKey.bind(this),
		});
		this.providers.set('gemini', {
			name: 'Google Gemini',
			endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
			makeRequest: this.makeGeminiRequest.bind(this),
			validateKey: this.validateGeminiKey.bind(this),
		});
		this.providers.set('anthropic', {
			name: 'Anthropic Claude',
			endpoint: 'https://api.anthropic.com/v1/messages',
			makeRequest: this.makeAnthropicRequest.bind(this),
			validateKey: this.validateAnthropicKey.bind(this),
		});
	}

	// Encryption/Decryption
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

	// Requests (simplified for brevity)
	makeOpenAIRequest(prompt, cb) {
		if (!this.config.providers.openai || !this.config.providers.openai.apiKey) return cb(new Error('OpenAI API key not configured'));
		return cb(new Error('Not implemented in this test build'));
	}
	makeGeminiRequest(prompt, cb) { return cb(new Error('Not implemented in this test build')); }
	makeAnthropicRequest(prompt, cb) { return cb(new Error('Not implemented in this test build')); }

	// Validation (stubs)
	validateOpenAIKey(apiKey, cb){ cb(!!apiKey && apiKey.length > 10); }
	validateGeminiKey(apiKey, cb){ cb(!!apiKey && apiKey.length > 10); }
	validateAnthropicKey(apiKey, cb){ cb(!!apiKey && apiKey.length > 10); }

	// Public API
	addProvider(providerId, apiKey, callback) {
		if (!this.providers.has(providerId)) return callback(new Error('Unknown provider'));
		const provider = this.providers.get(providerId);
		provider.validateKey(apiKey, (isValid)=>{
			if (!isValid) return callback(new Error('Invalid API key'));
			this.config.providers[providerId] = { apiKey: this.encryptAPIKey(apiKey), enabled: true, added: Date.now() };
			if (!this.config.defaultProvider) this.config.defaultProvider = providerId;
			this.saveConfig();
			callback(null, 'Provider added successfully');
		});
	}
	removeProvider(providerId){ delete this.config.providers[providerId]; if (this.config.defaultProvider===providerId){ const rest=Object.keys(this.config.providers); this.config.defaultProvider = rest.length? rest[0]: null; } this.saveConfig(); }

	getProviders(){ const out={}; for (const [id,p] of this.providers){ out[id]={ name:p.name, configured: !!this.config.providers[id], enabled: this.config.providers[id]? this.config.providers[id].enabled:false }; } return out; }
	getConfig(){ const safe=JSON.parse(JSON.stringify(this.config)); for (const id in safe.providers){ delete safe.providers[id].apiKey; } delete safe.encryptionKey; return safe; }

	saveConfig(){ try{ this.App.dam.setFileContent(this.configPath, JSON.stringify(this.config, null, 2)); } catch(e){ this.App.reportCrash && this.App.reportCrash(e); } }
}

module.exports = AIProviderManager;
