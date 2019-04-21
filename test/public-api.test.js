import { IdmWalletProvider, connectIdmWallet } from '../src';

it('should export IdmWalletProvider', () => {
    expect(typeof IdmWalletProvider).toBe('function');
});

it('should export connectIdmWallet', () => {
    expect(typeof connectIdmWallet).toBe('function');
});
