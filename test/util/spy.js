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
    const mapWalletToPropsFns = [];

    const spiedCreateMapWalletToProps = jest.fn((idmWallet) => {
        const mapWalletToProps = jest.fn(createMapWalletToProps(idmWallet));

        mapWalletToPropsFns.push(mapWalletToProps);

        return mapWalletToProps;
    });

    spiedCreateMapWalletToProps.get = (index) => {
        assert(mapWalletToPropsFns[index], `Could not find created mapWalletToProps at index ${index}`);

        return mapWalletToPropsFns[index];
    };

    return spiedCreateMapWalletToProps;
};
