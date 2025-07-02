import { createClient, RedisClientType } from 'redis';
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

enum SwapState {
  INITIATED = 'INITIATED',
  LEG1_PREPARE_SENT = 'LEG1_PREPARE_SENT',
  LEG1_PREPARE_CONFIRMED = 'LEG1_PREPARE_CONFIRMED',
  LEG2_PREPARE_SENT = 'LEG2_PREPARE_SENT',
  LEG2_PREPARE_CONFIRMED = 'LEG2_PREPARE_CONFIRMED',
  COMMIT_SENT = 'COMMIT_SENT',
  COMPLETED = 'COMPLETED',
  ROLLBACK = 'ROLLBACK',
}

interface TransferJob {
  transferId: string;
  state: SwapState;
  fromChain: string;
  toChain: string;
  fromAsset: string;
  toAsset: string;
  amount: number;
  createdAt: number;
  updatedAt: number;
}

export class FinP2PRouter extends EventEmitter {
  private redis: RedisClientType;
  private subscriber: RedisClientType;
  private logger: Logger;
  private suiAdapter: any;
  private hederaAdapter: any;
  private transfers: Map<string, TransferJob> = new Map();

  constructor(suiAdapter: any, hederaAdapter: any, logger: Logger) {
    super();
    this.suiAdapter = suiAdapter;
    this.hederaAdapter = hederaAdapter;
    this.logger = logger;
    this.redis = createClient({ url: process.env.REDIS_URL });
    this.subscriber = this.redis.duplicate();
  }

  async connect(): Promise<void> {
    await this.redis.connect();
    await this.subscriber.connect();
    this.logger.info('Connected to Redis for FinP2P Router.');
    this.subscribeToTransfers();
  }

  private subscribeToTransfers(): void {
    this.subscriber.subscribe('finp2p:transfers', (message) => {
      const job: TransferJob = JSON.parse(message);
      this.handleTransferJob(job);
    });
  }

  private async publishTransferJob(job: TransferJob): Promise<void> {
    await this.redis.publish('finp2p:transfers', JSON.stringify(job));
  }

  private async updateState(transferId: string, state: SwapState): Promise<void> {
    const job = this.transfers.get(transferId);
    if (job) {
      job.state = state;
      job.updatedAt = Date.now();
      this.transfers.set(transferId, job);
      await this.redis.set(`transfer:${transferId}`, JSON.stringify(job));
      this.logger.info(`Transfer ${transferId} state updated to ${state}`);
      this.emit('stateChange', transferId, state);
    }
  }

  async initiateSwap(fromChain: string, toChain: string, fromAsset: string, toAsset: string, amount: number): Promise<string> {
    const transferId = uuidv4();
    const job: TransferJob = {
      transferId,
      state: SwapState.INITIATED,
      fromChain,
      toChain,
      fromAsset,
      toAsset,
      amount,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.transfers.set(transferId, job);
    await this.redis.set(`transfer:${transferId}`, JSON.stringify(job));
    this.logger.info(`Initiated swap ${transferId}`);
    this.publishTransferJob(job);
    return transferId;
  }

  private handleTransferJob(job: TransferJob): void {
    switch (job.state) {
      case SwapState.INITIATED:
        this.updateState(job.transferId, SwapState.LEG1_PREPARE_SENT);
        // In a real scenario, you would call the fromChain adapter to lock assets
        this.emit('lockAsset', job); // Emitting event for SuiAdapter to handle
        break;
      // Add other state handlers here
    }
  }

  handleAssetLocked(event: any): void {
    const { transferId } = event;
    this.updateState(transferId, SwapState.LEG1_PREPARE_CONFIRMED);
    const job = this.transfers.get(transferId);
    if (job) {
      this.executeHederaLeg(job);
    }
  }

  executeHederaLeg(job: TransferJob): void {
    this.updateState(job.transferId, SwapState.LEG2_PREPARE_SENT);
    // In a real scenario, you would call the Hedera adapter to mint tokens
    this.emit('mintToken', job); // Emitting event for HederaAdapter to handle
  }

  handleHederaMintCompleted(transferId: string): void {
    this.updateState(transferId, SwapState.LEG2_PREPARE_CONFIRMED);
    this.commitSwap(transferId);
  }

  async commitSwap(transferId: string): Promise<void> {
    await this.updateState(transferId, SwapState.COMMIT_SENT);
    // Logic to finalize both legs of the swap
    this.logger.info(`Committing swap ${transferId}`);
    await this.updateState(transferId, SwapState.COMPLETED);
    this.logger.info(`Swap ${transferId} completed successfully.`);
  }

  async rollbackSwap(transferId: string, reason: string): Promise<void> {
    await this.updateState(transferId, SwapState.ROLLBACK);
    this.logger.error(`Rolling back swap ${transferId} due to: ${reason}`);
    // Logic to revert transactions on both chains
  }

  async disconnect(): Promise<void> {
    if (this.redis.isOpen) {
      await this.redis.disconnect();
    }
    if (this.subscriber.isOpen) {
      await this.subscriber.disconnect();
    }
    this.logger.info('Disconnected from Redis for FinP2P Router.');
  }
}