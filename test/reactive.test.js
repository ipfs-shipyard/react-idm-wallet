import pDelay from 'delay';
import pEachSeries from 'p-each-series';
import makeReactive from '../src/reactive';
import createMockIdmWallet from './utils/mock-idm-wallet';

const THROTTLE_WAIT_TIME = 10;

it('should throttle several changes in a row', async () => {
    const idmWallet = createMockIdmWallet();
    const onChange = jest.fn();

    makeReactive(idmWallet, onChange);

    await Promise.all([
        idmWallet.locker.idleTimer.setMaxTime(2000),
        idmWallet.locker.idleTimer.restart(),
    ]);

    await pDelay(THROTTLE_WAIT_TIME);
    expect(onChange).toHaveBeenCalledTimes(1);
});

it('should not throttle several spaced changes', async () => {
    const idmWallet = createMockIdmWallet();
    const onChange = jest.fn();

    makeReactive(idmWallet, onChange);

    const fns = [
        () => idmWallet.locker.idleTimer.setMaxTime(2000),
        () => idmWallet.locker.idleTimer.restart(),
    ];

    await pEachSeries(fns, async (fn) => {
        await fn();
        await pDelay(THROTTLE_WAIT_TIME * 2);
    });

    await pDelay(THROTTLE_WAIT_TIME);
    expect(onChange).toHaveBeenCalledTimes(fns.length);
});

it('should wait for promises (fulfilled)', async () => {
    const idmWallet = createMockIdmWallet();
    const onChange = jest.fn();

    idmWallet.locker.idleTimer.restart = () => pDelay(THROTTLE_WAIT_TIME * 3);
    makeReactive(idmWallet, onChange);

    const promise = idmWallet.locker.idleTimer.restart();

    await pDelay(THROTTLE_WAIT_TIME);
    expect(onChange).toHaveBeenCalledTimes(0);

    await promise;
    await pDelay(THROTTLE_WAIT_TIME);
    expect(onChange).toHaveBeenCalledTimes(1);
});

it('should wait for promises (rejected)', async () => {
    const idmWallet = createMockIdmWallet();
    const onChange = jest.fn();

    idmWallet.locker.idleTimer.restart = async () => {
        await pDelay(50);
        throw new Error('foo');
    };
    makeReactive(idmWallet, onChange);

    const promise = idmWallet.locker.idleTimer.restart();

    await pDelay(THROTTLE_WAIT_TIME);
    expect(onChange).toHaveBeenCalledTimes(0);

    await expect(promise).rejects.toThrow('foo');
    await pDelay(THROTTLE_WAIT_TIME);
    expect(onChange).toHaveBeenCalledTimes(1);
});

it('should add a cancel method to promises to mute them', async () => {
    const idmWallet = createMockIdmWallet();
    const onChange = jest.fn();

    idmWallet.locker.idleTimer.restart = async () => {
        await pDelay(50);
        throw new Error('foo');
    };
    makeReactive(idmWallet, onChange);

    const promise = idmWallet.locker.idleTimer.restart();

    promise.cancel();

    await pDelay(100);
    expect(onChange).toHaveBeenCalledTimes(0);
});

describe('locker scope', () => {
    it('should wrap mutators', async () => {
        const idmWallet = createMockIdmWallet();
        const onChange = jest.fn();

        makeReactive(idmWallet, onChange);

        const fns = [
            () => idmWallet.locker.idleTimer.setMaxTime(2000),
            () => idmWallet.locker.idleTimer.restart(),
            () => idmWallet.locker.getLock('passphrase').enable(),
            () => idmWallet.locker.getLock('passphrase').disable(),
        ];

        await pEachSeries(fns, async (fn) => {
            await fn();
            await pDelay(THROTTLE_WAIT_TIME);
        });

        expect(onChange).toHaveBeenCalledTimes(fns.length);
    });

    it('should add listeners', async () => {
        const idmWallet = createMockIdmWallet();
        const onChange = jest.fn();

        makeReactive(idmWallet, onChange);

        const fns = [
            idmWallet.locker.onLockedChange,
        ];

        await pEachSeries(fns, async (fn) => {
            expect(fn).toHaveBeenCalledTimes(1);

            fn.mock.calls[0][0]();
            await pDelay(THROTTLE_WAIT_TIME);
        });

        expect(onChange).toHaveBeenCalledTimes(fns.length);
    });

    it('should cleanup wrapped mutators', async () => {
        const idmWallet = createMockIdmWallet();
        const onChange = jest.fn();

        const originalSetMaxTime = idmWallet.locker.idleTimer.setMaxTime;
        const originalGetLock = idmWallet.locker.getLock;
        const originalEnableLock = idmWallet.locker.getLock('passphrase').enable;

        const cleanup = makeReactive(idmWallet, onChange);

        expect(idmWallet.locker.idleTimer.setMaxTime).not.toBe(originalSetMaxTime);
        expect(idmWallet.locker.getLock).not.toBe(originalGetLock);
        expect(idmWallet.locker.getLock('passphrase').enable).not.toBe(originalEnableLock);

        cleanup();

        expect(idmWallet.locker.idleTimer.setMaxTime).toBe(originalSetMaxTime);
        expect(idmWallet.locker.getLock).toBe(originalGetLock);
        expect(idmWallet.locker.getLock('passphrase').enable).toBe(originalEnableLock);

        // Trigger mutation and check if `onChange` wasn't called
        await idmWallet.locker.idleTimer.setMaxTime();

        await pDelay(THROTTLE_WAIT_TIME);
        expect(onChange).toHaveBeenCalledTimes(0);
    });

    it('should cleanup listeners', async () => {
        const idmWallet = createMockIdmWallet();
        const onChange = jest.fn();

        const cleanup = makeReactive(idmWallet, onChange);

        cleanup();

        const fns = [
            idmWallet.locker.onLockedChange,
        ];

        fns.forEach((fn) => expect(fn.unsubscribe).toHaveBeenCalledTimes(1));
    });
});

describe('identities scope', () => {
    it('should wrap mutators', async () => {
        const idmWallet = createMockIdmWallet();
        const onChange = jest.fn();

        makeReactive(idmWallet, onChange);

        const identity = idmWallet.identities.get('foo');
        const fns = [
            () => identity.backup.setComplete(),
        ];

        await pEachSeries(fns, async (fn) => {
            await fn();
            await pDelay(THROTTLE_WAIT_TIME);
        });

        expect(onChange).toHaveBeenCalledTimes(fns.length);
    });

    it('should add listeners', async () => {
        const idmWallet = createMockIdmWallet();
        const onChange = jest.fn();

        makeReactive(idmWallet, onChange);

        const identity = idmWallet.identities.get('foo');
        const fns = [
            idmWallet.identities.onLoad,
            idmWallet.identities.onChange,
            identity.onRevoke,
            identity.profile.onChange,
            identity.devices.onChange,
            identity.devices.onCurrentRevoke,
            identity.apps.onChange,
            identity.apps.onLinkCurrentChange,
        ];

        await pEachSeries(fns, async (fn) => {
            expect(fn).toHaveBeenCalledTimes(1);

            fn.mock.calls[0][0]();
            await pDelay(THROTTLE_WAIT_TIME);
        });

        expect(onChange).toHaveBeenCalledTimes(fns.length);
    });

    it('should cleanup wrapped mutators', async () => {
        const idmWallet = createMockIdmWallet();
        const onChange = jest.fn();

        let identity = idmWallet.identities.get('foo');

        const originalBackupSetComplete = identity.backup.setComplete;

        const cleanup = makeReactive(idmWallet, onChange);

        identity = idmWallet.identities.get('foo');

        expect(identity.backup.setComplete).not.toBe(originalBackupSetComplete);

        cleanup();

        expect(identity.backup.setComplete).toBe(originalBackupSetComplete);

        // Trigger mutation and check if `onChange` wasn't called
        await identity.backup.setComplete();

        await pDelay(THROTTLE_WAIT_TIME);
        expect(onChange).toHaveBeenCalledTimes(0);
    });

    it('should cleanup listeners', async () => {
        const idmWallet = createMockIdmWallet();
        const onChange = jest.fn();

        const cleanup = makeReactive(idmWallet, onChange);
        const identity = idmWallet.identities.get('foo');

        cleanup();

        const fns = [
            idmWallet.identities.onLoad,
            idmWallet.identities.onChange,
            identity.onRevoke,
            identity.profile.onChange,
            identity.devices.onChange,
            identity.devices.onCurrentRevoke,
            identity.apps.onChange,
            identity.apps.onLinkCurrentChange,
        ];

        fns.forEach((fn) => expect(fn.unsubscribe).toHaveBeenCalledTimes(1));
    });
});
