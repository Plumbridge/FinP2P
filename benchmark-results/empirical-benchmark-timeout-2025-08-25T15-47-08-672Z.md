# Basic Empirical Blockchain Interoperability Benchmark Report

## Executive Summary

This is a basic report generated when the detailed report generation failed. It contains the raw results from the empirical benchmark testing.

**Benchmark Date:** 25/08/2025, 16:47:08

## 🔬 Test Results Summary

### Solutions Tested
- FinP2P
- Direct Blockchain  
- Chainlink CCIP
- Axelar

### Raw Results Data
```json
{
  "timestamp": "2025-08-25T15:37:08.587Z",
  "summary": {
    "totalSolutions": 4,
    "totalDomains": 5,
    "totalTests": 19,
    "executionTime": 1756136228588
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
          "averageLatency": 3005.7630099999997,
          "fastestLatency": 2574.6296999999977,
          "slowestLatency": 3813.1439000000028,
          "latencyTimes": [
            3331.2011,
            3322.2232999999997,
            2743.7259999999987,
            2744.189300000002,
            3212.1195000000007,
            2574.6296999999977,
            2657.2286999999997,
            2641.2679999999964,
            3813.1439000000028,
            3017.900600000001
          ],
          "totalTransactions": 10
        },
        "throughputScalability": {
          "passed": 1,
          "failed": 0,
          "successRate": 100,
          "averageThroughput": 0.40981087167575597,
          "maxThroughput": 0.42343305274880827,
          "throughputTests": [
            0.42343305274880827,
            0.3921804212536973,
            0.4225713905206858,
            0.42012260219436065,
            0.3907468916612276
          ],
          "sustainedTPS": 0.3839458091144668
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
          "averageRecovery": 212.55964000000387,
          "fastestRecovery": 111.64899999997579,
          "slowestRecovery": 299.3389000000316,
          "recoveryTimes": [
            220.98519999999553,
            174.18009999999776,
            233.29899999999907,
            111.64899999997579,
            298.4452000000165,
            237.03609999996843,
            238.11550000001444,
            188.44960000005085,
            299.3389000000316,
            124.09779999998864
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