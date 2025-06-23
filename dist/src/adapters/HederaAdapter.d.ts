import { PrivateKey } from '@hashgraph/sdk';
import { Logger } from 'winston';
import { LedgerAdapter, LedgerType, Asset, Account, Transaction, TransactionStatus } from '../types';
export interface HederaAdapterConfig {
    network: 'mainnet' | 'testnet' | 'previewnet';
    operatorId: string;
    operatorKey: string;
    treasuryId?: string;
    treasuryKey?: string;
}
export declare class HederaAdapter implements LedgerAdapter {
    readonly ledgerId: string;
    readonly name: string;
    readonly type: LedgerType;
    private client;
    private operatorId;
    private operatorKey;
    private treasuryId;
    private treasuryKey;
    private config;
    private logger;
    private connected;
    private tokenCache;
    private accountCache;
    constructor(config: HederaAdapterConfig, logger: Logger);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    createAsset(assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset>;
    getAsset(assetId: string): Promise<Asset | null>;
    createAccount(institutionId: string): Promise<Account>;
    getAccount(accountId: string): Promise<Account | null>;
    getBalance(accountId: string, assetId: string): Promise<bigint>;
    transfer(from: string, to: string, assetId: string, amount: bigint): Promise<string>;
    lockAsset(accountId: string, assetId: string, amount: bigint): Promise<string>;
    unlockAsset(accountId: string, assetId: string, amount: bigint): Promise<string>;
    getTransaction(txHash: string): Promise<Transaction | null>;
    getLockedBalance(accountId: string, assetId: string): Promise<bigint>;
    getAvailableBalance(accountId: string, assetId: string): Promise<bigint>;
    getTransactionStatus(txHash: string): Promise<TransactionStatus>;
    getOperatorId(): string;
    getTreasuryId(): string;
    getOperatorBalance(): Promise<bigint>;
    associateToken(accountId: string, tokenId: string, accountKey: PrivateKey): Promise<string>;
    getBalanceHistory(accountId: string): Array<{
        timestamp: Date;
        assetId: string;
        balance: bigint;
        operation: string;
    }>;
}
//# sourceMappingURL=HederaAdapter.d.ts.map