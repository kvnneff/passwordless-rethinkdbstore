# Passwordless-RethinkDBStore [![Travis](https://travis-ci.org/kvnneff/passwordless-rethinkdbstore.svg?branch=master)](https://travis-ci.org/kvnneff/passwordless-rethinkdbstore)

This module provides token storage for [Passwordless](https://github.com/florianheinemann/passwordless), a node.js module for express that allows website authentication without password using verification through email or other means. Visit the project's [website](https://passwordless.net) for more details.

Tokens are stored in a RethinkDB database and are hashed and salted using [bcrypt](https://github.com/ncb000gt/node.bcrypt.js/) by default. It is also possible to provide a different hashing library (see [Initialization](#initialization) for an example).

## Usage

First, install the module:

`$ npm install passwordless-rethinkdbstore --save`

Afterwards, follow the guide for [Passwordless](https://github.com/florianheinemann/passwordless). A typical implementation may look like this:

```javascript
var passwordless = require('passwordless');
var RethinkDBStore = require('passwordless-rethinkdbstore');

passwordless.init(new RethinkDBStore({host: '127.0.0.1', port: 28015, db: 'main'}));

passwordless.addDelivery(
    function(tokenToSend, uidToSend, recipient, callback) {
        // Send out a token
    });

app.use(passwordless.sessionSupport());
app.use(passwordless.acceptToken());
```

## Initialization

```javascript
new RethinkDBStore([options], [hashLib]);
```
* **[options]:** *(Object)* Optional. This can include options of the node.js RethinkDB client as described in the [docs](http://www.rethinkdb.com/api/javascript/#connect).
* **[hashLib]** *(Object)* Optional. This can be specified in order to provide a custom hashing library. This object takes two functions: `hash(token, cb)` and `verify(token, hashedToken, cb)`. The following example uses the hashing library [Argon2](https://github.com/ranisalt/node-argon2).
```javascript
var argon2 = require('argon2');
var store = new RethinkDBStore([options], {
    hash: function(token, cb) {
        argon2.generateSalt()
            .then(function(salt) {
                argon2.hash(token, salt)
                .then(cb.bind(null, null))
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
```

## Hash and salt
As the tokens are equivalent to passwords (even though only for a limited time) they have to be protected in the same way. By default passwordless-rethinkdbstore uses [bcrypt](https://github.com/ncb000gt/node.bcrypt.js/) with automatically created random salts. To generate the salt 10 rounds are used. Alternatively, a custom `hash` and `verify` function can be specified (see [Initialization](#initialization)), which should call the respective functions of some secure hashing library (e.g. [Argon2](https://github.com/ranisalt/node-argon2), winner of the [Password Hashing Competition](https://password-hashing.net) 2015).

## Tests

`$ npm test`

## License

[MIT License](http://opensource.org/licenses/MIT)

## Author
River Grimm river.grimm@gmail.com
