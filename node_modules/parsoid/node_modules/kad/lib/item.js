'use strict';

var assert = require('assert');
var utils = require('./utils');

/**
 * Storage model for DHT items, which is serialized to JSON before being passed
 * to the storage adapter
 * @constructor
 * @param {String} key - Lookup key
 * @param {String} value - Stored value
 * @param {String} publisher - Original publisher's nodeID
 * @param {Number} timestamp - Optional UNIX timestamp of original publication
 */
function Item(key, value, publisher, timestamp) {
  if (!(this instanceof Item)) {
    return new Item(key, value, publisher, timestamp);
  }

  if (typeof key !== 'string') {
      throw new Error('Invalid key supplied');
  }
  //assert(typeof value === 'string', 'Value must be a string');
  if (!utils.isValidKey(publisher)) {
      throw new Error('Invalid publisher nodeID supplied');
  }

  if (timestamp) {
    assert(typeof timestamp === 'number', 'Invalid timestamp supplied');
    assert(Date.now() >= timestamp, 'Timestamp cannot be in the future');
  }

  this.key = key;
  this.value = value;
  this.publisher = publisher;
  this.timestamp = timestamp || Date.now();
}

module.exports = Item;
