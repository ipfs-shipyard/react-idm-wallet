import React from 'react';
import { render } from 'react-testing-library';
import IdmWalletContext from '../src/context';
import createObservable from '../src/observable';
import createMockIdmWallet from './util/mock-idm-wallet';

it('should provide idmWallet and observable to consumers', () => {
    const idmWallet = createMockIdmWallet();

    expect.assertions(2);

    render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <IdmWalletContext.Consumer>
                { (value) => {
                    expect(value.idmWallet).toBe(idmWallet);
                    expect(typeof value.observable).toBe('object');
                } }
            </IdmWalletContext.Consumer>
        </IdmWalletContext.Provider>
    );
});

it('should update the provider value when the idmWallet changes', async () => {
    const idmWallet1 = createMockIdmWallet();
    const idmWallet2 = createMockIdmWallet();
    const renderChildren = jest.fn(() => <div>foo</div>);

    const { rerender } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet1 }>
            <IdmWalletContext.Consumer>
                { renderChildren }
            </IdmWalletContext.Consumer>
        </IdmWalletContext.Provider>
    );

    rerender(
        <IdmWalletContext.Provider idmWallet={ idmWallet2 }>
            <IdmWalletContext.Consumer>
                { renderChildren }
            </IdmWalletContext.Consumer>
        </IdmWalletContext.Provider>
    );

    expect(renderChildren).toHaveBeenCalledTimes(2);
    expect(renderChildren.mock.calls[0][0].idmWallet).toBe(idmWallet1);
    expect(renderChildren.mock.calls[1][0].idmWallet).toBe(idmWallet2);
    expect(renderChildren.mock.calls[0][0].observable).not.toBe(renderChildren.mock.calls[1][0].observable);
});

it('should call cleanup the observer when unmounting', () => {
    const idmWallet = createMockIdmWallet();
    const observable = createObservable(idmWallet);

    observable.cleanup = jest.fn(observable.cleanup);

    const { unmount } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet } />
    );

    unmount();

    expect(observable.cleanup).toHaveBeenCalledTimes(1);
});

it('should call cleanup the observer when the idmWallet changes', () => {
    const idmWallet1 = createMockIdmWallet();
    const idmWallet2 = createMockIdmWallet();
    const observable = createObservable(idmWallet1);

    observable.cleanup = jest.fn(observable.cleanup);

    const { rerender } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet1 } />
    );

    rerender(
        <IdmWalletContext.Provider idmWallet={ idmWallet2 } />
    );

    expect(observable.cleanup).toHaveBeenCalledTimes(1);
});
