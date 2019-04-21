import { wrap, throttle } from 'lodash';
import isPromise from 'p-is-promise';

const wrapAccessor = (obj, prop, modifierFn) => {
    const alreadyModifiedSymbol = Symbol();

    obj[prop] = wrap(obj[prop], function (fn, ...args) {
        const ret = fn.apply(this, args); // eslint-disable-line babel/no-invalid-this

        if (!ret[alreadyModifiedSymbol]) {
            modifierFn(ret);
            Object.defineProperty(ret, alreadyModifiedSymbol, { value: true });
        }

        return ret;
    });
};

const wrapMutator = (obj, prop, changeFn) => {
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
};

const makeReactive = (idmWallet, onChange) => {
    const changeFn = throttle(onChange, 1, { leading: false });

    // Locker
    // ------------------------------
    wrapAccessor(idmWallet.locker, 'getIdleTimer', (idleTimer) => {
        wrapMutator(idleTimer, 'setMaxTime', changeFn);
        wrapMutator(idleTimer, 'restart', changeFn);
    });

    wrapAccessor(idmWallet.locker, 'getLock', (lock) => {
        wrapMutator(lock, 'enable', changeFn);
        wrapMutator(lock, 'disable', changeFn);
    });

    idmWallet.locker.onLockedChange(changeFn);

    return idmWallet;
};

export default makeReactive;
