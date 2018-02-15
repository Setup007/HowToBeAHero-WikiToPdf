'use strict';

var inherits = require('util').inherits;
var events = require('events');
var assert = require('assert');
var constants = require('./constants');
var Contact = require('./contact');
var Message = require('./message');
var Logger = require('./logger');

/**
 * Represents an RPC interface
 * @constructor
 * @param {Contact} contact - Your node's contact information
 * @param {Object} options
 * @param {Contact} options.replyto - Optional alternate public contact
 * @param {Logger} options.logger - Logger instance to use
 */
function RPC(contact, options) {
  assert(this instanceof RPC, 'Invalid instance supplied');
  assert(contact instanceof Contact, 'Invalid contact was supplied');

  events.EventEmitter.call(this);

  options = options || {};

  if (options.replyto) {
    assert(options.replyto instanceof Contact, 'Invalid contact was supplied');
  }

  this._hooks = {};
  this._pendingCalls = {};
  this._contact = options.replyto || contact;
  this._log = (options && options.logger) || new Logger(0);

  this.open();
}

inherits(RPC, events.EventEmitter);

/**
 * Open the underlying transport
 * @emits RPC#ready
 */
RPC.prototype.open = function() {
  var self = this;

  self._trigger('before:open', [], function() {
    self._open(function(err) {
      if (err) {
        self.emit('error', err);
      } else {
        self.emit('ready');
        self._trigger('after:open');
      }
    });

    self._expirator = setInterval(
      self._expireCalls.bind(self),
      constants.T_RESPONSETIMEOUT + 5
    );
  });
};

/**
 * Close the underlying transport
 */
RPC.prototype.close = function() {
  var self = this;

  self._trigger('before:close', [], function() {
    self._close();
    self._trigger('after:close');
    clearInterval(self._expirator);
  });
};

/**
 * Send a RPC to the given contact
 * @param {Contact} contact - Delivery target for message
 * @param {Message} message - Message to send to target
 * @param {Function} callback
 */
RPC.prototype.send = function(contact, message, callback) {
  var self = this;

  contact = this._createContact(contact);

  assert(contact instanceof Contact, 'Invalid contact supplied');
  assert(message instanceof Message, 'Invalid message supplied');

  if (Message.isRequest(message)) {
    this._log.info('sending %s message to %j', message.method, contact);
  } else {
    this._log.info('replying to message to %s', message.id);
  }

  this._trigger('before:serialize', [message], function() {
    var serialized = message.serialize();

    self._trigger('after:serialize');
    self._trigger('before:send', [serialized, contact], function() {
      if (Message.isRequest(message) && typeof callback === 'function') {
        self._log.debug('queuing callback for reponse to %s', message.id);

        self._pendingCalls[message.id] = {
          timestamp: Date.now(),
          callback: callback
        };
      } else {
        self._log.debug('not waiting on callback for message %s', message.id);
      }

      self._send(message.serialize(), contact);
      self._trigger('after:send');
    });
  });
};

/**
 * Handle incoming messages
 * @param {Buffer} buffer
 */
RPC.prototype.receive = function(buffer, info) {
  var self = this;
  this._trigger('before:deserialize', [buffer], function() {
      try {
        return self._doReceive(buffer, info);
      } catch (err) {
        self._log.error('failed to handle message, reason: %s', err.message);
        return self.emit('MESSAGE_DROP', buffer, info);
      }
  });
};

/**
 * Handle incoming messages, body. This is moved out of the try/catch, so that
 * V8 can JIT this function.
 */
RPC.prototype._doReceive = function(buffer, info) {
  var self = this;
  var message = Message.fromBuffer(buffer);
  self._trigger('after:deserialize');
  var contact;
  if (Message.isRequest(message)) {
    contact = self._createContact(message.params.contact);
  } else {
    contact = self._createContact(message.result.contact);
  }
  self._trigger('before:receive', [message, contact], function() {
    self._execPendingCallback(message, contact);
  });
};

/**
 * Registers a "before" hook
 * @param {String} event - Name of the event to catch
 * @param {Function} handler - Event handler to register
 */
RPC.prototype.before = function(event, handler) {
  return this._register('before', event, handler);
};

/**
 * Registers an "after" hook
 * @param {String} event - Name of the event to catch
 * @param {Function} handler - Event handler to register
 */
RPC.prototype.after = function(event, handler) {
  return this._register('after', event, handler);
};

/**
 * Registers a middleware or "hook" in a set
 * @private
 * @param {String} time - One of "before" or "after"
 * @param {String} event - Name of the event to catch
 * @param {Function} handler - Event handler to register
 */
RPC.prototype._register = function(time, event, handler) {
  if (time !== 'before' && time !== 'after') {
      throw new Error('Invalid hook');
  }
  assert(typeof event === 'string', 'Invalid event supplied');
  assert(typeof handler === 'function', 'Invalid handler supplied');

  // Set up the real trigger callback now that we are going to have a hook.
  this._trigger = this._realTrigger;

  var name = time + ':' + event;
  if (!this._hooks[name]) {
    this._hooks[name] = [];
  }

  this._hooks[name].push(handler);

  return this;
};

/**
 * Fast path, used until some hooks are registered.
 */
RPC.prototype._trigger = function(name, args, complete) {
    return complete && complete();
};

/**
 * Triggers a middleware or "hook" set
 * @private
 * @param {String} event -  Name of the event to trigger
 * @param {Array} args - Arguments to pass to event handlers
 * @param {Function} callback - Fired after all events are triggered
 */
RPC.prototype._realTrigger = function(name, args, complete) {
  var self = this;

  if (!this._hooks[name]) {
    return complete && complete();
  }


  var stack = this._hooks[name];
  var i = 0;
  function next(err) {
    if (err) {
      return self.emit('error', err);
    }
    if (i < stack.length) {
      var fn = stack[i];
      fn.apply(self, args);
      i++;
    } else {
      return complete && complete();
    }
  }

  args = args.concat([next]);
  stack[0].apply(self, args);
};

/**
 * Create a contact object from the supplied contact information
 * @private
 * @param {Object} options
 */
RPC.prototype._createContact = function(options) {
  return new this._contact.constructor(options);
};

/**
 * Executes the pending callback for a given message
 * @private
 * @param {Message} message - Message to handle any callbacks for
 * @param {Contact} contact - Contact who sent the message
 */
RPC.prototype._execPendingCallback = function(message, contact) {
  var pendingCall = this._pendingCalls[message.id];

  this._log.debug('checking pending rpc callback stack for %s', message.id);

  if (Message.isResponse(message) && pendingCall) {
    pendingCall.callback(null, message);
    delete this._pendingCalls[message.id];
  } else if (Message.isRequest(message)) {
    assert(
      constants.MESSAGE_TYPES.indexOf(message.method) !== -1,
      'Message references invalid method "' + message.method + '"'
    );
    this.emit('CONTACT_SEEN', contact);
    this.emit(message.method, message);
  } else {
    this._log.warn('dropping received late response to %s', message.id);
  }

  this._trigger('after:receive', []);
};

/**
 * Expire RPCs that have not received a reply
 * @private
 */
RPC.prototype._expireCalls = function() {
  this._log.debug('checking pending rpc callbacks for expirations');

  for (var rpcID in this._pendingCalls) {
    var pendingCall = this._pendingCalls[rpcID];
    var timePassed = Date.now() - pendingCall.timestamp;

    if (timePassed > constants.T_RESPONSETIMEOUT) {
      this._log.warn('rpc call %s timed out', rpcID);
      pendingCall.callback(new Error('RPC with ID `' + rpcID + '` timed out'));
      delete this._pendingCalls[rpcID];
    }
  }
};

/**
 * Unimplemented stub, called on close()
 * @abstract
 */
/* istanbul ignore next */
RPC.prototype._close = function() {};

/**
 * Unimplemented stub, called on send()
 * @abstract
 * @param {Buffer} data
 * @param {Contact} contact
 */
/* istanbul ignore next */
RPC.prototype._send = function() {};

/**
 * Unimplemented stub, called on constructor
 * @abstract
 * @param {Function} done - callback
 */
RPC.prototype._open = function(done) {
  setImmediate(done);
};

module.exports = RPC;
