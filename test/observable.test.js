import pDelay from 'delay';
import makeObservable from '../src/observable';
import createMockIdmWallet from './utils/mock-idm-wallet';

const THROTTLE_WAIT_TIME = 10;

it('should return an object with the correct methods', () => {
    const idmWallet = createMockIdmWallet();
    const observable = makeObservable(idmWallet);

    expect(typeof observable.subscribe).toBe('function');
    expect(typeof observable.unsubscribe).toBe('function');
    expect(typeof observable.cleanup).toBe('function');
});

it('should make the idm wallet reactive but just once', () => {
    const idmWallet = createMockIdmWallet();
    const originalSetMaxTime = idmWallet.locker.idleTimer.setMaxTime;
    const observable1 = makeObservable(idmWallet);
    const setMaxTime1 = idmWallet.locker.idleTimer.setMaxTime;
    const observable2 = makeObservable(idmWallet);
    const setMaxTime2 = idmWallet.locker.idleTimer.setMaxTime;

    expect(originalSetMaxTime).not.toBe(observable1);
    expect(observable1).toBe(observable2);
    expect(setMaxTime1).toBe(setMaxTime2);
});

it('should call all subscribers once a change happens', async () => {
    const idmWallet = createMockIdmWallet();
    const observable = makeObservable(idmWallet);
    const subscriber1 = jest.fn();
    const subscriber2 = jest.fn();

    observable.subscribe(subscriber1);
    observable.subscribe(subscriber2);

    // Trigger mutation
    idmWallet.locker.idleTimer.restart();

    await pDelay(THROTTLE_WAIT_TIME);
    expect(subscriber1).toHaveBeenCalledTimes(1);
    expect(subscriber2).toHaveBeenCalledTimes(1);
});

it('should not add the same subscriber twice', async () => {
    const idmWallet = createMockIdmWallet();
    const observable = makeObservable(idmWallet);
    const subscriber = jest.fn();

    observable.subscribe(subscriber);
    observable.subscribe(subscriber);

    // Trigger mutation
    idmWallet.locker.idleTimer.restart();

    await pDelay(THROTTLE_WAIT_TIME);
    expect(subscriber).toHaveBeenCalledTimes(1);
});

it('should unsubscribe via a direct call to unsubscribe()', async () => {
    const idmWallet = createMockIdmWallet();
    const observable = makeObservable(idmWallet);
    const subscriber = jest.fn();

    observable.subscribe(subscriber);
    observable.unsubscribe(subscriber);

    // Trigger mutation
    idmWallet.locker.idleTimer.restart();

    await pDelay(THROTTLE_WAIT_TIME);
    expect(subscriber).toHaveBeenCalledTimes(0);
});

it('should unsubscribe via the function returned by subscribe', async () => {
    const idmWallet = createMockIdmWallet();
    const observable = makeObservable(idmWallet);
    const subscriber = jest.fn();

    observable.subscribe(subscriber)();

    // Trigger mutation
    idmWallet.locker.idleTimer.restart();

    await pDelay(THROTTLE_WAIT_TIME);
    expect(subscriber).toHaveBeenCalledTimes(0);
});

it('should restore the idm wallet to its original state when calling cleanup and there are not listeners', () => {
    const idmWallet = createMockIdmWallet();
    const originalSetMaxTime = idmWallet.locker.idleTimer.setMaxTime;
    const observable = makeObservable(idmWallet);

    observable.subscribe(() => {})();
    observable.cleanup();

    expect(idmWallet.locker.idleTimer.setMaxTime).toBe(originalSetMaxTime);
});

it('should not restore the idm wallet to its original state when calling cleanup and there is a listener', () => {
    const idmWallet = createMockIdmWallet();
    const originalSetMaxTime = idmWallet.locker.idleTimer.setMaxTime;
    const observable = makeObservable(idmWallet);

    observable.subscribe(() => {});
    observable.cleanup();

    expect(idmWallet.locker.idleTimer.setMaxTime).not.toBe(originalSetMaxTime);
});

it('should not fail if calling cleanup twice', () => {
    const idmWallet = createMockIdmWallet();
    const originalSetMaxTime = idmWallet.locker.idleTimer.setMaxTime;
    const observable = makeObservable(idmWallet);

    observable.subscribe(() => {})();
    observable.cleanup();
    observable.cleanup();

    expect(idmWallet.locker.idleTimer.setMaxTime).toBe(originalSetMaxTime);
});

it('should make idm wallet reactive again after adding a subscriber after a cleanup', async () => {
    const idmWallet = createMockIdmWallet();
    const originalSetMaxTime = idmWallet.locker.idleTimer.setMaxTime;
    const observable = makeObservable(idmWallet);
    const subscriber = jest.fn();

    observable.cleanup();
    observable.subscribe(subscriber);

    // Trigger mutation
    idmWallet.locker.idleTimer.restart();

    await pDelay(THROTTLE_WAIT_TIME);
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(idmWallet.locker.idleTimer.setMaxTime).not.toBe(originalSetMaxTime);
});
