# Passwordless-RethinkDBStore

This module provides token storage for [Passwordless](https://github.com/florianheinemann/passwordless), a node.js module for express that allows website authentication without password using verification through email or other means. Visit the project's [website](https://passwordless.net) for more details.

Tokens are stored in a RethinkDB database and are hashed and salted using [bcrypt](https://github.com/ncb000gt/node.bcrypt.js/).

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
new RethinkDBStore([options]);
```
* **[options]:** *(Object)* Optional. This can include options of the node.js RethinkDB client as described in the [docs](http://www.rethinkdb.com/api/javascript/#connect).

## Hash and salt
As the tokens are equivalent to passwords (even though only for a limited time) they have to be protected in the same way. passwordless-rethinkdbstore uses [bcrypt](https://github.com/ncb000gt/node.bcrypt.js/) with automatically created random salts. To generate the salt 10 rounds are used.

## Tests

`$ npm test`

## License

[MIT License](http://opensource.org/licenses/MIT)

## Author
River Grimm river.grimm@gmail.com
