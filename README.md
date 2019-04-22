# react-idm-wallet

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][codecov-image]][codecov-url] [![Dependency status][david-dm-image]][david-dm-url] [![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url]

[npm-url]:https://npmjs.org/package/react-idm-wallet
[downloads-image]:http://img.shields.io/npm/dm/react-idm-wallet.svg
[npm-image]:http://img.shields.io/npm/v/react-idm-wallet.svg
[travis-url]:https://travis-ci.org/ipfs-shipyard/react-idm-wallet
[travis-image]:http://img.shields.io/travis/ipfs-shipyard/react-idm-wallet/master.svg
[codecov-url]:https://codecov.io/gh/ipfs-shipyard/react-idm-wallet
[codecov-image]:https://img.shields.io/codecov/c/github/ipfs-shipyard/react-idm-wallet/master.svg
[david-dm-url]:https://david-dm.org/ipfs-shipyard/react-idm-wallet
[david-dm-image]:https://img.shields.io/david/ipfs-shipyard/react-idm-wallet.svg
[david-dm-dev-url]:https://david-dm.org/ipfs-shipyard/react-idm-wallet?type=dev
[david-dm-dev-image]:https://img.shields.io/david/dev/ipfs-shipyard/react-idm-wallet.svg

React bindings for the [reference implementation](https://npmjs.org/package/idm-wallet) of the IDM Wallet in JavaScript.


## Installation

```sh
$ npm install react-idm-wallet idm-wallet
```

You must also install `idm-wallet` as this module has a peer-depedency on it.

This library is written in modern JavaScript and is published in both CommonJS and ES module transpiled variants. If you target older browsers please make sure to transpile accordingly.


## Usage

First, wrap your application in `<IdmWalletProvider>`:

```js
import React from 'react';
import ReactDOM from 'react-dom';
import createIdmWallet from 'idm-wallet';
import { IdmWalletProvider } from 'react-idm-wallet';

createIdmWallet()
.then(renderApp)
.catch((err) => console.error(err));

const renderApp = (idmWallet) => {
    ReactDOM.render(
        <IdmWalletProvider idmWallet={ idmWallet }>
            <App />
        </IdmWalletProvider>,
        document.getElementById('root')
    );
};
```

Then, you may use `connectIdmWallet` to connect a component to a IDM Wallet:

```js
// App.js
import React from 'react';
import { connectIdmWallet } from 'react-idm-wallet';

const App = ({ locked, onLock }) => (
    <div>
        <p>Locked: { locked }</p>
        <button onClick={ onLock }>Lock wallet</button>
    </div>
);

const createMapWalletToProps = (idmWallet) => {
    const onLocked = () => idmWallet.locker.lock();

    return () => {
        locked: idmWallet.locker.isLocked(),
        onLock,
    });
};

export connectIdmWallet(createMapWalletToProps)(App);
```


## API

- [`<IdmWalletProvider>`](#idmwalletprovider)
- [`connectIdmWallet(createMapWalletToProps, [options])`](#connectidmwalletcreatemapwallettoprops-options)

### IdmWalletProvider

The `<IdmWalletProvider>` makes a IDM Wallet available to any nested components that have been wrapped in the `connectIdmWallet()` function.

Since any React component in an app can be connected, most applications will render a <IdmWalletProvider> at the top level, with the entire app's component tree inside of it. You can't use a connected component unless it is nested inside of a `<IdmWalletProvider>`.

#### Props

##### idmWallet

Type: `object`

The single [idmWallet](https://npmjs.org/package/idm-wallet) instance to use in your app.

##### children

Type: `Node` (any React's node)

Any valid React node to render as the children.

### connectIdmWallet(createMapWalletToProps, [options])

The `connectIdmWallet()` function connects a React component to a IDM Wallet instance, by providing the connected component with the pieces of the data and functions it needs from the IDM Wallet.

It does not modify the component class passed to it; instead, it returns a new, connected component that wraps the component you passed in. Moreover, any ref will be automatically forwarded to the component you passed in.

#### createMapWalletToProps

Type: `function`

A factory that creates a function that maps any data or mutators from a IDM Wallet to props that will be passed to the wrapped component. **From now on**, we will call the factory and the returned function **`createMapWalletToProps`** and **`mapWalletToProps`** respectively.

```js
const createMapWalletToProps = (idmWallet) => (ownProps) => ({});
```

Your `createMapWalletToProps` will be called once per `idmWallet` instance, which usually does not change.

If your `mapWalletToProps` function is declared with `ownProps`, it will be called whenever any data on the IDM Wallet changes or when the wrapper component receives new props (based on shallow equality comparisons). On the other hand, if the function is declared without any parameter, it will be called only whenever any data on the IDM Wallet changes.

All calls to mutators of the `idmWallet` must be bound, so that the correct `this` is used. This means that you will often wrap mutators in functions to keep them bounded. For that reason, it's **important to declare them in the factory** to avoid creating new functions everytime `mapWalletToProps` runs, thus avoiding unwanted re-renders:

```js
// ❌ Incorrect: `onLock` prop will be new everytime
const createMapWalletToProps = (idmWallet) => (ownProps) => ({
    locked: idmWallet.locker.isLocked(),
    onLock: () => idmWallet.locker.lock(),
});

// ✅ Correct: `onLock` prop will have the same reference everytime
const createMapWalletToProps = (idmWallet) => {
    onLock = () => idmWallet.locker.lock();

    return (ownProps) => {
        locked: idmWallet.locker.isLocked(),
        onLock,
    };
});
```

#### options

##### options.pure

Type: `boolean`   
Default: `true`

Assumes that the wrapped component is a "pure" component and does not rely on any input or state other than its props and the mapped props from the IDM Wallet. Several equality checks are performed to avoid unnecessary calls to `mapWalletToProps` as well as to bail out on unnecessary renders.


## Tests

```sh
$ npm test
$ npm test -- --watch # during development
```


## License

Released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).