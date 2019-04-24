import React from 'react';
import { render, cleanup } from 'react-testing-library';
import pDelay from 'delay';
import IdmWalletContext from '../src/context';
import createObservable from '../src/observable';
import createMockIdmWallet from './util/mock-idm-wallet';
import hideGlobalErrors from './util/hide-global-errors';
import { IdmWalletProvider } from '../src';

beforeEach(() => {
    cleanup();
});

it('should throw if both idmWallet and createIdmWallet props were provided', () => {
    hideGlobalErrors();

    expect.assertions(1);

    const idmWallet = createMockIdmWallet();
    const createIdmWallet = () => Promise.resolve(idmWallet);

    try {
        render(<IdmWalletProvider idmWallet={ idmWallet } createIdmWallet={ createIdmWallet } />);
    } catch (err) {
        expect(err.message).toBe('The idmWallet and createIdmWallet props are mutually exclusive and at least one must be provided');
    }
});

it('should throw if neither idmWallet or createIdmWallet props were provided', () => {
    hideGlobalErrors();

    expect.assertions(1);

    try {
        render(<IdmWalletProvider />);
    } catch (err) {
        expect(err.message).toBe('The idmWallet and createIdmWallet props are mutually exclusive and at least one must be provided');
    }
});

describe('sync mode', () => {
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
});

describe('async mode', () => {
    beforeEach(() => {
        // Hide "An update to null inside a test was not wrapped in act(...)" error
        // This won't be needed in react-dom@^16.9.0 because `act()` will support promises
        // See: https://github.com/facebook/react/issues/14769#issuecomment-479592338
        hideGlobalErrors();
    });

    it('should call the children render prop correctly if promise fulfilled', async () => {
        const createIdmWallet = () => Promise.resolve(createMockIdmWallet());
        const renderChildren = jest.fn((status) => <div>{ status }</div>);

        const { container } = render(
            <IdmWalletContext.Provider createIdmWallet={ createIdmWallet }>
                { renderChildren }
            </IdmWalletContext.Provider>
        );

        expect(container.querySelector('div').textContent).toBe('loading');

        await pDelay(10);

        expect(container.querySelector('div').textContent).toBe('ok');
        expect(renderChildren).toHaveBeenCalledTimes(2);
        expect(renderChildren.mock.calls[0]).toEqual(['loading', undefined]);
        expect(renderChildren.mock.calls[1]).toEqual(['ok', undefined]);
    });

    it('should call the children render prop correctly if promise rejected', async () => {
        const createIdmWallet = () => Promise.reject(new Error('foo'));
        const renderChildren = jest.fn((status) => <div>{ status }</div>);

        const { container } = render(
            <IdmWalletContext.Provider createIdmWallet={ createIdmWallet }>
                { renderChildren }
            </IdmWalletContext.Provider>
        );

        expect(container.querySelector('div').textContent).toBe('loading');

        await pDelay(10);

        expect(container.querySelector('div').textContent).toBe('error');
        expect(renderChildren).toHaveBeenCalledTimes(2);
        expect(renderChildren.mock.calls[0]).toEqual(['loading', undefined]);
        expect(renderChildren.mock.calls[1]).toEqual(['error', new Error('foo')]);
    });

    it('should support returning a direct idmWallet instance in the factory instead of a promise', async () => {
        const createIdmWallet = () => createMockIdmWallet();
        const renderChildren = jest.fn((status) => <div>{ status }</div>);

        const { container } = render(
            <IdmWalletContext.Provider createIdmWallet={ createIdmWallet }>
                { renderChildren }
            </IdmWalletContext.Provider>
        );

        expect(container.querySelector('div').textContent).toBe('loading');

        await pDelay(10);

        expect(container.querySelector('div').textContent).toBe('ok');
        expect(renderChildren).toHaveBeenCalledTimes(2);
        expect(renderChildren.mock.calls[0]).toEqual(['loading', undefined]);
        expect(renderChildren.mock.calls[1]).toEqual(['ok', undefined]);
    });

    it('should handle sync errors when calling the factory', async () => {
        const createIdmWallet = () => { throw new Error('foo'); };
        const renderChildren = jest.fn((status) => <div>{ status }</div>);

        const { container } = render(
            <IdmWalletContext.Provider createIdmWallet={ createIdmWallet }>
                { renderChildren }
            </IdmWalletContext.Provider>
        );

        expect(container.querySelector('div').textContent).toBe('loading');

        await pDelay(10);

        expect(container.querySelector('div').textContent).toBe('error');
        expect(renderChildren).toHaveBeenCalledTimes(2);
        expect(renderChildren.mock.calls[0]).toEqual(['loading', undefined]);
        expect(renderChildren.mock.calls[1]).toEqual(['error', new Error('foo')]);
    });

    it('should provide idmWallet and observable to consumers', async () => {
        const idmWallet = createMockIdmWallet();
        const createIdmWallet = () => Promise.resolve(idmWallet);

        render(
            <IdmWalletContext.Provider createIdmWallet={ createIdmWallet }>
                { () => <div>foo</div> }
            </IdmWalletContext.Provider>
        );

        await pDelay(10);

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
        const createIdmWallet1 = () => Promise.resolve(idmWallet1);
        const idmWallet2 = createMockIdmWallet();
        const createIdmWallet2 = () => Promise.resolve(idmWallet2);
        const renderConsumerChildren = jest.fn(() => <div>foo</div>);
        const renderChildren = jest.fn(
            (status) => status === 'ok' ? (
                <IdmWalletContext.Consumer>
                    { renderConsumerChildren }
                </IdmWalletContext.Consumer>
            ) : null
        );

        const { rerender } = render(
            <IdmWalletContext.Provider createIdmWallet={ createIdmWallet1 }>
                { renderChildren }
            </IdmWalletContext.Provider>
        );

        await pDelay(10);

        rerender(
            <IdmWalletContext.Provider createIdmWallet={ createIdmWallet2 }>
                { renderChildren }
            </IdmWalletContext.Provider>
        );

        await pDelay(10);

        expect(renderConsumerChildren).toHaveBeenCalledTimes(2);
        expect(renderConsumerChildren.mock.calls[0][0].idmWallet).toBe(idmWallet1);
        expect(renderConsumerChildren.mock.calls[1][0].idmWallet).toBe(idmWallet2);
        expect(renderConsumerChildren.mock.calls[0][0].observable).not.toBe(renderConsumerChildren.mock.calls[1][0].observable);

        expect(renderChildren).toHaveBeenCalledTimes(4);
        expect(renderChildren.mock.calls[0]).toEqual(['loading', undefined]);
        expect(renderChildren.mock.calls[1]).toEqual(['ok', undefined]);
        expect(renderChildren.mock.calls[2]).toEqual(['loading', undefined]);
        expect(renderChildren.mock.calls[3]).toEqual(['ok', undefined]);
    });

    it('should call cleanup the observer when unmounting', async () => {
        const idmWallet = createMockIdmWallet();
        const createIdmWallet = () => Promise.resolve(idmWallet);
        const observable = createObservable(idmWallet);

        observable.cleanup = jest.fn(observable.cleanup);

        const { unmount } = render(
            <IdmWalletContext.Provider createIdmWallet={ createIdmWallet }>
                { () => {} }
            </IdmWalletContext.Provider>
        );

        await pDelay(10);

        unmount();

        expect(observable.cleanup).toHaveBeenCalledTimes(1);
    });

    it('should call cleanup the observer when the idmWallet changes', async () => {
        const idmWallet1 = createMockIdmWallet();
        const createIdmWallet1 = () => Promise.resolve(idmWallet1);
        const idmWallet2 = createMockIdmWallet();
        const createIdmWallet2 = () => Promise.resolve(idmWallet2);
        const observable = createObservable(idmWallet1);

        observable.cleanup = jest.fn(observable.cleanup);

        const { rerender } = render(
            <IdmWalletContext.Provider createIdmWallet={ createIdmWallet1 }>
                { () => {} }
            </IdmWalletContext.Provider>
        );

        await pDelay(10);

        rerender(
            <IdmWalletContext.Provider createIdmWallet={ createIdmWallet2 }>
                { () => {} }
            </IdmWalletContext.Provider>
        );

        expect(observable.cleanup).toHaveBeenCalledTimes(1);
    });

    it('should ignore pending promise if idmWallet changes (fulfilled)', async () => {
        const createIdmWallet1 = () => pDelay(10).then(createMockIdmWallet);
        const createIdmWallet2 = () => Promise.reject(new Error('foo'));
        const renderChildren = jest.fn(() => <div>foo</div>);

        const { rerender } = render(
            <IdmWalletContext.Provider createIdmWallet={ createIdmWallet1 }>
                { renderChildren }
            </IdmWalletContext.Provider>
        );

        expect(renderChildren).toHaveBeenCalledTimes(1);
        expect(renderChildren.mock.calls[0]).toEqual(['loading', undefined]);

        rerender(
            <IdmWalletContext.Provider createIdmWallet={ createIdmWallet2 }>
                { renderChildren }
            </IdmWalletContext.Provider>
        );

        await pDelay(20);

        expect(renderChildren).toHaveBeenCalledTimes(2);
        expect(renderChildren.mock.calls[0]).toEqual(['loading', undefined]);
        expect(renderChildren.mock.calls[1]).toEqual(['error', new Error('foo')]);
    });

    it('should ignore pending promise if idmWallet changes (rejected)', async () => {
        const createIdmWallet1 = () => pDelay(10).then(() => { throw new Error('foo'); });
        const createIdmWallet2 = () => Promise.resolve(createMockIdmWallet());
        const renderChildren = jest.fn(() => <div>foo</div>);

        const { rerender } = render(
            <IdmWalletContext.Provider createIdmWallet={ createIdmWallet1 }>
                { renderChildren }
            </IdmWalletContext.Provider>
        );

        expect(renderChildren).toHaveBeenCalledTimes(1);
        expect(renderChildren.mock.calls[0]).toEqual(['loading', undefined]);

        rerender(
            <IdmWalletContext.Provider createIdmWallet={ createIdmWallet2 }>
                { renderChildren }
            </IdmWalletContext.Provider>
        );

        await pDelay(20);

        expect(renderChildren).toHaveBeenCalledTimes(2);
        expect(renderChildren.mock.calls[0]).toEqual(['loading', undefined]);
        expect(renderChildren.mock.calls[1]).toEqual(['ok', undefined]);
    });
});
