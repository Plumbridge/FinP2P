# Basic Empirical Blockchain Interoperability Benchmark Report

## Executive Summary

This is a basic report generated when the detailed report generation failed. It contains the raw results from the empirical benchmark testing.

**Benchmark Date:** 25/08/2025, 16:25:27

## 🔬 Test Results Summary

### Solutions Tested
- FinP2P
- Direct Blockchain  
- Chainlink CCIP
- Axelar

### Raw Results Data
```json
{
  "timestamp": "2025-08-25T15:15:27.095Z",
  "summary": {
    "totalSolutions": 4,
    "totalDomains": 5,
    "totalTests": 19,
    "executionTime": 1756134927096
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
          "averageLatency": 1.1673099999998613,
          "fastestLatency": 1.0856999999996333,
          "slowestLatency": 1.2961999999997715,
          "latencyTimes": [
            1.0996000000000095,
            1.1003000000000611,
            1.1045999999996639,
            1.2961999999997715,
            1.0856999999996333,
            1.1278000000002066,
            1.2703999999994267,
            1.2607000000007247,
            1.178299999999581,
            1.1494999999995343
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
          "averageRecovery": 228.14616000000387,
          "fastestRecovery": 141.97560000000522,
          "slowestRecovery": 297.7123000000138,
          "recoveryTimes": [
            185.00699999998324,
            172.08209999999963,
            265.2030000000377,
            296.8534000000218,
            297.7123000000138,
            280.2797000000137,
            235.59539999999106,
            218.52590000000782,
            188.2271999999648,
            141.97560000000522
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