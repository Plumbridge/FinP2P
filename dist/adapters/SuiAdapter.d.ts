import { Logger } from 'winston';
import { LedgerAdapter, LedgerType, Asset, Account, Transaction, TransactionStatus } from '../types';
export interface SuiAdapterConfig {
    network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
    privateKey?: string;
    rpcUrl?: string;
    packageId?: string;
}
export declare class SuiAdapter implements LedgerAdapter {
    readonly ledgerId: string;
    readonly name: string;
    readonly type: LedgerType;
    private client;
    private keypair;
    private config;
    private logger;
    private connected;
    private packageId;
    private readonly ASSET_MODULE;
    private readonly ACCOUNT_MODULE;
    private readonly TRANSFER_MODULE;
    constructor(config: SuiAdapterConfig, logger: Logger);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    createAsset(assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset>;
    getAsset(assetId: string): Promise<Asset | null>;
    createAccount(institutionId: string): Promise<Account>;
    importAccount(privateKey: string): Promise<Account>;
    getAccount(accountId: string): Promise<Account | null>;
    getBalance(accountId: string, assetId: string): Promise<bigint>;
    prepareTransfer(transferData: any): Promise<any>;
    executeTransfer(transferData: any): Promise<string>;
    transfer(from: string, to: string, assetId: string, amount: bigint): Promise<string>;
    lockAsset(accountId: string, assetId: string, amount: bigint): Promise<string>;
    unlockAsset(accountId: string, assetId: string, amount: bigint): Promise<string>;
    getTransaction(txHash: string): Promise<Transaction | null>;
    getLockedBalance(accountId: string, assetId: string): Promise<bigint>;
    getAvailableBalance(accountId: string, assetId: string): Promise<bigint>;
    getTransactionStatus(txHash: string): Promise<TransactionStatus>;
    getAddress(): string;
    getGasBalance(): Promise<bigint>;
    requestFaucet(): Promise<void>;
    getPrivateKeyBase64(): string;
    getBalanceHistory(accountId: string): Array<{
        timestamp: Date;
        assetId: string;
        balance: bigint;
        operation: string;
    }>;
    getLedgerType(): LedgerType;
}
//# sourceMappingURL=SuiAdapter.d.ts.map