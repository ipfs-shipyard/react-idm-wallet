import React, { useContext, useEffect, useState, useMemo, memo, forwardRef } from 'react';
import hoistStatics from 'hoist-non-react-statics';
import shallowEqual from 'shallow-equal/objects';
import memoizeOne from 'memoize-one';
import invariant from 'invariant';
import IdmWalletContext from './context';

const propsMapperEquatityFn = ([newOwnProps, newChangeId], [oldOwnProps, oldChangeId]) =>
    newChangeId === oldChangeId && shallowEqual(newOwnProps, oldOwnProps);

const propsMapperOptimizedEquatityFn = ([, newChangeId], [, oldChangeId]) =>
    newChangeId === oldChangeId;

const createPropsMapper = (mapWalletToProps, idmWallet, ownProps, options) => {
    // Call `mapWalletToProps` to see if it's a factory
    let mappedProps = mapWalletToProps(idmWallet, ownProps);

    if (typeof mappedProps === 'function') {
        mapWalletToProps = mappedProps;
        mappedProps = mapWalletToProps(idmWallet, ownProps);
    }

    // Construct `propsMapper` which is a "proxy" to `mapWalletToProps` except that
    // it returns the already resolved `mappedProps` in its first invocation
    let calledOnce = false;
    const propsMapper = (ownProps) => {
        if (!calledOnce) {
            const mappedProps_ = mappedProps;

            calledOnce = true;
            mappedProps = undefined;

            return mappedProps_;
        }

        return mapWalletToProps(idmWallet, ownProps);
    };

    if (!options.pure) {
        return propsMapper;
    }

    // When pure, return a memoized version of `propsMapper`
    // Note that we further optimize when `mapWalletToProps` does not depend on `ownProps`
    const dependsOnOwnProps = mapWalletToProps.length >= 2;
    const equalityFn = dependsOnOwnProps ? propsMapperEquatityFn : propsMapperOptimizedEquatityFn;

    return memoizeOne(propsMapper, equalityFn);
};

const createConnectComponent = (mapWalletToProps, WrappedComponent, options) => {
    // Memoize `WrappedComponent` when pure, avoiding any re-render if its own props or mapped props are the same
    if (options.pure) {
        WrappedComponent = memo(WrappedComponent);
    }

    // The `Connect` component might re-render in the following scenarios:
    // - A) if `idmWallet` instance changes
    // - B) if `idmWallet` reported a change
    // - C) if `props` changes
    // - D) if `ref` changes
    return forwardRef((ownProps, ref) => {
        // Grab the IdmWalletContext value
        const contextValue = useContext(IdmWalletContext);

        invariant(contextValue, 'Unable to grab IdmWalletContext value. Did you forget to use <IdmWalletProvider> component?');

        const { idmWallet, subscribe } = contextValue;

        // Create a counter that will be used to force the component to update whenever
        // the reactive `idmWallet` triggers a change
        const [changeId, setChangeId] = useState(0);

        // Create `propsMapper`: a function that takes `(ownProps, changeId)` and returns the mapped props
        // The returned function has memoization when pure, avoiding unnecessary calls to `mapWalletToProps`
        // Note that this operation needs to run again only on scenario A
        const propsMapper = useMemo(
            () => createPropsMapper(mapWalletToProps, idmWallet, ownProps, options),
            [idmWallet]
        );

        // Get the mapped props by running the previously resolved `propsMapper`
        // Thanks to its memoization, the underyling `mapWalletToProps` only re-runs on
        // scenarios A, B and C (if we depend on props) if pure, or everytime if impure
        const mappedProps = propsMapper(ownProps, changeId);

        // Subcribe to the reactive `idmWallet` changes in order to update the component
        // Note that this operation needs to run again only on scenario A
        useEffect(() => {
            const cleanup = subscribe(() => {
                setChangeId((id) => id >= 10000 ? 0 : id + 1);
            });

            // Be sure to unsubscribe when unmounting
            return cleanup;
        }, [subscribe]);

        // Render `WrappedComponent` with all correct props
        // Note that this is a memoized component when pure
        return <WrappedComponent { ...ownProps } { ...mappedProps } ref={ ref } />;
    });
};

const connectIdmWallet = (mapWalletToProps, options) => {
    options = {
        pure: true,
        ...options,
    };

    return (WrappedComponent) => {
        const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
        const Connect = createConnectComponent(mapWalletToProps, WrappedComponent, options);

        // Make sure we apply HOC best-pratices
        Connect.WrappedComponent = WrappedComponent;
        Connect.displayName = `ConnectIdmWallet(${displayName})`;
        hoistStatics(Connect, WrappedComponent);

        return Connect;
    };
};

export default connectIdmWallet;
