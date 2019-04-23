import pDelay from 'delay';
import pEachSeries from 'p-each-series';
import makeReactive from '../src/reactive';
import createMockIdmWallet from './util/mock-idm-wallet';

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
        await pDelay(THROTTLE_WAIT_TIME * 2);
        await fn();
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
            await pDelay(THROTTLE_WAIT_TIME * 2);
            await fn();
        });

        await pDelay(THROTTLE_WAIT_TIME);
        expect(onChange).toHaveBeenCalledTimes(fns.length);
    });

    it('should add listeners', async () => {
        const idmWallet = createMockIdmWallet();
        const onChange = jest.fn();

        makeReactive(idmWallet, onChange);

        expect(idmWallet.locker.onLockedChange).toHaveBeenCalledTimes(1);

        idmWallet.locker.onLockedChange.mock.calls[0][0]();

        await pDelay(THROTTLE_WAIT_TIME);
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('should cleanup wrapped mutators', async () => {
        const idmWallet = createMockIdmWallet();
        const onChange = jest.fn();

        const cleanup = makeReactive(idmWallet, onChange);
        const setMaxTime = idmWallet.locker.idleTimer.setMaxTime;

        // Cleanup and trigger mutator
        cleanup();
        idmWallet.locker.idleTimer.setMaxTime();
        await pDelay(THROTTLE_WAIT_TIME);

        expect(idmWallet.locker.idleTimer.setMaxTime).not.toBe(setMaxTime);
        expect(onChange).toHaveBeenCalledTimes(0);
    });

    it('should cleanup listeners', async () => {
        const idmWallet = createMockIdmWallet();
        const onChange = jest.fn();

        const cleanup = makeReactive(idmWallet, onChange);
        const setMaxTime = idmWallet.locker.idleTimer.setMaxTime;

        // Trigger mutator
        idmWallet.locker.idleTimer.setMaxTime();
        await pDelay(THROTTLE_WAIT_TIME);

        // Cleanup and trigger mutator
        cleanup();
        idmWallet.locker.idleTimer.setMaxTime();
        await pDelay(THROTTLE_WAIT_TIME);

        expect(idmWallet.locker.idleTimer.setMaxTime).not.toBe(setMaxTime);
        expect(onChange).toHaveBeenCalledTimes(1);
    });
});
