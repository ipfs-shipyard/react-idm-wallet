import React, { Component, useState, createRef, forwardRef } from 'react';
import { render, cleanup, fireEvent } from 'react-testing-library';
import testRenderer from 'react-test-renderer';
import pDelay from 'delay';
import IdmWalletContext from '../src/context';
import connectIdmWallet from '../src/connect';
import connectIdmWalletSpied from './util/spy-connect';
import forwardRefSpied from './util/spy-forward-ref';
import createMockIdmWallet from './util/mock-idm-wallet';
import hideGlobalErrors from './util/hide-global-errors';

const THROTTLE_WAIT_TIME = 10;

beforeEach(() => {
    cleanup();
});

it('should render all the correct components', () => {
    const idmWallet = createMockIdmWallet();

    const MyComponent = () => <p>foo</p>;
    const MyConnectedComponent = connectIdmWallet(() => {})(MyComponent);

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
    const MyConnectedComponent = connectIdmWallet(() => {})(MyComponent);

    try {
        render(<MyConnectedComponent />);
    } catch (err) {
        expect(err.message).toBe('Unable to grab IdmWalletContext value. Did you forget to use <IdmWalletProvider> component?');
    }
});

it('should map wallet to props', () => {
    const idmWallet = createMockIdmWallet();
    const mapWalletToProps = jest.fn(() => ({ maxTime: 5000 }));

    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = connectIdmWallet(mapWalletToProps)(MyComponent);

    render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent foo="bar" />
        </IdmWalletContext.Provider>
    );

    expect(mapWalletToProps).toHaveBeenCalledTimes(1);
    expect(mapWalletToProps).toHaveBeenNthCalledWith(1, idmWallet, { foo: 'bar' });

    expect(MyComponent).toHaveBeenCalledTimes(1);
    expect(MyComponent).toHaveBeenNthCalledWith(1, { maxTime: 5000, foo: 'bar' }, {});
});

it('should support a factory in mapWalletToPros', () => {
    const idmWallet = createMockIdmWallet();
    const mapWalletToPropsFactory = jest.fn(() => mapWalletToProps);
    const mapWalletToProps = jest.fn(() => ({ maxTime: 5000 }));

    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = connectIdmWallet(mapWalletToPropsFactory)(MyComponent);

    render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent foo="bar" />
        </IdmWalletContext.Provider>
    );

    expect(mapWalletToPropsFactory).toHaveBeenCalledTimes(1);
    expect(mapWalletToPropsFactory).toHaveBeenNthCalledWith(1, idmWallet, { foo: 'bar' });
    expect(mapWalletToProps).toHaveBeenCalledTimes(1);
    expect(mapWalletToProps).toHaveBeenNthCalledWith(1, idmWallet, { foo: 'bar' });

    expect(MyComponent).toHaveBeenCalledTimes(1);
    expect(MyComponent).toHaveBeenNthCalledWith(1, { maxTime: 5000, foo: 'bar' }, {});
});

it('should run mapWalletProps factory only once', () => {
    const idmWallet = createMockIdmWallet();
    const mapWalletToPropsFactory = jest.fn(() => mapWalletToProps);
    const mapWalletToProps = jest.fn((idmWallet, ownProps) => ({ maxTime: 5000 })); // eslint-disable-line no-unused-vars

    const MyComponent = () => <p>foo</p>;
    const MyConnectedComponent = connectIdmWallet(mapWalletToPropsFactory)(MyComponent);

    const MyWrapperComponent = () => {
        const [foo, setFoo] = useState('bar');

        return (
            <div onClick={ () => setFoo('baz') }>
                <MyConnectedComponent foo={ foo } />;
            </div>
        );
    };

    const { container } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyWrapperComponent />
        </IdmWalletContext.Provider>
    );

    // Trigger prop change
    fireEvent.click(container.querySelector('div'));

    expect(mapWalletToPropsFactory).toHaveBeenCalledTimes(1);
    expect(mapWalletToProps).toHaveBeenCalledTimes(2);
});

it('should behave correctly when props change and we depend on them', () => {
    const idmWallet = createMockIdmWallet();
    const mapWalletToProps = jest.fn((idmWallet, ownProps) => ({ maxTime: 5000 })); // eslint-disable-line no-unused-vars

    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = connectIdmWallet(mapWalletToProps)(MyComponent);

    const MyWrapperComponent = () => {
        const [foo, setFoo] = useState('bar');

        return (
            <div onClick={ () => setFoo('baz') }>
                <MyConnectedComponent foo={ foo } />;
            </div>
        );
    };

    const { container } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyWrapperComponent />
        </IdmWalletContext.Provider>
    );

    // Trigger prop change
    fireEvent.click(container.querySelector('div'));

    expect(mapWalletToProps).toHaveBeenCalledTimes(2);
    expect(mapWalletToProps).toHaveBeenCalledWith(idmWallet, { foo: 'bar' });
    expect(mapWalletToProps).toHaveBeenCalledWith(idmWallet, { foo: 'baz' });

    expect(MyComponent).toHaveBeenCalledTimes(2);
    expect(MyComponent).toHaveBeenNthCalledWith(1, { maxTime: 5000, foo: 'bar' }, {});
    expect(MyComponent).toHaveBeenNthCalledWith(2, { maxTime: 5000, foo: 'baz' }, {});
});

it('should behave correctly when props change and we do not depend on them', () => {
    const idmWallet = createMockIdmWallet();
    const mapWalletToProps = jest.fn(() => ({ maxTime: 5000 }));

    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = connectIdmWallet(mapWalletToProps)(MyComponent);

    const MyWrapperComponent = () => {
        const [foo, setFoo] = useState('bar');

        return (
            <div onClick={ () => setFoo('baz') }>
                <MyConnectedComponent foo={ foo } />;
            </div>
        );
    };

    const { container } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyWrapperComponent />
        </IdmWalletContext.Provider>
    );

    // Trigger prop change
    fireEvent.click(container.querySelector('div'));

    expect(mapWalletToProps).toHaveBeenCalledTimes(1);
    expect(mapWalletToProps).toHaveBeenCalledWith(idmWallet, { foo: 'bar' });

    expect(MyComponent).toHaveBeenCalledTimes(2);
    expect(MyComponent).toHaveBeenNthCalledWith(1, { maxTime: 5000, foo: 'bar' }, {});
    expect(MyComponent).toHaveBeenNthCalledWith(2, { maxTime: 5000, foo: 'baz' }, {});
});

it('should behave correctly when props do not change and we depend on them', () => {
    const idmWallet = createMockIdmWallet();
    const mapWalletToProps = jest.fn((idmWallet, ownProps) => ({ maxTime: 5000 })); // eslint-disable-line no-unused-vars

    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = connectIdmWalletSpied(mapWalletToProps)(MyComponent);
    const MyWrapperComponent = () => {
        const [counter, setCounter] = useState(0);

        return (
            <div onClick={ () => setCounter(counter + 1) }>
                <MyConnectedComponent foo="bar" />;
            </div>
        );
    };

    const { container } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyWrapperComponent />
        </IdmWalletContext.Provider>
    );

    // Trigger prop change
    fireEvent.click(container.querySelector('div'));

    expect(mapWalletToProps).toHaveBeenCalledTimes(1);
    expect(mapWalletToProps).toHaveBeenCalledWith(idmWallet, { foo: 'bar' });

    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(1, { foo: 'bar' }, null);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(2, { foo: 'bar' }, null);
    expect(MyComponent).toHaveBeenCalledTimes(1);
    expect(MyComponent).toHaveBeenNthCalledWith(1, { maxTime: 5000, foo: 'bar' }, {});
});

it('should behave correctly when idmWallet reports a change', async () => {
    // Hide "An update to null inside a test was not wrapped in act(...)" error
    hideGlobalErrors();

    const idmWallet = (() => {
        let maxTime = 2000;
        const idmWallet = createMockIdmWallet();

        idmWallet.locker.getIdleTimer().getMaxTime = () => maxTime;
        idmWallet.locker.getIdleTimer().setMaxTime = (value) => { maxTime = value; };

        return idmWallet;
    })();
    const mapWalletToProps = jest.fn((idmWallet) => ({
        maxTime: idmWallet.locker.getIdleTimer().getMaxTime(),
    }));

    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = connectIdmWallet(mapWalletToProps)(MyComponent);

    render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent />
        </IdmWalletContext.Provider>
    );

    // Trigger mutation
    idmWallet.locker.getIdleTimer().setMaxTime(9999);

    await pDelay(THROTTLE_WAIT_TIME);

    expect(mapWalletToProps).toHaveBeenCalledTimes(2);

    expect(MyComponent).toHaveBeenCalledTimes(2);
    expect(MyComponent).toHaveBeenNthCalledWith(1, { maxTime: 2000 }, {});
    expect(MyComponent).toHaveBeenNthCalledWith(2, { maxTime: 9999 }, {});
});

it('should behave correctly when idmWallet instance changes', () => {
    const idmWallet1 = createMockIdmWallet();
    const idmWallet2 = createMockIdmWallet();
    const mapWalletToProps = jest.fn(() => {});
    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = connectIdmWalletSpied(mapWalletToProps)(MyComponent);

    const MyProviderWrapperComponent = () => {
        const [idmWallet, setIdmWallet] = useState(idmWallet1);

        return (
            <div onClick={ () => setIdmWallet(idmWallet2) }>
                <IdmWalletContext.Provider idmWallet={ idmWallet }>
                    <MyConnectedComponent />
                </IdmWalletContext.Provider>
            </div>
        );
    };

    const { container } = render(
        <MyProviderWrapperComponent />
    );

    // Trigger idmWallet change
    fireEvent.click(container.querySelector('div'));

    expect(mapWalletToProps).toHaveBeenCalledTimes(2);
    expect(mapWalletToProps).toHaveBeenCalledWith(idmWallet1, {});
    expect(mapWalletToProps).toHaveBeenCalledWith(idmWallet2, {});

    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
    expect(MyComponent).toHaveBeenCalledTimes(1);
});

it('should behave correctly when idmWallet instance changes (factory)', () => {
    const idmWallet1 = createMockIdmWallet();
    const idmWallet2 = createMockIdmWallet();
    const mapWalletToPropsFactory = jest.fn(() => mapWalletToProps);
    const mapWalletToProps = jest.fn(() => ({}));
    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = connectIdmWalletSpied(mapWalletToPropsFactory)(MyComponent);

    const MyProviderWrapperComponent = () => {
        const [idmWallet, setIdmWallet] = useState(idmWallet1);

        return (
            <div onClick={ () => setIdmWallet(idmWallet2) }>
                <IdmWalletContext.Provider idmWallet={ idmWallet }>
                    <MyConnectedComponent />
                </IdmWalletContext.Provider>
            </div>
        );
    };

    const { container } = render(
        <MyProviderWrapperComponent />
    );

    // Trigger idmWallet change
    fireEvent.click(container.querySelector('div'));

    expect(mapWalletToPropsFactory).toHaveBeenCalledTimes(2);
    expect(mapWalletToPropsFactory).toHaveBeenNthCalledWith(1, idmWallet1, {});
    expect(mapWalletToPropsFactory).toHaveBeenNthCalledWith(2, idmWallet2, {});
    expect(mapWalletToProps).toHaveBeenCalledTimes(2);
    expect(mapWalletToProps).toHaveBeenNthCalledWith(1, idmWallet1, {});
    expect(mapWalletToProps).toHaveBeenNthCalledWith(2, idmWallet2, {});

    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
    expect(MyComponent).toHaveBeenCalledTimes(1);
});

it('should behave correctly when mapped props change', async () => {
    // Hide "An update to null inside a test was not wrapped in act(...)" error
    hideGlobalErrors();

    let counter = 0;
    const idmWallet = createMockIdmWallet();
    const mapWalletToProps = jest.fn(() => ({ maxTime: counter++ })); // eslint-disable-line no-plusplus

    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = connectIdmWalletSpied(mapWalletToProps)(MyComponent);

    render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent />
        </IdmWalletContext.Provider>
    );

    // Trigger mutation
    idmWallet.locker.getIdleTimer().setMaxTime(9999);

    await pDelay(THROTTLE_WAIT_TIME);

    expect(mapWalletToProps).toHaveBeenCalledTimes(2);

    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(1, {}, null);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(2, {}, null);
    expect(MyComponent).toHaveBeenCalledTimes(2);
    expect(MyComponent).toHaveBeenNthCalledWith(1, { maxTime: 0 }, {});
    expect(MyComponent).toHaveBeenNthCalledWith(2, { maxTime: 1 }, {});
});

it('should behave correctly when ref changes', () => {
    const ref1 = createRef();
    const ref2 = createRef();
    const idmWallet = createMockIdmWallet();
    const mapWalletToProps = jest.fn(() => {});
    const MyComponent = forwardRefSpied((props, ref) => <p ref={ ref }>foo</p>);
    const MyConnectedComponent = connectIdmWalletSpied(mapWalletToProps)(MyComponent);

    const MyProviderWrapperComponent = () => {
        const [ref, setRef] = useState(ref1);

        return (
            <div onClick={ () => setRef(ref2) }>
                <IdmWalletContext.Provider idmWallet={ idmWallet }>
                    <MyConnectedComponent ref={ ref } />
                </IdmWalletContext.Provider>
            </div>
        );
    };

    const { container } = render(
        <MyProviderWrapperComponent />
    );

    // Trigger idmWallet change
    fireEvent.click(container.querySelector('div'));

    expect(mapWalletToProps).toHaveBeenCalledTimes(1);
    expect(mapWalletToProps).toHaveBeenCalledWith(idmWallet, {});

    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(1, {}, ref1);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(2, {}, ref2);
    expect(MyComponent.render).toHaveBeenCalledTimes(2);
    expect(MyComponent.render).toHaveBeenNthCalledWith(1, {}, ref1);
    expect(MyComponent.render).toHaveBeenNthCalledWith(2, {}, ref2);
});

it('should behave correctly when props, mapped props and ref do not change', () => {
    const idmWallet = createMockIdmWallet();
    const mapWalletToProps = jest.fn(() => ({ maxTime: 5000 }));

    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = connectIdmWalletSpied(mapWalletToProps)(MyComponent);
    const MyWrapperComponent = () => {
        const [counter, setCounter] = useState(0);

        return (
            <div onClick={ () => setCounter(counter + 1) }>
                <MyConnectedComponent foo="bar" />;
            </div>
        );
    };

    const { container } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyWrapperComponent />
        </IdmWalletContext.Provider>
    );

    // Trigger prop change
    fireEvent.click(container.querySelector('div'));

    expect(mapWalletToProps).toHaveBeenCalledTimes(1);
    expect(mapWalletToProps).toHaveBeenCalledWith(idmWallet, { foo: 'bar' });

    expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(1, { foo: 'bar' }, null);
    expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(2, { foo: 'bar' }, null);
    expect(MyComponent).toHaveBeenCalledTimes(1);
    expect(MyComponent).toHaveBeenNthCalledWith(1, { maxTime: 5000, foo: 'bar' }, {});
});

it('should unsubscribe on unmount', async () => {
    // Hide "An update to null inside a test was not wrapped in act(...)" error
    hideGlobalErrors();

    const idmWallet = createMockIdmWallet();
    const mapWalletToProps = jest.fn(() => ({}));

    const MyComponent = jest.fn(() => <p>foo</p>);
    const MyConnectedComponent = connectIdmWallet(mapWalletToProps)(MyComponent);

    const { unmount } = render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent />
        </IdmWalletContext.Provider>
    );

    unmount();

    // Trigger mutation
    idmWallet.locker.getIdleTimer().setMaxTime(9999);

    await pDelay(THROTTLE_WAIT_TIME);

    expect(mapWalletToProps).toHaveBeenCalledTimes(1);

    expect(MyComponent).toHaveBeenCalledTimes(1);
});

it('should apply the correct displayName for the connect component', () => {
    const mapWalletToProps = () => ({});

    const MyComponent = () => <p>foo</p>;
    const MyConnectedComponent = connectIdmWallet(mapWalletToProps)(MyComponent);

    expect(MyConnectedComponent.displayName).toBe('ConnectIdmWallet(MyComponent)');
});

it('should hoist-statics of the wrapped component into the connect component', () => {
    const mapWalletToProps = () => ({});

    const MyComponent = () => <p>foo</p>;

    MyComponent.foo = 'bar';

    const MyConnectedComponent = connectIdmWallet(mapWalletToProps)(MyComponent);

    expect(MyConnectedComponent.foo).toBe('bar');
});

it('should forward ref to the wrapped component (functional)', () => {
    const idmWallet = createMockIdmWallet();
    const mapWalletToProps = () => ({});
    const ref = createRef();

    const MyComponent = forwardRef((props, ref) => <p ref={ ref }>foo</p>);
    const MyConnectedComponent = connectIdmWallet(mapWalletToProps)(MyComponent);

    render(
        <IdmWalletContext.Provider idmWallet={ idmWallet }>
            <MyConnectedComponent ref={ ref } />
        </IdmWalletContext.Provider>
    );

    expect(ref.current instanceof HTMLParagraphElement).toBe(true);
});

it('should forward ref to the wrapped component (class)', () => {
    const idmWallet = createMockIdmWallet();
    const mapWalletToProps = () => ({});
    const ref = createRef();

    class MyComponent extends Component {
        render() {
            return <p>foo</p>;
        }
    }
    const MyConnectedComponent = connectIdmWallet(mapWalletToProps)(MyComponent);

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
        const mapWalletToProps = jest.fn(() => ({ maxTime: 5000 }));

        const MyComponent = jest.fn(() => <p>foo</p>);
        const MyConnectedComponent = connectIdmWalletSpied(mapWalletToProps, { pure: false })(MyComponent);
        const MyWrapperComponent = () => {
            const [counter, setCounter] = useState(0);

            return (
                <div onClick={ () => setCounter(counter + 1) }>
                    <MyConnectedComponent foo="bar" />;
                </div>
            );
        };

        const { container } = render(
            <IdmWalletContext.Provider idmWallet={ idmWallet }>
                <MyWrapperComponent />
            </IdmWalletContext.Provider>
        );

        // Trigger prop change
        fireEvent.click(container.querySelector('div'));

        expect(mapWalletToProps).toHaveBeenCalledTimes(2);
        expect(mapWalletToProps).toHaveBeenCalledWith(idmWallet, { foo: 'bar' });

        expect(MyConnectedComponent.render).toHaveBeenCalledTimes(2);
        expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(1, { foo: 'bar' }, null);
        expect(MyConnectedComponent.render).toHaveBeenNthCalledWith(2, { foo: 'bar' }, null);
        expect(MyComponent).toHaveBeenCalledTimes(2);
        expect(MyComponent).toHaveBeenNthCalledWith(1, { maxTime: 5000, foo: 'bar' }, {});
        expect(MyComponent).toHaveBeenNthCalledWith(2, { maxTime: 5000, foo: 'bar' }, {});
    });

    it('should still call mapWalletToProps factory only once', () => {
        const idmWallet = createMockIdmWallet();
        const mapWalletToPropsFactory = jest.fn(() => mapWalletToProps);
        const mapWalletToProps = jest.fn((idmWallet, ownProps) => ({ maxTime: 5000 })); // eslint-disable-line no-unused-vars

        const MyComponent = () => <p>foo</p>;
        const MyConnectedComponent = connectIdmWallet(mapWalletToPropsFactory, { pure: false })(MyComponent);

        const MyWrapperComponent = () => {
            const [foo, setFoo] = useState('bar');

            return (
                <div onClick={ () => setFoo('baz') }>
                    <MyConnectedComponent foo={ foo } />;
                </div>
            );
        };

        const { container } = render(
            <IdmWalletContext.Provider idmWallet={ idmWallet }>
                <MyWrapperComponent />
            </IdmWalletContext.Provider>
        );

        // Trigger prop change
        fireEvent.click(container.querySelector('div'));

        expect(mapWalletToPropsFactory).toHaveBeenCalledTimes(1);
        expect(mapWalletToProps).toHaveBeenCalledTimes(2);
    });
});
