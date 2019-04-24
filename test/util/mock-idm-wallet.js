const createLocker = () => {
    const locksMap = new Map();

    const getLock = (lockType) => {
        if (!locksMap.has(lockType)) {
            locksMap.set(lockType, {
                enable: () => Promise.resolve(),
                disable: () => Promise.resolve(),
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
