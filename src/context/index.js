import React, { createContext } from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import IdmWalletProviderSync from './provider-sync';
import IdmWalletProviderAsync from './provider-async';

const IdmWalletContext = createContext();
const Provider = IdmWalletContext.Provider;

const IdmWalletProvider = ({ createIdmWallet, idmWallet, ...rest }) => {
    invariant(
        (idmWallet && !createIdmWallet) || (!idmWallet && createIdmWallet),
        'The idmWallet and createIdmWallet props are mutually exclusive and at least one must be provided'
    );

    if (idmWallet) {
        return <IdmWalletProviderSync idmWallet={ idmWallet } provider={ Provider } { ...rest } />;
    }

    return <IdmWalletProviderAsync createIdmWallet={ createIdmWallet } provider={ Provider } { ...rest } />;
};

IdmWalletProvider.propTypes = {
    idmWallet: PropTypes.object,
    createIdmWallet: PropTypes.func,
};

IdmWalletContext.Provider = IdmWalletProvider;
IdmWalletContext.Consumer.Provider = IdmWalletProvider;

export default IdmWalletContext;
