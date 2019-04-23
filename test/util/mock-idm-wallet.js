import pDelay from 'delay';

const createLocker = () => {
    const locksMap = new Map();

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
        idleTimer: {
            getMaxTime: () => {},
            setMaxTime: () => {},
            restart: () => {},
        },
        masterLock: getLock('passphrase'),
        getLock,
        onLockedChange: jest.fn(() => () => {}),
    };
};

const createMockIdmWallet = () => ({
    locker: createLocker(),
});

export default createMockIdmWallet;
