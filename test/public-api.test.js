import { IdmWalletProvider, connectIdmWallet, createIdmWalletObservable } from '../src';

it('should export IdmWalletProvider', () => {
    expect(typeof IdmWalletProvider).toBe('function');
});

it('should export connectIdmWallet', () => {
    expect(typeof connectIdmWallet).toBe('function');
});

it('should export createIdmWalletObservable', () => {
    expect(typeof createIdmWalletObservable).toBe('function');
});
