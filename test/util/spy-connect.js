import connectIdmWallet from '../../src/connect';

const connectIdmWalletSpied = (...args) => {
    const withConnect = connectIdmWallet(...args);

    return (WrappedComponent) => {
        const Connect = withConnect(WrappedComponent);

        Connect.render = jest.fn(Connect.render);

        return Connect;
    };
};

export default connectIdmWalletSpied;
