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
                enable: async () => {},
                disable: async () => {},
            });
        }

        return locksMap.get(lockType);
    };

    return {
        idleTimer: {
            getMaxTime: () => {},
            setMaxTime: async () => {},
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
                    setComplete: async () => {},
                },
                profile: {
                    onChange: createSubscriber(),
                },
                devices: {
                    onChange: createSubscriber(),
                    onCurrentRevoke: createSubscriber(),
                },
                apps: {
                    onChange: createSubscriber(),
                    onLinkCurrentChange: createSubscriber(),
                },
            });
        }

        return identitiesMap.get(id);
    };

    return {
        get: getIdentitiy,
        onChange: createSubscriber(),
        onLoad: createSubscriber(),
    };
};

const createMockIdmWallet = () => ({
    locker: createLocker(),
    identities: createIdentities(),
});

export default createMockIdmWallet;
