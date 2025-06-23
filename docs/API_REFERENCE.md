# FinP2P API Reference

## Overview

The FinP2P API provides a comprehensive interface for interacting with the FinP2P protocol, enabling secure cross-ledger transfers, asset management, and network operations. This document covers all available endpoints, request/response formats, authentication requirements, and usage examples.

## Table of Contents

1. [Authentication](#authentication)
2. [Base URL and Versioning](#base-url-and-versioning)
3. [Common Headers](#common-headers)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Router Management](#router-management)
7. [Transfer Operations](#transfer-operations)
8. [Asset Management](#asset-management)
9. [Account Operations](#account-operations)
10. [Network Discovery](#network-discovery)
11. [Monitoring and Health](#monitoring-and-health)
12. [Confirmation System](#confirmation-system)
13. [Primary Router Authority](#primary-router-authority)
14. [WebSocket Events](#websocket-events)
15. [SDK Examples](#sdk-examples)

## Authentication

### JWT Token Authentication

All API requests require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Obtaining a Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "routerId": "router-001",
  "credentials": {
    "type": "certificate",
    "certificate": "-----BEGIN CERTIFICATE-----...",
    "privateKey": "-----BEGIN PRIVATE KEY-----..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "tokenType": "Bearer"
  }
}
```

### Refreshing Tokens

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Base URL and Versioning

- **Base URL**: `https://api.finp2p.org`
- **Current Version**: `v1`
- **Full Base URL**: `https://api.finp2p.org/api/v1`

### API Versioning

The API uses URL path versioning. When breaking changes are introduced, a new version will be released:

- `v1`: Current stable version
- `v2`: Future version (when available)

## Common Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token for authentication |
| `Content-Type` | Yes | `application/json` for JSON requests |
| `X-Request-ID` | No | Unique identifier for request tracing |
| `X-Router-ID` | No | Router identifier (auto-detected from token) |
| `Accept` | No | Response format preference (default: `application/json`) |

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TRANSFER_AMOUNT",
    "message": "Transfer amount must be greater than zero",
    "details": {
      "field": "amount",
      "value": "-100",
      "constraint": "positive_number"
    },
    "requestId": "req_1234567890",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### HTTP Status Codes

| Code | Description | Common Scenarios |
|------|-------------|------------------|
| `200` | OK | Successful request |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Invalid or missing authentication |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Resource already exists or conflict |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side error |
| `503` | Service Unavailable | Service temporarily unavailable |

### Error Codes

| Code | Description |
|------|-------------|
| `AUTHENTICATION_FAILED` | Invalid credentials |
| `AUTHORIZATION_DENIED` | Insufficient permissions |
| `INVALID_REQUEST` | Malformed request |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `TRANSFER_FAILED` | Transfer operation failed |
| `INSUFFICIENT_BALANCE` | Insufficient account balance |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `NETWORK_ERROR` | Network connectivity issue |
| `VALIDATION_ERROR` | Input validation failed |

## Rate Limiting

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 3600
```

### Rate Limit Tiers

| Tier | Requests/Hour | Burst Limit | Transfer Limit/Hour |
|------|---------------|-------------|---------------------|
| **Basic** | 1,000 | 100 | 50 |
| **Standard** | 5,000 | 500 | 200 |
| **Premium** | 10,000 | 1,000 | 500 |
| **Enterprise** | 50,000 | 5,000 | Unlimited |

## Router Management

### Get Router Information

```http
GET /api/v1/routers/{routerId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "router-001",
    "name": "Primary Router",
    "status": "ACTIVE",
    "version": "1.0.0",
    "capabilities": ["TRANSFER", "QUERY", "DISCOVERY"],
    "supportedLedgers": ["ethereum", "bitcoin", "sui"],
    "metadata": {
      "region": "us-east-1",
      "provider": "aws",
      "lastHeartbeat": "2024-01-15T10:30:00Z"
    },
    "statistics": {
      "totalTransfers": 1250,
      "successfulTransfers": 1248,
      "averageLatency": 45.2,
      "uptime": 99.98
    }
  }
}
```

### Update Router Configuration

```http
PUT /api/v1/routers/{routerId}
Content-Type: application/json

{
  "name": "Updated Router Name",
  "metadata": {
    "region": "us-west-2",
    "description": "Updated description"
  },
  "rateLimits": {
    "transfersPerHour": 1000,
    "queriesPerMinute": 100
  }
}
```

### List All Routers

```http
GET /api/v1/routers?status=ACTIVE&limit=50&offset=0
```

**Query Parameters:**
- `status`: Filter by router status (`ACTIVE`, `INACTIVE`, `MAINTENANCE`)
- `ledger`: Filter by supported ledger type
- `region`: Filter by geographic region
- `limit`: Number of results per page (default: 20, max: 100)
- `offset`: Pagination offset

## Transfer Operations

### Initiate Transfer

```http
POST /api/v1/transfers
Content-Type: application/json

{
  "sourceAccount": {
    "ledger": "ethereum",
    "address": "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8e",
    "assetId": "ETH"
  },
  "destinationAccount": {
    "ledger": "bitcoin",
    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "assetId": "BTC"
  },
  "amount": "1.5",
  "metadata": {
    "reference": "INV-2024-001",
    "description": "Payment for services"
  },
  "options": {
    "priority": "HIGH",
    "confirmationRequired": true,
    "timeoutMs": 300000
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transferId": "txn_1234567890abcdef",
    "status": "PENDING",
    "sourceAccount": {
      "ledger": "ethereum",
      "address": "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8e",
      "assetId": "ETH"
    },
    "destinationAccount": {
      "ledger": "bitcoin",
      "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      "assetId": "BTC"
    },
    "amount": "1.5",
    "estimatedFee": "0.001",
    "estimatedCompletionTime": "2024-01-15T10:35:00Z",
    "createdAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-01-15T10:35:00Z"
  }
}
```

### Get Transfer Status

```http
GET /api/v1/transfers/{transferId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transferId": "txn_1234567890abcdef",
    "status": "CONFIRMED",
    "sourceAccount": {
      "ledger": "ethereum",
      "address": "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8e",
      "assetId": "ETH"
    },
    "destinationAccount": {
      "ledger": "bitcoin",
      "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      "assetId": "BTC"
    },
    "amount": "1.5",
    "actualFee": "0.0008",
    "confirmations": {
      "required": 2,
      "received": 2,
      "routers": ["router-001", "router-002"]
    },
    "timeline": [
      {
        "status": "INITIATED",
        "timestamp": "2024-01-15T10:30:00Z",
        "router": "router-001"
      },
      {
        "status": "CONFIRMED",
        "timestamp": "2024-01-15T10:32:15Z",
        "router": "router-002"
      }
    ],
    "transactionHashes": {
      "source": "0xabc123...",
      "destination": "def456..."
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:32:15Z"
  }
}
```

### List Transfers

```http
GET /api/v1/transfers?status=CONFIRMED&limit=20&offset=0&from=2024-01-01&to=2024-01-31
```

**Query Parameters:**
- `status`: Filter by transfer status
- `sourceAccount`: Filter by source account address
- `destinationAccount`: Filter by destination account address
- `assetId`: Filter by asset identifier
- `from`: Start date (ISO 8601)
- `to`: End date (ISO 8601)
- `limit`: Results per page
- `offset`: Pagination offset

### Cancel Transfer

```http
DELETE /api/v1/transfers/{transferId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transferId": "txn_1234567890abcdef",
    "status": "CANCELLED",
    "cancelledAt": "2024-01-15T10:31:00Z",
    "reason": "User requested cancellation"
  }
}
```

## Asset Management

### List Supported Assets

```http
GET /api/v1/assets?ledger=ethereum
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ETH",
      "name": "Ethereum",
      "symbol": "ETH",
      "decimals": 18,
      "ledger": "ethereum",
      "contractAddress": null,
      "type": "NATIVE",
      "metadata": {
        "description": "Native Ethereum token",
        "website": "https://ethereum.org",
        "logoUrl": "https://assets.finp2p.org/eth.png"
      }
    },
    {
      "id": "USDC",
      "name": "USD Coin",
      "symbol": "USDC",
      "decimals": 6,
      "ledger": "ethereum",
      "contractAddress": "0xA0b86a33E6441b8435b662303c0f479c7e2b6c",
      "type": "ERC20",
      "metadata": {
        "description": "USD-backed stablecoin",
        "website": "https://centre.io",
        "logoUrl": "https://assets.finp2p.org/usdc.png"
      }
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 20,
    "offset": 0
  }
}
```

### Get Asset Details

```http
GET /api/v1/assets/{assetId}?ledger=ethereum
```

### Create Custom Asset

```http
POST /api/v1/assets
Content-Type: application/json

{
  "id": "CUSTOM_TOKEN",
  "name": "Custom Token",
  "symbol": "CTK",
  "decimals": 18,
  "ledger": "ethereum",
  "contractAddress": "0x123...",
  "type": "ERC20",
  "metadata": {
    "description": "Custom token for testing",
    "website": "https://example.com"
  }
}
```

## Account Operations

### Get Account Balance

```http
GET /api/v1/accounts/{accountAddress}/balance?ledger=ethereum&assetId=ETH
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accountAddress": "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8e",
    "ledger": "ethereum",
    "assetId": "ETH",
    "balance": "10.5",
    "availableBalance": "10.3",
    "pendingBalance": "0.2",
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

### Get Account Transaction History

```http
GET /api/v1/accounts/{accountAddress}/transactions?ledger=ethereum&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "transactionHash": "0xabc123...",
      "type": "TRANSFER",
      "status": "CONFIRMED",
      "amount": "1.5",
      "assetId": "ETH",
      "from": "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8e",
      "to": "0x456...",
      "fee": "0.001",
      "blockNumber": 18500000,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

### Validate Account Address

```http
POST /api/v1/accounts/validate
Content-Type: application/json

{
  "address": "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8e",
  "ledger": "ethereum"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "format": "ethereum_address",
    "checksumValid": true,
    "metadata": {
      "isContract": false,
      "isActive": true
    }
  }
}
```

## Network Discovery

### Discover Route

```http
POST /api/v1/discovery/route
Content-Type: application/json

{
  "sourceAccount": {
    "ledger": "ethereum",
    "address": "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8e",
    "assetId": "ETH"
  },
  "destinationAccount": {
    "ledger": "bitcoin",
    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "assetId": "BTC"
  },
  "amount": "1.0"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "id": "route_001",
        "hops": [
          {
            "router": "router-001",
            "ledger": "ethereum",
            "estimatedFee": "0.001",
            "estimatedTime": 30
          },
          {
            "router": "router-002",
            "ledger": "bitcoin",
            "estimatedFee": "0.0005",
            "estimatedTime": 60
          }
        ],
        "totalFee": "0.0015",
        "totalTime": 90,
        "reliability": 0.98,
        "priority": "STANDARD"
      }
    ],
    "recommendedRoute": "route_001"
  }
}
```

### Get Network Topology

```http
GET /api/v1/discovery/topology
```

**Response:**
```json
{
  "success": true,
  "data": {
    "routers": [
      {
        "id": "router-001",
        "status": "ACTIVE",
        "connections": ["router-002", "router-003"],
        "supportedLedgers": ["ethereum", "bitcoin"]
      }
    ],
    "connections": [
      {
        "from": "router-001",
        "to": "router-002",
        "latency": 45,
        "reliability": 0.99
      }
    ],
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

## Monitoring and Health

### Health Check

```http
GET /api/v1/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 86400,
    "timestamp": "2024-01-15T10:30:00Z",
    "components": {
      "database": {
        "status": "healthy",
        "responseTime": 5
      },
      "redis": {
        "status": "healthy",
        "responseTime": 2
      },
      "blockchain_adapters": {
        "ethereum": {
          "status": "healthy",
          "blockHeight": 18500000,
          "responseTime": 150
        },
        "bitcoin": {
          "status": "healthy",
          "blockHeight": 820000,
          "responseTime": 200
        }
      }
    }
  }
}
```

### Get System Metrics

```http
GET /api/v1/metrics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "performance": {
      "averageLatency": 45.2,
      "throughput": 1250.5,
      "errorRate": 0.02,
      "uptime": 99.98
    },
    "transfers": {
      "total": 10000,
      "successful": 9980,
      "failed": 20,
      "pending": 5
    },
    "network": {
      "activeRouters": 15,
      "totalConnections": 45,
      "averageHops": 2.3
    },
    "resources": {
      "cpuUsage": 45.2,
      "memoryUsage": 67.8,
      "diskUsage": 23.1,
      "networkIO": {
        "inbound": 1024000,
        "outbound": 2048000
      }
    }
  }
}
```

## Confirmation System

### Get Confirmation Status

```http
GET /api/v1/confirmations/{transferId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transferId": "txn_1234567890abcdef",
    "status": "CONFIRMED",
    "requiredConfirmations": 2,
    "receivedConfirmations": 2,
    "confirmations": [
      {
        "routerId": "router-001",
        "status": "APPROVED",
        "timestamp": "2024-01-15T10:31:00Z",
        "signature": "0xabc123..."
      },
      {
        "routerId": "router-002",
        "status": "APPROVED",
        "timestamp": "2024-01-15T10:31:30Z",
        "signature": "0xdef456..."
      }
    ],
    "finalStatus": "APPROVED",
    "completedAt": "2024-01-15T10:31:30Z"
  }
}
```

### Submit Confirmation

```http
POST /api/v1/confirmations/{transferId}
Content-Type: application/json

{
  "routerId": "router-001",
  "status": "APPROVED",
  "signature": "0xabc123...",
  "metadata": {
    "reason": "Transfer validated successfully",
    "validationChecks": [
      "balance_check",
      "fraud_check",
      "compliance_check"
    ]
  }
}
```

## Primary Router Authority

### Get Asset Authority

```http
GET /api/v1/authority/assets/{assetId}?ledger=ethereum
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assetId": "ETH",
    "ledger": "ethereum",
    "primaryRouter": "router-001",
    "authorityType": "DESIGNATED",
    "permissions": [
      "APPROVE_TRANSFERS",
      "REJECT_TRANSFERS",
      "SET_LIMITS",
      "DELEGATE_AUTHORITY"
    ],
    "metadata": {
      "assignedAt": "2024-01-01T00:00:00Z",
      "assignedBy": "system",
      "expiresAt": null
    }
  }
}
```

### Request Authority Authorization

```http
POST /api/v1/authority/authorize
Content-Type: application/json

{
  "transferId": "txn_1234567890abcdef",
  "assetId": "ETH",
  "ledger": "ethereum",
  "requestingRouter": "router-002",
  "justification": "Primary router unavailable"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authorizationId": "auth_1234567890",
    "status": "PENDING",
    "transferId": "txn_1234567890abcdef",
    "requestedAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-01-15T10:35:00Z"
  }
}
```

## WebSocket Events

### Connection

```javascript
const ws = new WebSocket('wss://api.finp2p.org/ws/v1');

// Authentication
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your_jwt_token'
}));
```

### Event Types

#### Transfer Status Updates

```json
{
  "type": "transfer_status_update",
  "data": {
    "transferId": "txn_1234567890abcdef",
    "status": "CONFIRMED",
    "timestamp": "2024-01-15T10:32:00Z"
  }
}
```

#### Network Events

```json
{
  "type": "router_status_change",
  "data": {
    "routerId": "router-002",
    "status": "OFFLINE",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Confirmation Events

```json
{
  "type": "confirmation_received",
  "data": {
    "transferId": "txn_1234567890abcdef",
    "routerId": "router-001",
    "status": "APPROVED",
    "timestamp": "2024-01-15T10:31:00Z"
  }
}
```

### Subscription Management

```json
{
  "type": "subscribe",
  "channels": [
    "transfers",
    "network",
    "confirmations"
  ],
  "filters": {
    "routerId": "router-001",
    "assetId": "ETH"
  }
}
```

## SDK Examples

### JavaScript/TypeScript SDK

```typescript
import { FinP2PClient } from '@finp2p/sdk';

const client = new FinP2PClient({
  baseUrl: 'https://api.finp2p.org',
  apiKey: 'your_api_key',
  routerId: 'router-001'
});

// Authenticate
await client.authenticate({
  certificate: 'path/to/cert.pem',
  privateKey: 'path/to/key.pem'
});

// Initiate transfer
const transfer = await client.transfers.create({
  sourceAccount: {
    ledger: 'ethereum',
    address: '0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8e',
    assetId: 'ETH'
  },
  destinationAccount: {
    ledger: 'bitcoin',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    assetId: 'BTC'
  },
  amount: '1.5'
});

// Monitor transfer status
client.transfers.onStatusChange(transfer.transferId, (status) => {
  console.log(`Transfer ${transfer.transferId} status: ${status}`);
});

// Get transfer details
const details = await client.transfers.get(transfer.transferId);
console.log('Transfer details:', details);
```

### Python SDK

```python
from finp2p import FinP2PClient

client = FinP2PClient(
    base_url='https://api.finp2p.org',
    api_key='your_api_key',
    router_id='router-001'
)

# Authenticate
client.authenticate(
    certificate_path='path/to/cert.pem',
    private_key_path='path/to/key.pem'
)

# Initiate transfer
transfer = client.transfers.create({
    'sourceAccount': {
        'ledger': 'ethereum',
        'address': '0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8e',
        'assetId': 'ETH'
    },
    'destinationAccount': {
        'ledger': 'bitcoin',
        'address': 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        'assetId': 'BTC'
    },
    'amount': '1.5'
})

# Get transfer status
status = client.transfers.get_status(transfer['transferId'])
print(f"Transfer status: {status['status']}")
```

### Go SDK

```go
package main

import (
    "context"
    "fmt"
    "github.com/finp2p/go-sdk"
)

func main() {
    client := finp2p.NewClient(&finp2p.Config{
        BaseURL:  "https://api.finp2p.org",
        APIKey:   "your_api_key",
        RouterID: "router-001",
    })

    // Authenticate
    err := client.Authenticate(context.Background(), &finp2p.AuthRequest{
        CertificatePath: "path/to/cert.pem",
        PrivateKeyPath:  "path/to/key.pem",
    })
    if err != nil {
        panic(err)
    }

    // Initiate transfer
    transfer, err := client.Transfers.Create(context.Background(), &finp2p.TransferRequest{
        SourceAccount: &finp2p.Account{
            Ledger:  "ethereum",
            Address: "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8e",
            AssetID: "ETH",
        },
        DestinationAccount: &finp2p.Account{
            Ledger:  "bitcoin",
            Address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            AssetID: "BTC",
        },
        Amount: "1.5",
    })
    if err != nil {
        panic(err)
    }

    fmt.Printf("Transfer created: %s\n", transfer.TransferID)
}
```

## Postman Collection

A comprehensive Postman collection is available for testing all API endpoints:

```json
{
  "info": {
    "name": "FinP2P API",
    "description": "Complete FinP2P API collection",
    "version": "1.0.0"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{access_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "base_url",
      "value": "https://api.finp2p.org/api/v1"
    },
    {
      "key": "access_token",
      "value": ""
    }
  ]
}
```

## Support and Resources

- **Documentation**: [https://docs.finp2p.org](https://docs.finp2p.org)
- **API Status**: [https://status.finp2p.org](https://status.finp2p.org)
- **Support**: [support@finp2p.org](mailto:support@finp2p.org)
- **GitHub**: [https://github.com/finp2p](https://github.com/finp2p)
- **Discord**: [https://discord.gg/finp2p](https://discord.gg/finp2p)

## Changelog

### v1.0.0 (2024-01-15)
- Initial API release
- Core transfer operations
- Router management
- Asset management
- Network discovery
- Confirmation system
- Primary router authority
- WebSocket events
- Comprehensive error handling
- Rate limiting
- Authentication and authorization