import pDelay from 'delay';
import pEachSeries from 'p-each-series';
import makeReactive from '../src/reactive';
import createMockIdmWallet from './util/mock-idm-wallet';

const THROTTLE_WAIT_TIME = 10;

it('should throttle several changes in a row', async () => {
    const onChange = jest.fn(() => {});
    const idmWallet = makeReactive(createMockIdmWallet(), onChange);

    await Promise.all([
        idmWallet.locker.getIdleTimer().setMaxTime(2000),
        idmWallet.locker.getIdleTimer().restart(),
    ]);

    await pDelay(THROTTLE_WAIT_TIME);
    expect(onChange).toHaveBeenCalledTimes(1);
});

it('should not throttle several spaced changes', async () => {
    const onChange = jest.fn(() => {});
    const idmWallet = makeReactive(createMockIdmWallet(), onChange);

    const fns = [
        () => idmWallet.locker.getIdleTimer().setMaxTime(2000),
        () => idmWallet.locker.getIdleTimer().restart(),
    ];

    await pEachSeries(fns, async (fn) => {
        await pDelay(THROTTLE_WAIT_TIME * 2);
        await fn();
    });

    await pDelay(THROTTLE_WAIT_TIME);
    expect(onChange).toHaveBeenCalledTimes(fns.length);
});

it('should wait for promises (fulfilled)', async () => {
    const onChange = jest.fn(() => {});
    const idmWallet = createMockIdmWallet();

    idmWallet.locker.getIdleTimer().restart = () => pDelay(THROTTLE_WAIT_TIME * 3);
    makeReactive(idmWallet, onChange);

    const promise = idmWallet.locker.getIdleTimer().restart();

    await pDelay(THROTTLE_WAIT_TIME);
    expect(onChange).toHaveBeenCalledTimes(0);

    await promise;
    await pDelay(THROTTLE_WAIT_TIME);
    expect(onChange).toHaveBeenCalledTimes(1);
});

it('should wait for promises (rejected)', async () => {
    const onChange = jest.fn(() => {});
    const idmWallet = createMockIdmWallet();

    idmWallet.locker.getIdleTimer().restart = async () => {
        await pDelay(50);
        throw new Error('foo');
    };
    makeReactive(idmWallet, onChange);

    const promise = idmWallet.locker.getIdleTimer().restart();

    await pDelay(THROTTLE_WAIT_TIME);
    expect(onChange).toHaveBeenCalledTimes(0);

    await expect(promise).rejects.toThrow('foo');
    await pDelay(THROTTLE_WAIT_TIME);
    expect(onChange).toHaveBeenCalledTimes(1);
});

describe('locker scope', () => {
    it('should wrap locker mutators', async () => {
        const onChange = jest.fn(() => {});
        const idmWallet = makeReactive(createMockIdmWallet(), onChange);

        const fns = [
            () => idmWallet.locker.getIdleTimer().setMaxTime(2000),
            () => idmWallet.locker.getIdleTimer().restart(),
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

    it('should listen to onLockedChange', async () => {
        const onChange = jest.fn(() => {});
        const idmWallet = makeReactive(createMockIdmWallet(), onChange);

        expect(idmWallet.locker.onLockedChange).toHaveBeenCalledTimes(1);

        idmWallet.locker.onLockedChange.mock.calls[0][0]();

        await pDelay(THROTTLE_WAIT_TIME);
        expect(onChange).toHaveBeenCalledTimes(1);
    });
});
