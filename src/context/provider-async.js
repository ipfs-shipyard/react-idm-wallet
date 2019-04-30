import React, { useMemo, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import pTry from 'p-try';
import createObservable from '../observable';

const reducer = (state, action) => {
    switch (action.type) {
    case 'loading':
        return { ...state, status: 'loading' };
    case 'error':
        return { status: 'error', error: action.payload, idmWallet: undefined };
    case 'ok':
        return { status: 'ok', error: undefined, idmWallet: action.payload };
    /* istanbul ignore next */
    default:
        throw new Error('Unknown action type');
    }
};

const initialState = { status: 'loading', error: undefined, idmWallet: undefined };

const IdmWalletProviderAsync = ({ createIdmWallet, provider: Provider, children }) => {
    // Create a reducer that will have the `status`, `error` and `idmWallet`
    const [state, dispatch] = useReducer(reducer, initialState);

    // Create observable each time the `idmWallet` changes
    const providerValue = useMemo(() => {
        const idmWallet = state.idmWallet;

        if (!idmWallet) {
            return undefined;
        }

        return {
            idmWallet,
            observable: createObservable(idmWallet),
        };
    }, [state.idmWallet]);

    // Call the children render prop, only whenever the `status` or `error` changes
    const renderedChildren = useMemo(() => (
        children(state.status, state.error)
    ), [children, state.status, state.error]);

    // Call `createIdmWallet` on mount or whenever it changes
    // Note that any inflight `.then` or `.catch` from the previous promise will be ignored
    useEffect(() => {
        let ignore = false;

        dispatch({ type: 'loading' });

        pTry(createIdmWallet)
        .then((idmWallet) => {
            !ignore && dispatch({ type: 'ok', payload: idmWallet });
        }, (err) => {
            !ignore && dispatch({ type: 'error', payload: err });
        });

        return () => {
            ignore = true;
        };
    }, [createIdmWallet]);

    // Cleanup observable on unmount, restoring `idmWallet` to its original state
    // if there are no other listeners (it might still be observed by others)
    useEffect(() => {
        if (providerValue) {
            providerValue.observable.cleanup();
        }
    }, [providerValue]);

    return (
        <Provider value={ providerValue }>
            { renderedChildren }
        </Provider>
    );
};

IdmWalletProviderAsync.propTypes = {
    createIdmWallet: PropTypes.func.isRequired,
    provider: PropTypes.elementType.isRequired,
    children: PropTypes.func.isRequired,
};

export default IdmWalletProviderAsync;
