/**
 * Server Handler: AI Configuration
 * Allows administrators to configure AI API keys and settings
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'templates', 'ai-config.html'));
const providerTemplate = new Template(Path.resolve(__dirname, 'templates', 'ai-provider-item.html'));

exports.setup = function (App) {
	if (App.env.staticmode) return;

	// Initialize AI Provider Manager
	if (!App.aiManager) {
		// Fix path: handlers -> server -> src
		const AIProviderManager = require(Path.resolve(__dirname, '..', '..', 'ai-provider-manager.js'));
		App.aiManager = new AIProviderManager(App);
	}

	/* Menu Options */
	App.server.setMenuOption('ai-config', 'AI Configuration', '/ai-config/', 'root', 3);

	/* Handlers */
	App.server.setHandler('ai-config', (context, parts) => {
		if (!context.user || !context.user.can('root')) {
			context.endWith403();
			return;
		}

		let ok = null, error = null;

		// Inject page-specific stylesheet for readability
		const pageOptions = {
			title: 'AI Configuration - Showdown ChatBot',
			styles: ['/static/ai-config.css'],
		};

		// Handle form submissions
		if (context.post.addProvider) {
			const providerId = context.post.providerId;
			const apiKey = (context.post.apiKey || '').trim();

			try {
				check(providerId, 'Provider ID is required');
				check(apiKey, 'API Key is required');
				check(apiKey.length > 10, 'API Key appears to be invalid');
			} catch (err) {
				error = err.message;
			}

			if (!error) {
				App.aiManager.addProvider(providerId, apiKey, (err, message) => {
					if (err) {
						error = err.message;
					} else {
						ok = message;
						App.logServerAction(context.user.id, `AI Provider added: ${providerId}`);
					}
					renderPage();
				});
				return;
			} else {
				renderPage();
				return;
			}
		}

		if (context.post.removeProvider) {
			const providerId = context.post.providerId;
			if (providerId) {
				App.aiManager.removeProvider(providerId);
				ok = `Provider ${providerId} removed successfully`;
				App.logServerAction(context.user.id, `AI Provider removed: ${providerId}`);
			}
		}

		if (context.post.updateSettings) {
			const config = App.aiManager.getConfig();
			config.enabled = !!context.post.enabled;
			config.defaultProvider = context.post.defaultProvider || null;
			config.usageLimits.daily = parseInt(context.post.dailyLimit) || 100;
			config.usageLimits.perHour = parseInt(context.post.hourlyLimit) || 10;
			config.privacySettings.sendBattleLogs = !!context.post.sendBattleLogs;
			config.privacySettings.sendUserMessages = !!context.post.sendUserMessages;
			config.privacySettings.anonymizeData = !!context.post.anonymizeData;

			App.aiManager.config.enabled = config.enabled;
			App.aiManager.config.defaultProvider = config.defaultProvider;
			App.aiManager.config.usageLimits = config.usageLimits;
			App.aiManager.config.privacySettings = config.privacySettings;
			App.aiManager.saveConfig();

			ok = 'Settings updated successfully';
			App.logServerAction(context.user.id, 'AI settings updated');
		}

		renderPage();

		function renderPage() {
			const config = App.aiManager.getConfig();
			const providers = App.aiManager.getProviders();

			let htmlVars = Object.create(null);
			htmlVars.providers_list = '';

			// Generate provider list
			for (const [id, provider] of Object.entries(providers)) {
				htmlVars.providers_list += providerTemplate.make({
					id: Text.escapeHTML(id),
					name: Text.escapeHTML(provider.name),
					status: provider.configured ? (provider.enabled ? 'Enabled' : 'Disabled') : 'Not Configured',
					status_class: provider.configured ? (provider.enabled ? 'success' : 'warning') : 'error',
					is_configured: provider.configured ? 'true' : 'false'
				});
			}

			// Settings
			htmlVars.enabled_checked = config.enabled ? 'checked' : '';
			htmlVars.default_provider = config.defaultProvider || '';
			htmlVars.daily_limit = config.usageLimits.daily;
			htmlVars.hourly_limit = config.usageLimits.perHour;
			htmlVars.send_battle_logs = config.privacySettings.sendBattleLogs ? 'checked' : '';
			htmlVars.send_user_messages = config.privacySettings.sendUserMessages ? 'checked' : '';
			htmlVars.anonymize_data = config.privacySettings.anonymizeData ? 'checked' : '';

			htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
			htmlVars.request_msg = (ok ? ok : (error || ''));

			context.endWithWebPage(mainTemplate.make(htmlVars), pageOptions);
		}
	});
};