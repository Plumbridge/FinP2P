// Axelar Adapter - Cross-chain asset transfer using Axelar network
export { AxelarAdapter } from './AxelarAdapter';
export type { 
  AxelarConfig, 
  TransferRequest, 
  TransferResult, 
  ChainInfo 
} from './AxelarAdapter';

// HTLC Contract - Hash Time Locked Contracts for atomic swaps
export { HTLCContract } from './HTLCContract';
export type {
  HTLCConfig,
  HTLCData,
  HTLCResult
} from './HTLCContract';

// Atomic Swap Coordinator - Real atomic swap implementation
export { AtomicSwapCoordinator } from './AtomicSwapCoordinator';
export type {
  AtomicSwapRequest,
  AtomicSwapState
} from './AtomicSwapCoordinator';