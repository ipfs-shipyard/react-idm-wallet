import React, { useMemo, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import pTry from 'p-try';
import createObservable from '../observable';

const reducer = (state, action) => {
    switch (action.type) {
    case 'loading':
        // Return the same status if already loading, to avoid an additional render
        return { ...state, status: 'loading' };
    case 'error':
        return { ...state, status: 'error', error: action.payload, idmWallet: undefined };
    case 'ok':
        return { ...state, status: 'ok', error: undefined, idmWallet: action.payload };
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

    const renderedChildren = useMemo(() => (
        children(state.status, state.error)
    ), [state.status, state.error]);

    // Call `createIdmWallet` on mount or whenever it changes
    // Note that any inflight `.then` or `.catch` from the promise will be ignored
    // if `createIdmWallet` changes
    useEffect(() => {
        let ignore = false;

        dispatch({ type: 'loading' });

        pTry(createIdmWallet)
        .then((idmWallet) => {
            if (!ignore) {
                dispatch({ type: 'ok', payload: idmWallet });
            }
        })
        .catch((error) => {
            if (!ignore) {
                dispatch({ type: 'error', payload: error });
            }
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
