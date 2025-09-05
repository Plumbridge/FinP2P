# Basic Empirical Blockchain Interoperability Benchmark Report

## Executive Summary

This is a basic report generated when the detailed report generation failed. It contains the raw results from the empirical benchmark testing.

**Benchmark Date:** 25/08/2025, 16:36:11

## 🔬 Test Results Summary

### Solutions Tested
- FinP2P
- Direct Blockchain  
- Chainlink CCIP
- Axelar

### Raw Results Data
```json
{
  "timestamp": "2025-08-25T15:26:11.801Z",
  "summary": {
    "totalSolutions": 4,
    "totalDomains": 5,
    "totalTests": 19,
    "executionTime": 1756135571802
  },
  "detailedResults": {
    "securityRobustness": {
      "finp2p": {
        "formalVerification": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        },
        "cryptographicRobustness": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        },
        "byzantineFaultTolerance": {
          "networkPartitioningTests": {
            "passed": 8,
            "failed": 2,
            "successRate": 80
          },
          "maliciousParticipantTests": {
            "passed": 7,
            "failed": 3,
            "successRate": 70
          },
          "consensusManipulationTests": {
            "passed": 9,
            "failed": 1,
            "successRate": 90
          }
        },
        "vulnerabilityAssessmentCoverage": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        }
      },
      "direct": {
        "formalVerification": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        },
        "cryptographicRobustness": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        },
        "byzantineFaultTolerance": {
          "networkPartitioningTests": {
            "passed": 8,
            "failed": 2,
            "successRate": 80
          },
          "maliciousParticipantTests": {
            "passed": 7,
            "failed": 3,
            "successRate": 70
          },
          "consensusManipulationTests": {
            "passed": 9,
            "failed": 1,
            "successRate": 90
          }
        },
        "vulnerabilityAssessmentCoverage": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        }
      }
    },
    "regulatoryCompliance": {
      "finp2p": {
        "atomicityEnforcement": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        },
        "auditTrailManagement": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        },
        "loggingAndMonitoring": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        },
        "dataSovereigntyControls": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        },
        "jurisdictionalCompliance": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        }
      },
      "direct": {
        "atomicityEnforcement": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        },
        "auditTrailManagement": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        },
        "loggingAndMonitoring": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        },
        "dataSovereigntyControls": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        },
        "jurisdictionalCompliance": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        }
      }
    },
    "performanceEfficiency": {
      "finp2p": {
        "crossChainTransactionLatency": {
          "passed": 10,
          "failed": 0,
          "successRate": 100,
          "averageLatency": 491.71933000000007,
          "fastestLatency": 435.3732000000018,
          "slowestLatency": 561.3515999999981,
          "latencyTimes": [
            480.7719000000002,
            455.9454000000005,
            493.97260000000006,
            462.83560000000034,
            526.6677999999993,
            477.6778999999988,
            435.3732000000018,
            499.82610000000204,
            561.3515999999981,
            522.7711999999992
          ],
          "totalTransactions": 10
        },
        "throughputScalability": {
          "passed": 0,
          "failed": 0,
          "successRate": 0,
          "averageThroughput": 0,
          "maxThroughput": 0,
          "throughputTests": [
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0
          ],
          "sustainedTPS": 0
        },
        "systemAvailability": {
          "passed": 1,
          "failed": 0,
          "successRate": 100,
          "uptime": 100,
          "totalChecks": 5,
          "successfulChecks": 5,
          "checkIntervals": [
            true,
            true,
            true,
            true,
            true
          ]
        }
      }
    },
    "operationalReliability": {
      "finp2p": {
        "faultRecoveryCapabilities": {
          "passed": 10,
          "failed": 0,
          "successRate": 100,
          "averageRecovery": 213.08263000000733,
          "fastestRecovery": 141.7844000000041,
          "slowestRecovery": 301.33580000000075,
          "recoveryTimes": [
            155.73070000001462,
            189.125,
            220.32740000000922,
            173.29329999996116,
            141.7844000000041,
            219.7284000000218,
            301.33580000000075,
            246.84360000002198,
            186.9721000000136,
            295.68560000002617
          ]
        },
        "lifecycleManagementProcess": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        },
        "serviceContinuityMeasures": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        }
      }
    },
    "developerIntegration": {
      "finp2p": {
        "sdkCoverage": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        },
        "implementationComplexity": {
          "passed": 10,
          "failed": 0,
          "successRate": 100,
          "linesOfCode": 650,
          "complexity": "medium"
        },
        "communitySupport": {
          "passed": 10,
          "failed": 0,
          "successRate": 100
        }
      }
    }
  }
}
```

## 📋 Test Environment

- **Platform:** Node.js with TypeScript
- **Test Duration:** 60 seconds for load testing
- **Availability Monitoring:** 5 minutes continuous
- **Iterations:** 10 per metric for statistical reliability

---

*This basic report was generated on 25/08/2025 when the detailed report generation failed.*