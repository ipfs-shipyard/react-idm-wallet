import React, { createContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import makeReactive from './reactive';

const IdmWalletContext = createContext();
const Provider = IdmWalletContext.Provider;

const createProviderValue = (idmWallet) => {
    const subscribers = new Set();
    const subscribe = (fn) => {
        subscribers.add(fn);

        return () => subscribers.delete(fn);
    };

    makeReactive(idmWallet, () => {
        subscribers.forEach((fn) => fn());
    });

    return {
        idmWallet,
        subscribe,
    };
};

const IdmWalletProvider = ({ idmWallet, children }) => {
    // Recreate the provider value whenever the `idmWallet` changes
    const providerValue = useMemo(
        () => createProviderValue(idmWallet),
        [idmWallet]
    );

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
