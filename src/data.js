/**
 * Pokemon Showdown Bot Data Manager
 * Showdown ChatBot is distributed under the terms of the MIT License
 * (https://github.com/asanrom/Showdown-ChatBot/blob/master/LICENSE)
 *
 * This tool downloads data of pokemon, moves, items, etc
 * from Pokemon Showdown! website and repository
 * This also includes a Web-Chache to be used by the bot modules
 */

'use strict';

const Temp_Size = 50;

const Path = require('path');
const Https = require('https');
const Http = require('http');
const FileSystem = require('fs');

const JSON5 = require('json5');
const WebCache = Tools('cache').WebCache;
const TempManager = Tools('temp');
const checkDir = Tools('checkdir');
const EventManager = Tools('events');

const Showdown_Data = [
	{
		url: "https://play.pokemonshowdown.com/data/formats-data.js",
		file: "formats-data.js",
	},
	{
		url: "https://play.pokemonshowdown.com/data/pokedex.js",
		file: "pokedex.js",
	},
	{
		url: "https://play.pokemonshowdown.com/data/moves.js",
		file: "moves.js",
	},
	{
		url: "https://play.pokemonshowdown.com/data/abilities.js",
		file: "abilities.js",
	},
	{
		url: "https://play.pokemonshowdown.com/data/items.js",
		file: "items.js",
	},
	{
		url: "https://play.pokemonshowdown.com/data/learnsets.js",
		file: "learnsets.js",
	},
	{
		url: "https://play.pokemonshowdown.com/data/aliases.js",
		file: "aliases.js",
	},
];

const Data_Cache = new Map();

/**
 * Web-Get
 * This function downloads a file and returns the data
 * via the callback
 *
 * @param {String} url - The requested url
 * @param {function(String, Error)} callback
 * @param {boolean} strictError
 */
function wget(url, callback, strictError) {
	url = new URL(url);
	let mod = url.protocol === 'https:' ? Https : Http;
	mod.get(url.toString(), response => {
		let data = '';
		if (strictError && response.statusCode !== 200) {
			callback(null, new Error("Server responded with status code " + response.statusCode));
			return;
		}
		response.on('data', chunk => {
			data += chunk;
		});
		response.on('end', () => {
			callback(data);
		});
		response.on('error', err => {
			callback(null, err);
		});
	}).on('error', err => {
		callback(null, err);
	});
}

/**
 * Represents a manager for Showdown ChatBot data
 */
class DataManager {
	/**
	 * @param {Path} path - An existing path to store the data
	 */
	constructor(path) {
		this.path = path;
		this.downloading = false;
		this.cur = -1;

		checkDir(Path.resolve(path, 'cache/'));
		this.cache = new WebCache(Path.resolve(path, 'cache/'));

		checkDir(Path.resolve(path, 'temp/'));
		this.temp = new TempManager(Path.resolve(path, 'temp/'), Temp_Size);

		this.events = new EventManager();
		this.cache.events.on('error', function (err, url) {
			this.events.emit('msg', "Error (" + err.code + ") " + err.message + " | Cache " + url);
		}.bind(this));
		this.temp.events.on('error', function (err) {
			this.events.emit('msg', "Error (" + err.code + ") " + err.message);
		}.bind(this));
	}

	/**
	 * Asynchronous method to download all data files
	 */
	downloadAll() {
		if (this.downloading) return;
		this.downloading = true;
		this.cur = -1;
		this.nextDownload();
	}

	/**
	 * Gets a file from the downloaded data
	 * @param {String} file - The requested file name
	 * @returns {Object}
	 */
	get(file) {
		if (Data_Cache.has(file)) {
			return Data_Cache.get(file);
		}

		let data;

		if (file.endsWith(".js")) {
			let fileData = FileSystem.readFileSync(Path.resolve(this.path, file)).toString();
			let startIndex = fileData.indexOf("{");
			fileData = fileData.substr(startIndex - 1).trim();
			fileData = fileData.substr(0, fileData.length - 1);
			data = JSON5.parse(fileData);
		} else {
			data = JSON.parse(FileSystem.readFileSync(Path.resolve(this.path, file)).toString());
		}

		Data_Cache.set(file, data);

		return data;
	}

	/**
	 * Gets the Pokedex
	 * @returns {Object}
	 */
	getPokedex() {
		return this.get('pokedex.js');
	}

	/**
	 * Gets the Pokemon Moves
	 * @returns {Object}
	 */
	getMoves() {
		return this.get('moves.js');
	}

	/**
	 * Gets the Items
	 * @returns {Object}
	 */
	getItems() {
		return this.get('items.js');
	}

	/**
	 * Gets the Pokemon Abilities
	 * @returns {Object}
	 */
	getAbilities() {
		return this.get('abilities.js');
	}

	/**
	 * Gets the Pokemon Showdown official aliases
	 * @returns {Object}
	 */
	getAliases() {
		return this.get('aliases.js');
	}

	/**
	 * Gets the Pokemon Showdown formats data
	 * @returns {Object}
	 */
	getFormatsData() {
		return this.get('formats-data.js');
	}

	/**
	 * Gets the Pokemon Learnsets
	 * @returns {Object}
	 */
	getLearnsets() {
		return this.get('learnsets.js');
	}

	/**
	 * Gets an url from the web-cache or
	 * download it if it is not in the cache
	 * @param {String} url - The requested url
	 * @param {function(String, Error)} callback
	 */
	wget(url, callback, customCache) {
		this.cache.sweep();
		if (customCache && customCache.has(url)) {
			return callback(customCache.get(url));
		} else if (this.cache.has(url)) {
			let cache = this.cache.get(url);
			if (cache) {
				return callback(cache.data);
			} else {
				wget(url, callback);
			}
		} else {
			wget(url, callback);
		}
	}

	/**
	 * Gets the marks of an existing url in the cache
	 * @param {String} url - An url existing in the cache
	 * @returns {Object} Cache marks
	 */
	getCacheMarks(url) {
		this.cache.sweep();
		return this.cache.getMarks(url);
	}

	/**
	 * Caches an url
	 * @param {String} url - Url to add
	 * @param {String} data - Downloaded data corresponding to the url
	 * @param {Number} expires - Duration of the cache (in miliseconds)
	 * @param {Object} marks - Optional, an Object with flags
	 */
	cacheUrl(url, data, expires, marks) {
		this.cache.cache(url, data, expires, marks);
	}

	/**
	 * Removes an url fro the cache
	 * @param {String} url - Url to remove
	 */
	uncacheUrl(url) {
		this.cache.uncache(url);
		this.cache.write();
	}

	/* Private methods */

	nextDownload() {
		this.cur++;
		if (this.cur < 0 || this.cur >= Showdown_Data.length) {
			this.downloading = false;
			this.events.emit('update');
			return;
		}
		wget(Showdown_Data[this.cur].url, function (data, err) {
			if (err) {
				this.events.emit('msg', "Error: Failed to download " + Showdown_Data[this.cur].url + " | (" + err.code + ") " + err.messaage);
				return;
			}
			FileSystem.writeFile(Path.resolve(this.path, Showdown_Data[this.cur].file), data, function (err2) {
				if (err2) {
					this.events.emit('msg', "Error (" + err2.code + ") " + err2.messaage);
				} else {
					Data_Cache.delete(Showdown_Data[this.cur].file);
					this.events.emit('msg', "Updated data file " + Showdown_Data[this.cur].file + " from " + Showdown_Data[this.cur].url);
				}
				this.nextDownload();
			}.bind(this));
		}.bind(this), true);
	}
}

module.exports = DataManager;
