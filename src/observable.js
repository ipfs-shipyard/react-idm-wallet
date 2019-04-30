import makeReactive from './reactive';

const observableSymbol = Symbol();

const createObservable = (idmWallet) => {
    if (idmWallet[observableSymbol]) {
        return idmWallet[observableSymbol];
    }

    const subscribers = new Set();
    const notifySubscribers = () => subscribers.forEach((fn) => fn());
    let undoMakeReactive = makeReactive(idmWallet, notifySubscribers);

    const observable = {
        subscribe(fn) {
            // If this is the first subscriber make the IDM Wallet reactive if not already
            if (!subscribers.size && !undoMakeReactive) {
                undoMakeReactive = makeReactive(idmWallet, notifySubscribers);
            }

            subscribers.add(fn);

            return () => observable.unsubscribe(fn);
        },

        unsubscribe(fn) {
            subscribers.delete(fn);
        },

        cleanup() {
            // If this was the last listener, return IDM Wallet to its original state
            if (!subscribers.size && undoMakeReactive) {
                undoMakeReactive();
                undoMakeReactive = undefined;
            }
        },
    };

    Object.defineProperty(idmWallet, observableSymbol, {
        value: observable,
        writable: true,
    });

    return observable;
};

export default createObservable;
