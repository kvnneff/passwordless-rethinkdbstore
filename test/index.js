'use strict';
var RethinkDBStore = require('../');
var r = require('rethinkdb');
var TokenStore = require('passwordless-tokenstore');
var standardTests = require('passwordless-tokenstore-test');
var expect = require('chai').expect;
var uuid = require('node-uuid');
var argon2 = require('argon2');
var TokenStoreFactory;
var TokenStoreFactoryCustomHashLib;
var connection;

var options = {
    host: 'localhost',
    port: 28015,
    db: 'test'
};

var beforeEachTest = function (done) {
    r.connect(options, function (err, connection) {
        r.db('test').tableList().run(connection, function(err, res) {
            if (res.indexOf('pwdless') == -1) {
                r.db('test').tableCreate('pwdless').run(connection, function (err) {
                    return done(err);
                });
            }
            else {
                return done(err);
            }
        });
    });
};

var afterEachTest = function (done) {
    return done();
};

TokenStoreFactory = function TokenStoreFactory() {
    return new RethinkDBStore(options);
};

TokenStoreFactoryCustomHashLib = function TokenStoreFactoryCustomHashLib(hashAndVerifyFn) {
    return new RethinkDBStore(options, hashAndVerifyFn);
}

standardTests(TokenStoreFactory, beforeEachTest, afterEachTest);

describe('RethinkDB Specific Tests', function() {
    beforeEach(function(done) {
        beforeEachTest(done);
    })

    afterEach(function(done) {
        afterEachTest(done);
    })

    var handleUndefinedOrigin = function (tokenStoreFactory, done) {
        var store = tokenStoreFactory();
        var uid = "example@example.org";
        var token = uuid.v4();
        var ttl = 1000*60;
        var origin;

        store.storeOrUpdate(token, uid, 1000*60, origin, function() {
							expect(arguments.length).to.equal(0);
              done();
        });
    }

    it('should gracefully handle undefined originUrl values', function (done) {
        handleUndefinedOrigin(TokenStoreFactory, done);
    });

    /*
    * This runs all the tests with a custom hashing library.
    */
    describe('RethinkDB specific tests with custom hashing library', function() {
        var initStore = function() {
            // store must be a function with no args; thats why we bind to the first arg
            return TokenStoreFactoryCustomHashLib.bind(null, {
                hash: function(token, cb) {
                    argon2.generateSalt()
                        .then(function(salt) {
                            argon2.hash(token, salt)
                            .then(cb.bind(null, null)) // signature for then-cb is (err, hashedToken)
                            .catch(cb);
                        });
                },
                verify: function(token, hashedToken, cb) {
                    argon2.verify(hashedToken, token)
                        .then(function(match) {
                            if (match) {
                                return cb(null, match);
                            }
                            else {
                                return cb();
                            }
                        })
                        .catch(cb);
                }
            });
        };

        it('should work with custom hashing library', function() {
            var store = initStore();
            standardTests(store, beforeEachTest, afterEachTest);
        });

        it('should gracefully handle undefined originUrl values', function (done) {
            handleUndefinedOrigin(initStore(), done);
        });
    });
})
