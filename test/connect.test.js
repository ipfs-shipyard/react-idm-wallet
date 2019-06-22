import React, { Component, createRef, forwardRef } from 'react';
import { render } from 'react-testing-library';
import testRenderer from 'react-test-renderer';
import pDelay from 'delay';
import IdmWalletContext from '../src/context';
import connectIdmWallet from '../src/connect';
import createMockIdmWallet from './utils/mock-idm-wallet';
import hideGlobalErrors from './utils/hide-global-errors';
import { spiedConnectIdmWallet, spiedForwardRef, spyOnCreateMapWalletToProps } from './utils/spy';
import createObservable from '../src/observable';

const THROTTLE_WAIT_TIME = 10;

it('should render all the correct components', () => {
    const idmWallet = createMockIdmWallet();

    const MyComponent = () => <p>foo</p>;
    const MyConnectedComponent = connectIdmWallet(() => () => {})(MyComponent);

    const { root } = testRenderer.create(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent foo="bar" />
        </IdmWalletContext.Provider>
    );

    const nodes = root.findAll(() => true);
    const names = nodes.map((node) => typeof node.type === 'string' ? node.type : node.type.displayName || node.type.name);

    expect(names).toEqual([
        'IdmWalletProvider',
        'ConnectIdmWallet(MyComponent)',
        'MyComponent',
        'p',
    ]);
});

it('should fail if the provider wasn\'t found', () => {
    // Hide error being printed
    hideGlobalErrors();

    expect.assertions(1);

    const MyComponent = () => <p>foo</p>;
    const MyConnectedComponent = connectIdmWallet(() => () => {})(MyComponent);

    try {
        render(<MyConnectedComponent />);
    } catch (err) {
        expect(err.message).toBe('Unable to grab IdmWalletContext value. Did you forget to use <IdmWalletProvider> component?');
    }
});

it('should map wallet to props', () => {
    const idmWallet = createMockIdmWallet();
    const createMapWalletToProps = spyOnCreateMapWalletToProps(() => () => ({ maxTime: 5000 }));

    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = spiedConnectIdmWallet(createMapWalletToProps)(MyComponent);

    render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent foo="bar" />
        </IdmWalletContext.Provider>
    );

    expect(createMapWalletToProps).toHaveBeenCalledTimes(1);
    expect(createMapWalletToProps).toHaveBeenNthCalledWith(1, idmWallet);
    expect(createMapWalletToProps.get(0)).toHaveBeenCalledTimes(1);
    expect(createMapWalletToProps.get(0)).toHaveBeenNthCalledWith(1, { foo: 'bar' });

    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(1);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(1, { foo: 'bar' }, null);
    expect(MyComponent).toHaveBeenCalledTimes(1);
    expect(MyComponent).toHaveBeenNthCalledWith(1, { foo: 'bar', maxTime: 5000 }, {});
});

it('should behave correctly when props change and we depend on them', () => {
    const idmWallet = createMockIdmWallet();
    const createMapWalletToProps = spyOnCreateMapWalletToProps(() => (ownProps) => ({ maxTime: 5000 })); // eslint-disable-line no-unused-vars

    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = spiedConnectIdmWallet(createMapWalletToProps)(MyComponent);

    const { rerender } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent foo="bar" />;
        </IdmWalletContext.Provider>
    );

    rerender(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent foo="baz" />
        </IdmWalletContext.Provider>
    );

    expect(createMapWalletToProps).toHaveBeenCalledTimes(1);
    expect(createMapWalletToProps).toHaveBeenNthCalledWith(1, idmWallet);
    expect(createMapWalletToProps.get(0)).toHaveBeenCalledTimes(2);
    expect(createMapWalletToProps.get(0)).toHaveBeenNthCalledWith(1, { foo: 'bar' });
    expect(createMapWalletToProps.get(0)).toHaveBeenNthCalledWith(2, { foo: 'baz' });

    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(1, { foo: 'bar' }, null);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(2, { foo: 'baz' }, null);
    expect(MyComponent).toHaveBeenCalledTimes(2);
    expect(MyComponent).toHaveBeenNthCalledWith(1, { foo: 'bar', maxTime: 5000 }, {});
    expect(MyComponent).toHaveBeenNthCalledWith(2, { foo: 'baz', maxTime: 5000 }, {});
});

it('should behave correctly when props change and we do not depend on them', () => {
    const idmWallet = createMockIdmWallet();
    const createMapWalletToProps = spyOnCreateMapWalletToProps(() => () => ({ maxTime: 5000 }));

    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = spiedConnectIdmWallet(createMapWalletToProps)(MyComponent);

    const { rerender } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent foo="bar" />;
        </IdmWalletContext.Provider>
    );

    rerender(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent foo="baz" />
        </IdmWalletContext.Provider>
    );

    expect(createMapWalletToProps).toHaveBeenCalledTimes(1);
    expect(createMapWalletToProps).toHaveBeenNthCalledWith(1, idmWallet);
    expect(createMapWalletToProps.get(0)).toHaveBeenCalledTimes(1);
    expect(createMapWalletToProps.get(0)).toHaveBeenNthCalledWith(1, { foo: 'bar' });

    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(1, { foo: 'bar' }, null);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(2, { foo: 'baz' }, null);
    expect(MyComponent).toHaveBeenCalledTimes(2);
    expect(MyComponent).toHaveBeenNthCalledWith(1, { foo: 'bar', maxTime: 5000 }, {});
    expect(MyComponent).toHaveBeenNthCalledWith(2, { foo: 'baz', maxTime: 5000 }, {});
});

it('should behave correctly when props do not change and we depend on them', () => {
    const idmWallet = createMockIdmWallet();
    const createMapWalletToProps = spyOnCreateMapWalletToProps(() => (ownProps) => ({ maxTime: 5000 })); // eslint-disable-line no-unused-vars

    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = spiedConnectIdmWallet(createMapWalletToProps)(MyComponent);

    const { rerender } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent foo="bar" />;
        </IdmWalletContext.Provider>
    );

    rerender(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent foo="bar" />
        </IdmWalletContext.Provider>
    );

    expect(createMapWalletToProps).toHaveBeenCalledTimes(1);
    expect(createMapWalletToProps).toHaveBeenNthCalledWith(1, idmWallet);
    expect(createMapWalletToProps.get(0)).toHaveBeenCalledTimes(1);
    expect(createMapWalletToProps.get(0)).toHaveBeenNthCalledWith(1, { foo: 'bar' });

    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(1, { foo: 'bar' }, null);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(2, { foo: 'bar' }, null);
    expect(MyComponent).toHaveBeenCalledTimes(1);
    expect(MyComponent).toHaveBeenNthCalledWith(1, { foo: 'bar', maxTime: 5000 }, {});
});

it('should behave correctly when idmWallet reports a change', async () => {
    // Hide "An update to null inside a test was not wrapped in act(...)" error
    // This won't be needed in react-dom@^16.9.0 because `act()` will support promises
    // See: https://github.com/facebook/react/issues/14769#issuecomment-479592338
    hideGlobalErrors();

    const idmWallet = (() => {
        let maxTime = 2000;
        const idmWallet = createMockIdmWallet();

        idmWallet.locker.idleTimer.getMaxTime = () => maxTime;
        idmWallet.locker.idleTimer.setMaxTime = (value) => { maxTime = value; };

        return idmWallet;
    })();
    const createMapWalletToProps = spyOnCreateMapWalletToProps((idmWallet) => () => ({
        maxTime: idmWallet.locker.idleTimer.getMaxTime(),
    }));

    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = spiedConnectIdmWallet(createMapWalletToProps)(MyComponent);

    render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent />
        </IdmWalletContext.Provider>
    );

    // Trigger mutation
    idmWallet.locker.idleTimer.setMaxTime(9999);
    await pDelay(THROTTLE_WAIT_TIME);

    expect(createMapWalletToProps).toHaveBeenCalledTimes(1);
    expect(createMapWalletToProps.get(0)).toHaveBeenCalledTimes(2);

    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(1, {}, null);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(2, {}, null);
    expect(MyComponent).toHaveBeenCalledTimes(2);
    expect(MyComponent).toHaveBeenNthCalledWith(1, { maxTime: 2000 }, {});
    expect(MyComponent).toHaveBeenNthCalledWith(2, { maxTime: 9999 }, {});
});

it('should behave correctly when idmWallet instance changes', () => {
    const idmWallet1 = createMockIdmWallet();
    const idmWallet2 = createMockIdmWallet();

    idmWallet1.locker.idleTimer.getMaxTime = () => 2000;
    idmWallet2.locker.idleTimer.getMaxTime = () => 5000;

    const createMapWalletToProps = spyOnCreateMapWalletToProps((idmWallet) => () => ({
        maxTime: idmWallet.locker.idleTimer.getMaxTime(),
    }));

    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = spiedConnectIdmWallet(createMapWalletToProps)(MyComponent);

    const { rerender } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet1 }>
            <MyConnectedComponent />;
        </IdmWalletContext.Provider>
    );

    rerender(
        <IdmWalletContext.Provider idmWallet={ idmWallet2 }>
            <MyConnectedComponent />
        </IdmWalletContext.Provider>
    );

    expect(createMapWalletToProps).toHaveBeenCalledTimes(2);
    expect(createMapWalletToProps).toHaveBeenNthCalledWith(1, idmWallet1);
    expect(createMapWalletToProps).toHaveBeenNthCalledWith(2, idmWallet2);
    expect(createMapWalletToProps.get(0)).toHaveBeenCalledTimes(1);
    expect(createMapWalletToProps.get(0)).toHaveBeenNthCalledWith(1, {});
    expect(createMapWalletToProps.get(1)).toHaveBeenCalledTimes(1);
    expect(createMapWalletToProps.get(1)).toHaveBeenNthCalledWith(1, {});

    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
    expect(MyComponent).toHaveBeenCalledTimes(2);
    expect(MyComponent).toHaveBeenNthCalledWith(1, { maxTime: 2000 }, {});
    expect(MyComponent).toHaveBeenNthCalledWith(2, { maxTime: 5000 }, {});
});

it('should behave correctly when mapped props change', async () => {
    // Hide "An update to null inside a test was not wrapped in act(...)" error
    // This won't be needed in react-dom@^16.9.0 because `act()` will support promises
    // See: https://github.com/facebook/react/issues/14769#issuecomment-479592338
    hideGlobalErrors();

    let counter = 0;
    const idmWallet = createMockIdmWallet();
    const createMapWalletToProps = spyOnCreateMapWalletToProps(() => () => ({ maxTime: counter++ })); // eslint-disable-line no-plusplus

    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = spiedConnectIdmWallet(createMapWalletToProps)(MyComponent);

    render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent foo="bar" />
        </IdmWalletContext.Provider>
    );

    // Trigger mutation
    idmWallet.locker.idleTimer.setMaxTime(9999);
    await pDelay(THROTTLE_WAIT_TIME);

    expect(createMapWalletToProps).toHaveBeenCalledTimes(1);
    expect(createMapWalletToProps.get(0)).toHaveBeenCalledTimes(2);

    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(1, { foo: 'bar' }, null);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(2, { foo: 'bar' }, null);
    expect(MyComponent).toHaveBeenCalledTimes(2);
    expect(MyComponent).toHaveBeenNthCalledWith(1, { foo: 'bar', maxTime: 0 }, {});
    expect(MyComponent).toHaveBeenNthCalledWith(2, { foo: 'bar', maxTime: 1 }, {});
});

it('should behave correctly when ref changes', () => {
    const idmWallet = createMockIdmWallet();
    const createMapWalletToProps = spyOnCreateMapWalletToProps(() => () => ({ maxTime: 5000 }));
    const ref1 = createRef();
    const ref2 = createRef();

    const MyComponent = spiedForwardRef((props, ref) => <p ref={ ref }>foo</p>);
    const MyConnectedComponent = spiedConnectIdmWallet(createMapWalletToProps)(MyComponent);

    const { rerender } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent ref={ ref1 } />;
        </IdmWalletContext.Provider>
    );

    rerender(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent ref={ ref2 } />
        </IdmWalletContext.Provider>
    );

    expect(createMapWalletToProps).toHaveBeenCalledTimes(1);
    expect(createMapWalletToProps.get(0)).toHaveBeenCalledTimes(1);

    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(1, {}, ref1);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(2, {}, ref2);
    expect(MyComponent.render).toHaveBeenCalledTimes(2);
    expect(MyComponent.render).toHaveBeenNthCalledWith(1, { maxTime: 5000 }, ref1);
    expect(MyComponent.render).toHaveBeenNthCalledWith(2, { maxTime: 5000 }, ref2);
});

it('should behave correctly when props, mapped props and ref do not change', () => {
    const idmWallet = createMockIdmWallet();
    const createMapWalletToProps = spyOnCreateMapWalletToProps(() => () => ({ maxTime: 5000 }));
    const ref = createRef();

    const MyComponent = spiedForwardRef((props, ref) => <p ref={ ref }>foo</p>);
    const MyConnectedComponent = spiedConnectIdmWallet(createMapWalletToProps)(MyComponent);

    const { rerender } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent foo="bar" ref={ ref } />;
        </IdmWalletContext.Provider>
    );

    rerender(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent foo="bar" ref={ ref } />
        </IdmWalletContext.Provider>
    );

    expect(createMapWalletToProps).toHaveBeenCalledTimes(1);
    expect(createMapWalletToProps).toHaveBeenNthCalledWith(1, idmWallet);
    expect(createMapWalletToProps.get(0)).toHaveBeenCalledTimes(1);
    expect(createMapWalletToProps.get(0)).toHaveBeenNthCalledWith(1, { foo: 'bar' });

    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(1, { foo: 'bar' }, ref);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(2, { foo: 'bar' }, ref);
    expect(MyComponent.render).toHaveBeenCalledTimes(1);
    expect(MyComponent.render).toHaveBeenNthCalledWith(1, { foo: 'bar', maxTime: 5000 }, ref);
});

it('should unsubscribe on unmount', async () => {
    // Hide "An update to null inside a test was not wrapped in act(...)" error
    // This won't be needed in react-dom@^16.9.0 because `act()` will support promises
    // See: https://github.com/facebook/react/issues/14769#issuecomment-479592338
    hideGlobalErrors();

    const idmWallet = createMockIdmWallet();
    const createMapWalletToProps = () => () => ({});
    const observable = createObservable(idmWallet);

    observable.unsubscribe = jest.fn(observable.unsubscribe);

    const MyComponent = () => <p>foo</p>;
    const MyConnectedComponent = spiedConnectIdmWallet(createMapWalletToProps)(MyComponent);

    const { unmount } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent />
        </IdmWalletContext.Provider>
    );

    unmount();

    // Trigger mutation
    idmWallet.locker.idleTimer.setMaxTime(9999);
    await pDelay(THROTTLE_WAIT_TIME);

    expect(observable.unsubscribe).toHaveBeenCalledTimes(1);
    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(1);
});

it('should unsubscribe when idmWallet instance changes', async () => {
    const idmWallet1 = createMockIdmWallet();
    const idmWallet2 = createMockIdmWallet();
    const createMapWalletToProps = () => () => ({});
    const observable = createObservable(idmWallet1);

    observable.unsubscribe = jest.fn(observable.unsubscribe);

    const MyComponent = () => <p>foo</p>;
    const MyConnectedComponent = spiedConnectIdmWallet(createMapWalletToProps)(MyComponent);

    const { rerender } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet1 }>
            <MyConnectedComponent />
        </IdmWalletContext.Provider>
    );

    rerender(
        <IdmWalletContext.Provider idmWallet={ idmWallet2 }>
            <MyConnectedComponent />
        </IdmWalletContext.Provider>
    );

    // Trigger mutation
    idmWallet1.locker.idleTimer.setMaxTime(9999);
    await pDelay(THROTTLE_WAIT_TIME);

    expect(observable.unsubscribe).toHaveBeenCalledTimes(1);
    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
});

it('should apply the correct displayName for the connect component', () => {
    const createMapWalletToProps = () => () => ({});

    const MyComponent = () => <p>foo</p>;
    const MyConnectedComponent = connectIdmWallet(createMapWalletToProps)(MyComponent);

    expect(MyConnectedComponent.displayName).toBe('ConnectIdmWallet(MyComponent)');
});

it('should hoist-statics of the wrapped component into the connect component', () => {
    const createMapWalletToProps = () => () => ({});

    const MyComponent = () => <p>foo</p>;

    MyComponent.foo = 'bar';

    const MyConnectedComponent = connectIdmWallet(createMapWalletToProps)(MyComponent);

    expect(MyConnectedComponent.foo).toBe('bar');
});

it('should forward ref to the wrapped component (functional)', () => {
    const idmWallet = createMockIdmWallet();
    const createMapWalletToProps = () => () => ({});
    const ref = createRef();

    const MyComponent = forwardRef((props, ref) => <p ref={ ref }>foo</p>);
    const MyConnectedComponent = connectIdmWallet(createMapWalletToProps)(MyComponent);

    render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent ref={ ref } />
        </IdmWalletContext.Provider>
    );

    expect(ref.current instanceof HTMLParagraphElement).toBe(true);
});

it('should forward ref to the wrapped component (class)', () => {
    const idmWallet = createMockIdmWallet();
    const createMapWalletToProps = () => () => ({});
    const ref = createRef();

    class MyComponent extends Component {
        render() {
            return <p>foo</p>;
        }
    }
    const MyConnectedComponent = connectIdmWallet(createMapWalletToProps)(MyComponent);

    render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent ref={ ref } />
        </IdmWalletContext.Provider>
    );

    expect(ref.current instanceof MyComponent).toBe(true);
});

describe('options.pure = false', () => {
    it('should behave correctly even when props, mapped props and ref do not change', () => {
        const idmWallet = createMockIdmWallet();
        const createMapWalletToProps = spyOnCreateMapWalletToProps(() => (ownProps) => ({ maxTime: 5000 })); // eslint-disable-line no-unused-vars
        const ref = createRef();

        const MyComponent = spiedForwardRef((props, ref) => <p ref={ ref }>foo</p>);
        const MyConnectedComponent = spiedConnectIdmWallet(createMapWalletToProps, { pure: false })(MyComponent);

        const { rerender } = render(
            <IdmWalletContext.Provider idmWallet={ idmWallet }>
                <MyConnectedComponent foo="bar" ref={ ref } />;
            </IdmWalletContext.Provider>
        );

        rerender(
            <IdmWalletContext.Provider idmWallet={ idmWallet }>
                <MyConnectedComponent foo="bar" ref={ ref } />
            </IdmWalletContext.Provider>
        );

        expect(createMapWalletToProps).toHaveBeenCalledTimes(1);
        expect(createMapWalletToProps).toHaveBeenNthCalledWith(1, idmWallet);
        expect(createMapWalletToProps.get(0)).toHaveBeenCalledTimes(2);
        expect(createMapWalletToProps.get(0)).toHaveBeenNthCalledWith(1, { foo: 'bar' });
        expect(createMapWalletToProps.get(0)).toHaveBeenNthCalledWith(2, { foo: 'bar' });

        expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
        expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(1, { foo: 'bar' }, ref);
        expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(2, { foo: 'bar' }, ref);
        expect(MyComponent.render).toHaveBeenCalledTimes(2);
        expect(MyComponent.render).toHaveBeenNthCalledWith(1, { foo: 'bar', maxTime: 5000 }, ref);
        expect(MyComponent.render).toHaveBeenNthCalledWith(2, { foo: 'bar', maxTime: 5000 }, ref);
    });
});
