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

const createPropsMapper = (createMapWalletToProps, idmWallet, options) => {
    const mapWalletToProps = createMapWalletToProps(idmWallet);

    // Construct `propsMapper` which is a proxy to `actualMapWalletToProps` that doesn't leak
    // the second argument named `changeId`
    const propsMapper = (ownProps) => mapWalletToProps(ownProps);

    if (!options.pure) {
        return propsMapper;
    }

    // When pure, return a memoized version of `propsMapper`
    // Note that we further optimize when `mapWalletToProps` does not depend on `ownProps`
    const dependsOnOwnProps = mapWalletToProps.length > 0;
    const equalityFn = dependsOnOwnProps ? propsMapperEquatityFn : propsMapperOptimizedEquatityFn;

    return memoizeOne(propsMapper, equalityFn);
};

const createConnectComponent = (createMapWalletToProps, WrappedComponent, options) => {
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
        const providerValue = useContext(IdmWalletContext);

        invariant(providerValue, 'Unable to grab IdmWalletContext value. Did you forget to use <IdmWalletProvider> component?');

        const { idmWallet, observable } = providerValue;

        // Create a counter that will be used to force the component to update whenever
        // the reactive `idmWallet` triggers a change
        const [changeId, setChangeId] = useState(0);

        // Create `propsMapper`: a function that takes `(ownProps, changeId)` and returns the mapped props
        // The returned function has memoization when pure, avoiding unnecessary calls to `mapWalletToProps`
        // Note that this operation needs to run again only on scenario A
        const propsMapper = useMemo(
            () => createPropsMapper(createMapWalletToProps, idmWallet, options),
            [idmWallet]
        );

        // Get the mapped props by running the previously resolved `propsMapper`
        // Thanks to its memoization, the underyling `mapWalletToProps` only re-runs on
        // scenarios A, B and C (if we depend on props) if pure, or everytime if impure
        const mappedProps = propsMapper(ownProps, changeId);

        // Subcribe to the reactive `idmWallet` changes in order to update the component
        // Note that this operation needs to run again only on scenario A
        useEffect(() => {
            const unsubscribe = observable.subscribe(() => {
                setChangeId((id) => id >= 10000 ? 0 : id + 1);
            });

            // Be sure to unsubscribe when unmounting
            return unsubscribe;
        }, [observable]);

        // Render `WrappedComponent` with all correct props
        // Note that this is a memoized component when pure
        return <WrappedComponent { ...ownProps } { ...mappedProps } ref={ ref } />;
    });
};

const connectIdmWallet = (createMapWalletToProps, options) => {
    options = {
        pure: true,
        ...options,
    };

    return (WrappedComponent) => {
        const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
        const Connect = createConnectComponent(createMapWalletToProps, WrappedComponent, options);

        // Make sure we apply HOC best-pratices
        Connect.WrappedComponent = WrappedComponent;
        Connect.displayName = `ConnectIdmWallet(${displayName})`;
        hoistStatics(Connect, WrappedComponent);

        return Connect;
    };
};

export default connectIdmWallet;
