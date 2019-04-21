import pDelay from 'delay';

const createLocker = () => {
    const locksMap = new Map();

    const idleTimer = {
        getMaxTime: () => {},
        setMaxTime: () => {},
        restart: () => {},
    };

    const getLock = (lockType) => {
        if (!locksMap.has(lockType)) {
            locksMap.set(lockType, {
                enable: () => pDelay(10),
                disable: () => pDelay(10),
            });
        }

        return locksMap.get(lockType);
    };

    return {
        getIdleTimer: () => idleTimer,
        getMasterLock: () => getLock('passphrase'),
        getLock,
        onLockedChange: jest.fn(() => {}),
    };
};

const createMockIdmWallet = () => ({
    locker: createLocker(),
});

export default createMockIdmWallet;
