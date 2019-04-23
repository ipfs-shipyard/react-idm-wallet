import React, { createContext, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import createObservable from './observable';

const IdmWalletContext = createContext();
const Provider = IdmWalletContext.Provider;

const IdmWalletProvider = ({ idmWallet, children }) => {
    // Create observable each time the `idmWallet` changes
    const providerValue = useMemo(() => ({
        idmWallet,
        observable: createObservable(idmWallet),
    }), [idmWallet]);

    // Cleanup observable on unmount, restoring `idmWallet` to its original state
    // if there are no other listeners (it might still be observed by others)
    useEffect(() => providerValue.observable.cleanup, [providerValue]);

    return (
        <Provider value={ providerValue }>
            { children }
        </Provider>
    );
};

IdmWalletProvider.propTypes = {
    idmWallet: PropTypes.object.isRequired,
    children: PropTypes.node,
};

IdmWalletContext.Provider = IdmWalletProvider;
IdmWalletContext.Consumer.Provider = IdmWalletProvider;

export default IdmWalletContext;
