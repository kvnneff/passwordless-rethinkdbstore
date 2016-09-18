'use strict';
var util = require('util');
var bcrypt = require('bcrypt');
var TokenStore = require('passwordless-tokenstore');
var r = require('rethinkdb');

/**
 * RethinkDBStore constructor
 * @param {Object} options RethinkDB options
 * @param {Object} hashLib Hash and verify function for the token
 */
function RethinkDBStore(options, hashLib) {
    this.options = options || {};
    this.hashLib = hashLib || {
        hash: function(token, cb) {
            bcrypt.hash(token, 10, cb);
        },
        verify: function(token, hashedToken, cb) {
            bcrypt.compare(token, hashedToken, cb);
        }
    };
    TokenStore.call(this);
    this.connection = null;
};

util.inherits(RethinkDBStore, TokenStore);

/**
 * Open a connection to RethinkDB and create `pwdless`
 * table if it doesn't exist
 * @param  {Function} callback
 * @return {Connection}
 */
RethinkDBStore.prototype.getConnection = function getConnection(callback) {
    var self = this;
    if (this.connection) return callback(this.connection);
    r.connect(this.options, function (err, connection) {
        if (err) throw err;
        self.connection = connection;
        r.tableList().run(self.connection, function (err, list) {
            if (!list.length || list.indexOf('pwdless') == -1) {
                r.tableCreate('pwdless').run(connection, function (err, res) {
                    if (err) throw err;
                    return callback(connection);
                });
            }
            return callback(connection);
        });
    });
};

/**
 * Checks if the provided token / user id combination exists and is
 * valid in terms of time-to-live. If yes, the method provides the
 * the stored referrer URL if any.
 * @param  {String}   token to be authenticated
 * @param  {String}   uid Unique identifier of an user
 * @param  {Function} callback in the format (error, valid, referrer).
 * In case of error, error will provide details, valid will be false and
 * referrer will be null. If the token / uid combination was not found
 * found, valid will be false and all else null. Otherwise, valid will
 * be true, referrer will (if provided when the token was stored) the
 * original URL requested and error will be null.
 */
RethinkDBStore.prototype.authenticate = function authenticate(token, uid, callback) {
    if(!token || !uid || !callback) {
        throw new Error('TokenStore:authenticate called with invalid parameters');
    }
    var hashLib = this.hashLib;
    this.getConnection(function (conn) {
        r.table('pwdless').get(uid).run(conn, function (err, doc) {
            if (err) return callback(err, false, null);
            if (doc == null || doc.ttl < Date.now()) return callback(null, false, null);
            hashLib.verify(token, doc.hashedToken, function (err, res) {
                if (err) return callback(err, false, null);
                if (res) return callback(null, true, doc.originUrl);
                return callback(null, false, null);
            });
        });
    });
};

/**
 * Stores a new token / user ID combination or updates the token of an
 * existing user ID if that ID already exists. Hence, a user can only
 * have one valid token at a time
 * @param  {String}   token Token that allows authentication of _uid_
 * @param  {String}   uid Unique identifier of an user
 * @param  {Number}   msToLive Validity of the token in ms
 * @param  {String}   originUrl Originally requested URL or null
 * @param  {Function} callback Called with callback(error) in case of an
 * error or as callback() if the token was successully stored / updated
 */
RethinkDBStore.prototype.storeOrUpdate = function(token, uid, msToLive, originUrl, callback) {
    if(!token || !uid || !msToLive || !callback || !isNumber(msToLive)) {
        throw new Error('TokenStore:storeOrUpdate called with invalid parameters');
    }

    var hashLib = this.hashLib;
    this.getConnection(function (conn) {
        hashLib.hash(token, function (err, hashedToken) {
            if (err) return callback(err);
            var newRecord = {
                id: uid,
                hashedToken: hashedToken,
                ttl: Date.now() + msToLive,
                originUrl: originUrl || ''
            };
            r.table('pwdless').get(uid).run(conn, function (err, doc) {
                if (err) return callback(err);
                if (doc == null) {
                    r.table('pwdless').insert(newRecord).run(conn, function (err, doc) {
                        if (err) return callback(err);
                        return callback();
                    });
                } else {
                    r.table('pwdless').get(uid).update(newRecord).run(conn, function (err, res) {
                        if (err) return callback(err);
                        return callback();
                    });
                }
            });
        });
    });
};

/**
 * Invalidates and removes a user and the linked token
 * @param  {String}   user ID
 * @param  {Function} callback called with callback(error) in case of an
 * error or as callback() if the uid was successully invalidated
 */
RethinkDBStore.prototype.invalidateUser = function(uid, callback) {
    if(!uid || !callback) {
        throw new Error('TokenStore:invalidateUser called with invalid parameters');
    }

    this.getConnection(function (conn) {
        r.table('pwdless').get(uid).run(conn, function (err, doc) {
            if (err) return callback();
            r.table('pwdless').get(uid).delete().run(conn, function (err) {
                return callback();
            });
        });
    });
};

/**
 * Removes and invalidates all token
 * @param  {Function} callback Called with callback(error) in case of an
 * error or as callback() otherwise
 */
RethinkDBStore.prototype.clear = function(callback) {
    if(!callback) {
        throw new Error('TokenStore:clear called with invalid parameters');
    }
    var self = this;
    this.getConnection(function (conn) {
        r.table('pwdless').delete().run(conn);
        self.connection = null;
        callback();
    });
};

/**
 * Number of tokens stored (no matter the validity)
 * @param  {Function} callback Called with callback(null, count) in case
 * of success or with callback(error) in case of an error
 */
RethinkDBStore.prototype.length = function(callback) {
    if(!callback) {
        throw new Error('TokenStore:length called with invalid parameters');
    }
    this.getConnection(function (conn) {
        r.table('pwdless').count().run(conn, function (err, count) {
            if (err) return callback(err);
            return callback(null, count);
        });
    });
};

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
};

module.exports = RethinkDBStore;
