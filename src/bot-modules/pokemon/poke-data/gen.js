/**
 * Gets the generation of a Pokemon, item, move or ability
 */

'use strict';

const Text = Tools('text');

function getGeneration(name, App) {
	let id = Text.toId(name);
	let pokedex = App.data.getPokedex();
	let movedex = App.data.getMoves();
	let items = App.data.getItems();
	let abilities = App.data.getAbilities();
	if (id === 'metronome') {
		return {gen: 'metronome'};
	} else if (pokedex[id]) {
		if (pokedex[id].num < 0) return {gen: 'CAP', name: pokedex[id].name};
		else if (pokedex[id].num <= 151) return {gen: 1, name: pokedex[id].name};
		else if (pokedex[id].num <= 251) return {gen: 2, name: pokedex[id].name};
		else if (pokedex[id].num <= 386) return {gen: 3, name: pokedex[id].name};
		else if (pokedex[id].num <= 493) return {gen: 4, name: pokedex[id].name};
		else if (pokedex[id].num <= 649) return {gen: 5, name: pokedex[id].name};
		else if (pokedex[id].num <= 721) return {gen: 6, name: pokedex[id].name};
		else if (pokedex[id].num <= 809) return {gen: 7, name: pokedex[id].name};
		else return {gen: 8, name: pokedex[id].name};
	} else if (movedex[id]) {
		if (!movedex[id].num) return {gen: 'CAP', name: movedex[id].name};
		else if (movedex[id].num <= 165) return {gen: 1, name: movedex[id].name};
		else if (movedex[id].num <= 251) return {gen: 2, name: movedex[id].name};
		else if (movedex[id].num <= 354) return {gen: 3, name: movedex[id].name};
		else if (movedex[id].num <= 467) return {gen: 4, name: movedex[id].name};
		else if (movedex[id].num <= 559) return {gen: 5, name: movedex[id].name};
		else if (movedex[id].num <= 621) return {gen: 6, name: movedex[id].name};
		else if (movedex[id].num <= 742) return {gen: 7, name: movedex[id].name};
		else return {gen: 8, name: movedex[id].name};
	} else if (abilities[id]) {
		if (abilities[id].num <= 0) return {gen: 'CAP', name: abilities[id].name};
		else if (abilities[id].num <= 76) return {gen: 3, name: abilities[id].name};
		else if (abilities[id].num <= 123) return {gen: 4, name: abilities[id].name};
		else if (abilities[id].num <= 164) return {gen: 5, name: abilities[id].name};
		else if (abilities[id].num <= 191) return {gen: 6, name: abilities[id].name};
		else if (abilities[id].num <= 233) return {gen: 7, name: abilities[id].name};
		else return {gen: 8, name: abilities[id].name};
	} else if (items[id]) {
		return {gen: items[id].gen, name: items[id].name};
	} else {
		return {gen: 0};
	}
}

module.exports = getGeneration;
