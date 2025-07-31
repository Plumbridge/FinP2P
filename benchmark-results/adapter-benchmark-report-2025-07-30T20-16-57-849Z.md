# Adapter Performance Benchmark Report

**Generated:** Invalid Date

## Executive Summary

This benchmark compares two adapter usage modes:
1. **FinP2P Adapter Mode**: Using FinID resolution + transfer
2. **Direct Adapter Mode**: Using direct wallet addresses

## Performance Comparison

### FinP2P Adapter Mode
- **Approach**: FinP2P Adapter Mode
- **Description**: Using FinID resolution + transfer (transferByFinId)
- **Mode**: real_blockchain
- **Success Rate**: 100.00%
- **Mean Time**: 529.34ms
- **Median Time**: 528.31ms

### Direct Adapter Mode
- **Approach**: Direct Adapter Mode
- **Description**: Using direct wallet addresses (transfer)
- **Mode**: real_blockchain
- **Success Rate**: 100.00%
- **Mean Time**: 528.05ms
- **Median Time**: 536.96ms

## Key Findings

### Performance Overhead
- **Absolute Overhead**: 1.29ms
- **Percentage Overhead**: 0.25%
- **Description**: FinP2P mode is slower

### Efficiency Ratio
- **FinP2P Mean**: 529.34ms
- **Direct Mean**: 528.05ms
- **Ratio**: 1.00

### Success Rates
- **FinP2P Success Rate**: 100.00%
- **Direct Success Rate**: 100.00%

## Detailed Results

### FinP2P Adapter Mode Statistics
- **Total Transfers**: 10
- **Successful Transfers**: 10
- **Minimum Time**: 422.95ms
- **Maximum Time**: 635.79ms
- **Standard Deviation**: 56.95ms

### Direct Adapter Mode Statistics
- **Total Transfers**: 10
- **Successful Transfers**: 10
- **Minimum Time**: 466.32ms
- **Maximum Time**: 563.16ms
- **Standard Deviation**: 23.96ms

## Conclusion

FinP2P mode is slower. The FinP2P adapter mode adds 0.25% overhead compared to direct mode, primarily due to FinID resolution and FinP2P coordination.

This overhead represents the cost of the additional abstraction layer that FinP2P provides, enabling user-friendly FinID-based transfers at the expense of some performance.
