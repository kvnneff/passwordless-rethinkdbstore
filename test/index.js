'use strict';
var RethinkDBStore = require('../');
var r = require('rethinkdb');
var TokenStore = require('passwordless-tokenstore');
var standardTests = require('passwordless-tokenstore-test');
var expect = require('chai').expect;
var uuid = require('node-uuid');
var TokenStoreFactory;
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

standardTests(TokenStoreFactory, beforeEachTest, afterEachTest);

describe('RethinkDB Specific Tests', function() {
    beforeEach(function(done) {
        beforeEachTest(done);
    })

    afterEach(function(done) {
        afterEachTest(done);
    })
    
    it('should gracefully handle undefined originUrl values', function (done) {
        var store = TokenStoreFactory();
        var uid = "example@example.org";
        var token = uuid.v4();
        var ttl = 1000*60;
        var origin;
        
        store.storeOrUpdate(token, uid, 1000*60, origin, function() {
							expect(arguments.length).to.equal(0);
              done();
        });
    });
})
