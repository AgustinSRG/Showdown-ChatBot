/**
 * Event Emmiter tools
 */

'use strict';

const util = require('util');

let EventEmitter = require('events').EventEmitter;

function MyEmitter() {
	EventEmitter.call(this);
}

util.inherits(MyEmitter, EventEmitter);

module.exports = MyEmitter;
