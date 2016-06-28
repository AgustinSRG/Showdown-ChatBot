/**
 * Pokemon Showdown Bot Data Manager
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
const Url = require('url');
const FileSystem = require('fs');

const WebCache = Tools.get('cache.js').WebCache;
const TempManager = Tools.get('temp.js');
const uncacheTree = Tools.get('uncachetree.js');
const checkDir = Tools.get('checkdir.js');

const Showdown_Data = [
	{
		url: "https://raw.githubusercontent.com/Zarel/Pokemon-Showdown/master/config/formats.js",
		file: "formats.js",
	},
	{
		url: "https://raw.githubusercontent.com/Zarel/Pokemon-Showdown/master/data/formats-data.js",
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
		url: "https://play.pokemonshowdown.com/data/learnsets-g6.js",
		file: "learnsets-g6.js",
	},
	{
		url: "https://play.pokemonshowdown.com/data/aliases.js",
		file: "aliases.js",
	},
];

/**
 * Web-Get
 * This function downloads a file and returns the data
 * via the callback
 *
 * @param url The requested url
 * @param callback Function (downloaded_data, error)
 */
function wget(url, callback) {
	url = Url.parse(url);
	let mod = url.protocol === 'https:' ? Https : Http;
	mod.get(url.href, response => {
		let data = '';
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

class DataManager {
	/**
	 * @param path An existing path to store the data
	 */
	constructor(path) {
		this.path = path;
		this.downloading = false;
		this.cur = -1;

		checkDir(Path.resolve(path, 'cache/'));
		this.cache = new WebCache(Path.resolve(path, 'cache/'));

		checkDir(Path.resolve(path, 'temp/'));
		this.temp = new TempManager(Path.resolve(path, 'temp/'), Temp_Size);
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
	 *
	 * @param file The requested file name
	 */
	get(file) {
		return require(Path.resolve(this.path, file));
	}

	/**
	 * Gets the Pokedex
	 */
	getPokedex() {
		return this.get('pokedex.js').BattlePokedex;
	}

	/**
	 * Gets the Moves
	 */
	getMoves() {
		return this.get('moves.js').BattleMovedex;
	}

	/**
	 * Gets the Items
	 */
	getItems() {
		return this.get('items.js').BattleItems;
	}

	/**
	 * Gets the Abilities
	 */
	getAbilities() {
		return this.get('abilities.js').BattleAbilities;
	}

	/**
	 * Gets the Aliases
	 */
	getAliases() {
		return this.get('aliases.js').BattleAliases;
	}

	/**
	 * Gets the Formats-Data
	 */
	getFormatsData() {
		return this.get('formats-data.js').BattleFormatsData;
	}

	/**
	 * Gets the Learnsets
	 */
	getLearnsets() {
		return this.get('learnsets-g6.js').BattleLearnsets;
	}

	/**
	 * Gets an url from the web-cache or
	 * download it if it is not in the cache
	 *
	 * @param url The requested url
	 * @param callback Function (dowloaded_data, error)
	 */
	wget(url, callback) {
		this.cache.sweep();
		if (this.cache.has(url)) {
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
	 *
	 * @param url An url existing in the cache
	 */
	getCacheMarks(url) {
		this.cache.sweep();
		return this.cache.getMarks(url);
	}

	/**
	 * Caches an url
	 *
	 * @param url Url to add
	 * @param data Downloaded data corresponding to the url
	 * @param expires Duration of the cache (in miliseconds)
	 * @param marks Optional, an Object with flags
	 */
	cacheUrl(url, data, expires, marks) {
		this.cache.cache(url, data, expires, marks);
	}

	/**
	 * Removes an url fro the cache
	 *
	 * @param url Url to remove
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
			return;
		}
		wget(Showdown_Data[this.cur].url, function (data, err) {
			if (err) {
				App.log("Error: Failed to download " + Showdown_Data[this.cur].url + " | (" + err.code + ") " + err.messaage);
				return;
			}
			FileSystem.writeFile(Path.resolve(this.path, Showdown_Data[this.cur].file), data, function (err2) {
				if (err2) {
					App.log("Error (" + err2.code + ") " + err2.messaage);
				} else {
					try {uncacheTree(Path.resolve(this.path, Showdown_Data[this.cur].file));} catch (e) {}
					App.log("Updated data file " + Showdown_Data[this.cur].file + " from " + Showdown_Data[this.cur].url);
				}
				this.nextDownload();
			}.bind(this));
		}.bind(this));
	}
}

module.exports = DataManager;
