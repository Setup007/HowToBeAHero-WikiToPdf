'use strict';

var AddressPortContact = require('../contacts/address-port-contact');
var Message = require('../message');
var inherits = require('util').inherits;
var assert = require('assert');
var dgram = require('dgram');
var RPC = require('../rpc');
var msgpack = require('msgpack5')();

/**
 * Represents an UDP transport for RPC
 * @constructor
 * @extends {RPC}
 * @param {Contact} contact - Your node's contact instance
 * @param {Object} options
 */
function UDPTransport(contact, options) {
  if (!(this instanceof UDPTransport)) {
    return new UDPTransport(contact, options);
  }

  assert(contact instanceof AddressPortContact, 'Invalid contact supplied');
  RPC.call(this, contact, options);
}

inherits(UDPTransport, RPC);

UDPTransport.MAX_MESSAGE_SIZE = 512; // bytes

/**
 * Create a UDP socket
 * @private
 * @param {function} done
 */
UDPTransport.prototype._open = function(done) {
  var self = this;

  function createSocket(address, port) {
    self._socket = dgram.createSocket(
      { type: 'udp4', reuseAddr: false },
      self._receive.bind(self)
    );

    self._socket.on('listening', function() {
        done();
        done = null;
    });

    self._socket.on('error', function(err) {
      if (done) {
        done(err);
        done = null;
      }
    });

    self._socket.bind(port, address);
  }

  createSocket(self._contact.address, self._contact.port);
};

/**
 * Send a RPC to the given contact (encode with msgpack before sending)
 * @private
 * @param {Buffer} data
 * @param {Contact} contact
 */
UDPTransport.prototype._send = function(buffer, contact) {
  /* istanbul ignore if */
  if (buffer.length > UDPTransport.MAX_MESSAGE_SIZE) {
    this._log.warn(
      'outbound message greater than %sb (%sb) and risks fragmentation',
      UDPTransport.MAX_MESSAGE_SIZE,
      buffer.length
    );
  }

  this._socket.send(buffer, 0, buffer.length, contact.port, contact.address);
};

/**
 * Decode messages with msgpack before receiving
 * @private
 * @param {Buffer} data
 * @param {Contact} contact
 */
UDPTransport.prototype._receive = function(buffer) {
  this.receive(buffer);
};

/**
 * Close the underlying socket
 * @private
 */
UDPTransport.prototype._close = function() {
  this._socket.close();
};

module.exports = UDPTransport;
