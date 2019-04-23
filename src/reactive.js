import { wrap, throttle } from 'lodash';
import isPromise from 'p-is-promise';

const wrapAccessor = (obj, prop, modifierFn, cleanupFns) => {
    const alreadyModifiedSymbol = Symbol();
    const originalFn = obj[prop];

    obj[prop] = wrap(obj[prop], function (fn, ...args) {
        const ret = fn.apply(this, args); // eslint-disable-line babel/no-invalid-this

        if (!ret[alreadyModifiedSymbol]) {
            modifierFn(ret);
            Object.defineProperty(ret, alreadyModifiedSymbol, { writable: true, value: true });

            cleanupFns.push(() => {
                ret[alreadyModifiedSymbol] = false;
            });
        }

        return ret;
    });

    cleanupFns.push(() => {
        obj[prop] = originalFn;
    });
};

const wrapMutator = (obj, prop, changeFn, cleanupFns) => {
    const originalFn = obj[prop];

    obj[prop] = wrap(obj[prop], function (fn, ...args) {
        let ret = fn.apply(this, args); // eslint-disable-line babel/no-invalid-this

        if (isPromise(ret)) {
            ret = ret.then((value) => {
                changeFn();

                return value;
            }, (err) => {
                changeFn();

                throw err;
            });
        } else {
            changeFn();
        }

        return ret;
    });

    cleanupFns.push(() => {
        obj[prop] = originalFn;
    });
};

const makeReactive = (idmWallet, onChange) => {
    const changeFn = throttle(onChange, 1, { leading: false });

    const cleanupFns = [];
    const closuredWrapAccessor = (...args) => wrapAccessor(...args, cleanupFns);
    const closuredWrapMutator = (...args) => wrapMutator(...args, cleanupFns);

    // Locker
    // ------------------------------
    closuredWrapMutator(idmWallet.locker.idleTimer, 'setMaxTime', changeFn);
    closuredWrapMutator(idmWallet.locker.idleTimer, 'restart', changeFn);

    closuredWrapAccessor(idmWallet.locker, 'getLock', (lock) => {
        closuredWrapMutator(lock, 'enable', changeFn);
        closuredWrapMutator(lock, 'disable', changeFn);
    });

    cleanupFns.push(idmWallet.locker.onLockedChange(changeFn));

    return () => {
        cleanupFns.forEach((fn) => fn());
        cleanupFns.length = 0;

        // Cancel any pending timer of the throttled `changedFn`
        changeFn.cancel();
    };
};

export default makeReactive;
