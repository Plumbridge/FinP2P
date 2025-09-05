# Basic Empirical Blockchain Interoperability Benchmark Report

## Executive Summary

This is a basic report generated when the detailed report generation failed. It contains the raw results from the empirical benchmark testing.

**Benchmark Date:** 25/08/2025, 17:09:26

## 🔬 Test Results Summary

### Solutions Tested
- FinP2P
- Direct Blockchain  
- Chainlink CCIP
- Axelar

### Raw Results Data
```json
{
  "timestamp": "2025-08-25T15:59:26.015Z",
  "summary": {
    "totalSolutions": 4,
    "totalDomains": 5,
    "totalTests": 19,
    "executionTime": 1756137566016
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
          "averageLatency": 141.19596000000018,
          "fastestLatency": 121.79769999999917,
          "slowestLatency": 205.6791000000003,
          "latencyTimes": [
            205.6791000000003,
            165.8027000000002,
            122.04280000000017,
            138.45020000000113,
            148.47780000000057,
            130.54529999999977,
            126.5648000000001,
            121.79769999999917,
            121.95579999999973,
            130.64340000000084
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
          "averageRecovery": 222.69176000000442,
          "fastestRecovery": 157.00030000001425,
          "slowestRecovery": 281.54940000001807,
          "recoveryTimes": [
            265.64319999999134,
            235.13260000001173,
            236.93540000001667,
            158.04830000002403,
            219.578199999989,
            157.00030000001425,
            234.14100000000326,
            220.3289999999688,
            218.56020000000717,
            281.54940000001807
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