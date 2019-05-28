const createSubscriber = () => {
    const unsubscribe = jest.fn();
    const subscribe = jest.fn(() => unsubscribe);

    subscribe.unsubscribe = unsubscribe;

    return subscribe;
};

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
        onLockedChange: createSubscriber(),
    };
};

const createIdentities = () => {
    const identitiesMap = new Map();

    const getIdentitiy = (id) => {
        if (!identitiesMap.has(id)) {
            identitiesMap.set(id, {
                onRevoke: createSubscriber(),
                backup: {
                    onComplete: createSubscriber(),
                },
                profile: {
                    onChange: createSubscriber(),
                },
                devices: {
                    onChange: createSubscriber(),
                    onCurrentRevoke: createSubscriber(),
                },
            });
        }

        return identitiesMap.get(id);
    };

    return {
        load: () => Promise.resolve(),
        get: getIdentitiy,
        onChange: createSubscriber(),
    };
};

const createMockIdmWallet = () => ({
    locker: createLocker(),
    identities: createIdentities(),
});

export default createMockIdmWallet;
