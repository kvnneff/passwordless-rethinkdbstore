'use strict';
var RethinkDBStore = require('../');
var r = require('rethinkdb');
var TokenStore = require('passwordless-tokenstore');
var standardTests = require('passwordless-tokenstore-test');
var TokenStoreFactory;
var connection;

var options = {
    host: 'localhost',
    port: 28015,
    db: 'test'
};

var beforeEachTest = function (done) {
    r.connect(options, function (err, connection) {
        r.table('pwdless').delete().run(connection, function (err) {
            done(err);
        });
    });
};

var afterEachTest = function (done) {
    return done();
};

TokenStoreFactory = function TokenStoreFactory() {
    return new RethinkDBStore(options);
};

standardTests(TokenStoreFactory, beforeEachTest, afterEachTest);