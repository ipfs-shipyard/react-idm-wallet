import assert from 'assert';
import connectIdmWallet from '../../src/connect';
import { forwardRef } from 'react';

export const spiedConnectIdmWallet = (...args) => {
    const withConnect = connectIdmWallet(...args);

    return (WrappedComponent) => {
        const Connect = withConnect(WrappedComponent);

        Connect.render = jest.fn(Connect.render);

        return Connect;
    };
};

export const spiedForwardRef = (Component) => {
    const Forwarded = forwardRef(Component);

    Forwarded.render = jest.fn(Forwarded.render);

    return Forwarded;
};

export const spyOnCreateMapWalletToProps = (createMapWalletToProps) => {
    const spiedCreateMapWalletToProps = jest.fn((idmWallet) => jest.fn(createMapWalletToProps(idmWallet)));
    const results = spiedCreateMapWalletToProps.mock.results;

    spiedCreateMapWalletToProps.get = (index) => {
        assert(results[index], `Could not find created mapWalletToProps at index ${index}`);

        return results[index].value;
    };

    return spiedCreateMapWalletToProps;
};
