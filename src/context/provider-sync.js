import React, { useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import createObservable from '../observable';

const IdmWalletProviderSync = ({ idmWallet, provider: Provider, children }) => {
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

IdmWalletProviderSync.propTypes = {
    idmWallet: PropTypes.object.isRequired,
    provider: PropTypes.elementType.isRequired,
    children: PropTypes.node,
};

export default IdmWalletProviderSync;
