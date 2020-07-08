/**
 * Pokemon stuff translator
 */

'use strict';

const Path = require('path');
const normalize = Tools('normalize');
const Text = Tools('text');

const Eng_Trans = require(Path.resolve(__dirname, 'english-pokemon-trans.js')).translations;
const Esp_Trans = require(Path.resolve(__dirname, 'spanish-pokemon-trans.js')).translations;
const Lat_Trans = require(Path.resolve(__dirname, 'lat-pokemon-trans.js')).translations;

const Translations = {en: Eng_Trans, es: Esp_Trans, lat: Lat_Trans};

function searchInLanguage(lang, word, keys) {
	let translationTemp;
	let results = [];
	let maxLd = 3;
	let ld;

	if (word.length <= 1) {
		return null;
	} else if (word.length <= 4) {
		maxLd = 1;
	} else if (word.length <= 6) {
		maxLd = 2;
	}

	if (!Translations[lang]) return null;

	for (let i = 0; i < keys.length; i++) {
		if (!Translations[lang][keys[i]]) continue;
		for (let k in Translations[lang][keys[i]]) {
			translationTemp = Translations[lang][keys[i]][k];
			if (!translationTemp) continue;
			if (typeof translationTemp === "string") {
				ld = Text.levenshtein(word, normalize(translationTemp), maxLd);
				if (ld <= maxLd) {
					results.push({type: keys[i], id: k, title: translationTemp, ld: ld});
				}
			} else if (typeof translationTemp === "object" && typeof translationTemp.length) {
				for (let j = 0; j < translationTemp.length; j++) {
					ld = Text.levenshtein(word, normalize(translationTemp[j]), maxLd);
					if (ld <= maxLd) {
						results.push({type: keys[i], id: k, title: translationTemp[j], ld: ld});
					}
				}
			}
		}
	}

	let currLd = 10;
	for (let i = 0; i < results.length; i++) {
		if (results[i].ld < currLd) {
			currLd = results[i].ld;
		}
	}

	if (currLd === 10) return [];

	let newResults = [];
	for (let i = 0; i < results.length; i++) {
		if (currLd === results[i].ld) {
			results[i].ld = currLd;
			newResults.push(results[i]);
		}
	}
	return newResults;
}

function getTranslations(from, to, word) {
	word = normalize(word);
	let results = [];
	let toLangData = Translations[to];
	if (!toLangData) return null;
	let ids = searchInLanguage(from, word, Object.keys(Translations[to]));
	if (!ids || !ids.length) return null;
	let type, id;
	for (let i = 0; i < ids.length; i++) {
		id = ids[i].id;
		type = ids[i].type;
		if (!toLangData[type] || !toLangData[type][id]) continue;
		results.push({type: type, from: ids[i].title, to: toLangData[type][id], ld: ids[i].ld});
	}
	return results;
}

getTranslations.supportedLanguages = Translations;

module.exports = getTranslations;
