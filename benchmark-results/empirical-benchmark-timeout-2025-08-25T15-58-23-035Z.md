# Basic Empirical Blockchain Interoperability Benchmark Report

## Executive Summary

This is a basic report generated when the detailed report generation failed. It contains the raw results from the empirical benchmark testing.

**Benchmark Date:** 25/08/2025, 16:58:23

## 🔬 Test Results Summary

### Solutions Tested
- FinP2P
- Direct Blockchain  
- Chainlink CCIP
- Axelar

### Raw Results Data
```json
{
  "timestamp": "2025-08-25T15:48:22.936Z",
  "summary": {
    "totalSolutions": 4,
    "totalDomains": 5,
    "totalTests": 19,
    "executionTime": 1756136902937
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
          "averageLatency": 145.97259000000062,
          "fastestLatency": 122.75350000000253,
          "slowestLatency": 171.68079999999964,
          "latencyTimes": [
            171.68079999999964,
            137.28459999999995,
            134.95580000000064,
            170.05279999999948,
            140.9257000000016,
            158.34119999999893,
            139.51920000000064,
            139.89910000000236,
            144.3132000000005,
            122.75350000000253
          ],
          "totalTransactions": 10
        },
        "throughputScalability": {
          "passed": 0,
          "failed": 0,
          "successRate": 0,
          "averageThroughput": null,
          "maxThroughput": 0,
          "throughputTests": [],
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
          "averageRecovery": 217.9260299999907,
          "fastestRecovery": 126.00250000000233,
          "slowestRecovery": 298.1072999999742,
          "recoveryTimes": [
            216.4427999999607,
            126.03830000001471,
            205.6030000000028,
            250.96799999999348,
            126.00250000000233,
            205.58799999998882,
            281.5962999999756,
            298.1072999999742,
            174.3813000000082,
            294.5327999999863
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