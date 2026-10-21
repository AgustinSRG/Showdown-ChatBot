/**
 * Security and Hardening Test Suite
 * Tests path traversal defenses, scrypt password hashing, and reliability fixes.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Path = require('path');
const FileSystem = require('fs');
const Crypto = require('crypto');

// Initialize ToolsManager
const ToolsManager = require(Path.resolve(__dirname, '../src/tools.js'));
ToolsManager.setPath(Path.resolve(__dirname, '../src/tools/'));
ToolsManager.makeGlobal();

const DataAccessManager = require(Path.resolve(__dirname, '../src/data-access/raw-data.js'));
const Text = Tools('text');

test('Text utility exports escapeHtml as alias to escapeHTML', () => {
	assert.strictEqual(typeof Text.escapeHtml, 'function');
	assert.strictEqual(Text.escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
});

test('Backup restore security and path traversal protection', t => {
	const testDir = Path.resolve(__dirname, 'tmp-config-test');
	if (FileSystem.existsSync(testDir)) {
		FileSystem.rmSync(testDir, { recursive: true, force: true });
	}
	FileSystem.mkdirSync(testDir, { recursive: true });

	t.after(() => {
		if (FileSystem.existsSync(testDir)) {
			FileSystem.rmSync(testDir, { recursive: true, force: true });
		}
	});

	const dam = new DataAccessManager({ path: testDir });

	t.test('succeeds with valid subdirectories and files', () => {
		dam.restoreBackup(
			['sub', 'sub/nested'],
			[
				{ file: 'test.json', content: '{"ok":true}' },
				{ file: 'sub/nested/deep.txt', content: 'safe content' }
			]
		);

		assert.strictEqual(
			FileSystem.readFileSync(Path.resolve(testDir, 'test.json'), 'utf8'),
			'{"ok":true}'
		);
		assert.strictEqual(
			FileSystem.readFileSync(Path.resolve(testDir, 'sub/nested/deep.txt'), 'utf8'),
			'safe content'
		);
	});

	t.test('rejects path traversal in directory path (fail-closed)', () => {
		assert.throws(
			() => {
				dam.restoreBackup(['../../evil-dir'], []);
			},
			/Directory traversal detected in backup path/
		);
	});

	t.test('rejects path traversal in file path (fail-closed)', () => {
		assert.throws(
			() => {
				dam.restoreBackup(
					[],
					[{ file: '../../evil-file.txt', content: 'malicious' }]
				);
			},
			/File traversal detected in backup path/
		);
	});

	t.test('rejects non-array backup structures', () => {
		assert.throws(
			() => {
				dam.restoreBackup(null, []);
			},
			/Invalid backup structure/
		);
	});
});

test('Password hashing with scrypt and backward compatibility', () => {
	const privateKey = 'test_secret_private_key_12345';
	const algo = 'aes-256-ctr';

	function encryptLegacy(text, password) {
		const iv = Buffer.from(Crypto.randomBytes(16));
		const hash = Crypto.createHash('sha256');
		hash.update(password);
		const cipher = Crypto.createCipheriv(algo, hash.digest(), iv);
		let crypted = cipher.update(text, 'utf8', 'hex');
		crypted += cipher.final('hex');
		return iv.toString('hex') + ':' + crypted;
	}

	function decryptLegacy(text, password) {
		const parts = text.split(':');
		const iv = Buffer.from(parts[0], 'hex');
		const hash = Crypto.createHash('sha256');
		hash.update(password);
		const decipher = Crypto.createDecipheriv(algo, hash.digest(), iv);
		let data = decipher.update(parts[1], 'hex', 'utf8');
		data += decipher.final('utf8');
		return data;
	}

	function secureCompare(a, b) {
		try {
			return Crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
		} catch (ex) {
			return false;
		}
	}

	function encryptPassword(str) {
		const salt = Crypto.randomBytes(16).toString('hex');
		const hash = Crypto.scryptSync(str, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
		return {
			algo: 'scrypt',
			salt: salt,
			hash: hash,
		};
	}

	function checkPassword(pass, str) {
		if (typeof pass === 'object' && pass !== null) {
			if (pass.algo === 'scrypt' && pass.salt && pass.hash) {
				try {
					const hash = Crypto.scryptSync(str, pass.salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
					return secureCompare(hash, pass.hash);
				} catch (ex) {
					return false;
				}
			}
			if (pass.hash) {
				return secureCompare(
					decryptLegacy(pass.hash, str),
					privateKey
				);
			}
			return false;
		} else if (typeof pass === 'string') {
			return secureCompare(str, pass);
		}
		return false;
	}

	// 1. Scrypt hashing
	const password = 'SuperSecretPassword!2026';
	const storedScrypt = encryptPassword(password);

	assert.strictEqual(storedScrypt.algo, 'scrypt');
	assert.ok(storedScrypt.salt && storedScrypt.salt.length === 32);
	assert.ok(storedScrypt.hash && storedScrypt.hash.length === 128);

	assert.strictEqual(checkPassword(storedScrypt, password), true);
	assert.strictEqual(checkPassword(storedScrypt, 'WrongPassword'), false);

	// 2. Legacy AES-CTR password verification (backward compatibility)
	const legacyStored = {
		encrypted: algo,
		hash: encryptLegacy(privateKey, 'legacyAdminPass'),
	};

	assert.strictEqual(checkPassword(legacyStored, 'legacyAdminPass'), true);
	assert.strictEqual(checkPassword(legacyStored, 'wrongLegacyPass'), false);
});

test('Security log filename pattern validation', () => {
	const logPattern = /^[a-zA-Z0-9_-]+_[0-9]{4}_[0-9]{2}_[0-9]{2}\.log$/;

	assert.strictEqual(logPattern.test('log_2026_10_21.log'), true);
	assert.strictEqual(logPattern.test('server_2026_01_01.log'), true);
	assert.strictEqual(logPattern.test('seclog_app-1_2026_12_31.log'), true);

	// Invalid filenames & traversal attempts
	assert.strictEqual(logPattern.test('../../etc/passwd'), false);
	assert.strictEqual(logPattern.test('..%2fconfig.json'), false);
	assert.strictEqual(logPattern.test('config.key'), false);
	assert.strictEqual(logPattern.test('log_2026_10_21.js'), false);
	assert.strictEqual(logPattern.test('log_2026_10_21.log.exe'), false);
});
