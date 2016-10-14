/*
 * Bot Module: GitHub
 */

'use strict';

const Text = Tools('text');

exports.setup = function (App) {
	if (!App.config.modules.github) {
		App.config.modules.github = {
			room: '',
			port: 3420,
			secret: '',
			blacklist: {},
			enabled: false,
		};
	}

	class GitHubModule {
		constructor() {
			this.updates = {};
			this.running = false;
			this.webhook = null;
		}

		createWebHook(callback) {
			if (this.running) return;
			let config = App.config.modules.github;
			try {
				require('githubhook');
			} catch (err) {
				console.log('Installing dependencies... (githubhook)');
				require('child_process').spawnSync('sh', ['-c', 'npm install githubhook'], {stdio: 'inherit'});
			}
			const GitHubHook = require('githubhook');
			this.webhook = new GitHubHook({port: config.port, secret: config.secret});
			this.running = true;
			prepareWebHook(this.webhook);
			this.webhook.listen(callback);
		}

		stopWebHook(callback) {
			if (!this.running) return;
			if (this.webhook) {
				this.webhook.stop(callback);
				this.webhook = null;
				this.running = false;
			}
		}
	}

	const GitHubMod = new GitHubModule();

	const updates = GitHubMod.updates;

	function report(msg) {
		if (!msg) return;
		App.bot.sendTo(App.config.modules.github.room, '/addhtmlbox ' + msg);
	}

	function prepareWebHook(webhook) {
		webhook.on('push', function push(repo, ref, result) {
			let url = result.compare;
			let branch = /[^/]+$/.exec(ref)[0];
			let messages = [];
			let message = "";
			message += "[<font color='FF00FF'>" + Text.escapeHTML(repo) + '</font>] ';
			message += "<font color='909090'>" + Text.escapeHTML(result.pusher.name) + "</font> ";
			message += (result.forced ? '<font color="red">force-pushed</font>' : 'pushed') + " ";
			message += "<b>" + Text.escapeHTML(result.commits.length) + "</b> ";
			message += "new commit" + (result.commits.length === 1 ? '' : 's') + " to ";
			message += "<font color='800080'>" + Text.escapeHTML(branch) + "</font>: ";
			message += "<a href=\"" + Text.escapeHTML(url) + "\">View &amp; compare</a>";
			messages.push(message);
			result.commits.forEach(function (commit) {
				let commitMessage = commit.message;
				let shortCommit = /.+/.exec(commitMessage)[0];
				if (commitMessage !== shortCommit) {
					shortCommit += '&hellip;';
				}
				message = "";
				message += "<font color='FF00FF'>" + Text.escapeHTML(repo) + "</font>/";
				message += "<font color='800080'>" + Text.escapeHTML(branch) + "</font> ";
				message += "<a href=\"" + Text.escapeHTML(commit.url) + "\">";
				message += "<font color='606060'>" + Text.escapeHTML(commit.id.substring(0, 6)) + "</font></a> ";
				message += "<font color='909090'>" + Text.escapeHTML(commit.author.name) + "</font>: " + Text.escapeHTML(shortCommit);
				messages.push(message);
			});
			report(messages.join("<br>"));
		});

		webhook.on('pull_request', function pullRequest(repo, ref, result) {
			if (App.config.modules.github.blacklist[(result.sender.login || '').toLowerCase().trim()]) return;
			let COOLDOWN = 10 * 60 * 1000;
			let requestNumber = result.pull_request.number;
			let url = result.pull_request.html_url;
			let action = result.action;
			if (!updates[repo]) updates[repo] = {};
			if (action === 'synchronize') {
				action = 'updated';
			}
			if (action === 'labeled') {
				// Nobody cares about labels
				return;
			}
			let now = Date.now();
			if (updates[repo][requestNumber] && updates[repo][requestNumber] + COOLDOWN > now) {
				return;
			}
			updates[repo][requestNumber] = now;
			let message = "";
			message += "[<font color='FF00FF'>" + repo + "</font>] ";
			message += "<font color='909090'>" + result.sender.login + "</font> ";
			message += action + " pull request <a href=\"" + url + "\">#" + requestNumber + "</a>: ";
			message += result.pull_request.title;
			report(message);
		});
	}

	if (App.config.modules.github.enabled) {
		GitHubMod.createWebHook();
	}

	return GitHubMod;
};
