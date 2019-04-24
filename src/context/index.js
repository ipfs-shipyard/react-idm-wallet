import React, { createContext } from 'react';
import PropTypes from 'prop-types';
import ExtraPropTypes from 'airbnb-prop-types';
import IdmWalletProviderSync from './provider-sync';
import IdmWalletProviderAsync from './provider-async';

const IdmWalletContext = createContext();
const Provider = IdmWalletContext.Provider;

const IdmWalletProvider = ({ createIdmWallet, idmWallet, ...rest }) => {
    if (idmWallet) {
        return <IdmWalletProviderSync idmWallet={ idmWallet } provider={ Provider } { ...rest } />;
    }

    return <IdmWalletProviderAsync createIdmWallet={ createIdmWallet } provider={ Provider } { ...rest } />;
};

IdmWalletProvider.propTypes = {
    idmWallet: ExtraPropTypes.mutuallyExclusiveProps(PropTypes.object, 'createIdmWallet').isRequired,
    createIdmWallet: ExtraPropTypes.mutuallyExclusiveProps(PropTypes.func, 'idmWallet').isRequired,
};

IdmWalletContext.Provider = IdmWalletProvider;
IdmWalletContext.Consumer.Provider = IdmWalletProvider;

export default IdmWalletContext;
