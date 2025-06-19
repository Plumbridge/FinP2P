# FinP2P Peer Discovery Mechanism

This document explains how routers in a production FinP2P network can dynamically discover and connect to each other without requiring pre-configured peer lists.

## Overview

The current implementation addresses the three key challenges of production FinP2P networks:

1. **Dynamic Peer Discovery**: New routers can join without knowing all peers in advance
2. **Automatic Network Expansion**: Existing routers automatically discover new peers
3. **Resilient Network Topology**: The network can grow organically and self-heal

## How It Works

### 1. Initial Bootstrap Connection

New routers only need to know **one** existing router in the network to join:

```env
# Router D only needs to connect to Router A initially
PEERS=http://router-a:3000
```

### 2. Peer Discovery Process

When a router starts, it follows this discovery sequence:

1. **Connect to Bootstrap Peers**: Connect to configured peers in `PEERS` environment variable
2. **Query Peer Lists**: Ask each connected peer for their peer list via `GET /peers`
3. **Discover New Peers**: Connect to any previously unknown routers
4. **Announce Presence**: Send peer announcements to propagate network topology

### 3. Dynamic Peer Registration

Routers can also register new peers manually:

```bash
# Register a new peer with Router A
curl -X POST http://localhost:3001/peers/register \
  -H "Content-Type: application/json" \
  -d '{"endpoint": "http://new-router:3000"}'
```

### 4. Peer Announcement Protocol

When a new peer joins:

1. The bootstrap router validates the new peer
2. Sends `PEER_ANNOUNCEMENT` messages to all known peers
3. Each peer automatically connects to the announced peer
4. Network topology is updated across all routers

## API Endpoints

### GET /peers
Returns list of known peer endpoints

```bash
curl http://localhost:3001/peers
# Returns: ["http://router-b:3000", "http://router-c:3000"]
```

### POST /peers/register
Register a new peer in the network

```bash
curl -X POST http://localhost:3001/peers/register \
  -H "Content-Type: application/json" \
  -d '{"endpoint": "http://router-d:3000"}'
```

### GET /info
Get router information (used for peer validation)

```bash
curl http://localhost:3001/info
```

## Message Types

### PEER_ANNOUNCEMENT
Broadcast message sent when a new peer joins:

```json
{
  "id": "uuid",
  "type": "peer_announcement",
  "fromRouter": "bank-a-router",
  "toRouter": "bank-b-router",
  "payload": {
    "newPeerEndpoint": "http://router-d:3000",
    "timestamp": "2024-01-01T00:00:00Z"
  },
  "signature": "..."
}
```

## Demonstration: Adding Router D

### Prerequisites
1. Start the base 3-router network:
   ```bash
   docker-compose up -d router-bank-a router-bank-b router-bank-c
   ```

### Method 1: Automatic Discovery (Recommended)

1. **Start Router D with discovery profile**:
   ```bash
   docker-compose --profile with-router-d up -d router-bank-d
   ```

2. **Verify automatic discovery**:
   ```bash
   # Check Router D discovered all peers
   curl http://localhost:3004/peers
   
   # Check other routers discovered Router D
   curl http://localhost:3001/peers
   curl http://localhost:3002/peers
   curl http://localhost:3003/peers
   ```

### Method 2: Manual Registration

1. **Start Router D separately**:
   ```bash
   docker run -d --name router-d \
     -p 3004:3000 \
     -e ROUTER_ID=bank-d-router \
     -e PEERS=http://host.docker.internal:3001 \
     finp2p-router
   ```

2. **Register with existing network**:
   ```bash
   curl -X POST http://localhost:3001/peers/register \
     -H "Content-Type: application/json" \
     -d '{"endpoint": "http://host.docker.internal:3004"}'
   ```

## Production Considerations

### Security
- **Peer Validation**: All peer connections are validated via `/info` endpoint
- **Message Signatures**: Peer announcements include cryptographic signatures
- **Rate Limiting**: Prevent discovery spam attacks

### Scalability
- **Gossip Protocol**: Peer announcements propagate efficiently
- **Connection Limits**: Routers can limit maximum peer connections
- **Discovery Intervals**: Configurable discovery frequency

### Reliability
- **Heartbeat Monitoring**: Regular health checks between peers
- **Automatic Reconnection**: Failed peers are periodically retried
- **Graceful Degradation**: Network continues operating with partial connectivity

## Configuration Options

```env
# Network Discovery Settings
PEERS=http://bootstrap-router:3000  # Initial bootstrap peers
HEARTBEAT_INTERVAL=30000           # Peer health check interval
MAX_RETRIES=3                      # Connection retry attempts
TIMEOUT=30000                      # Connection timeout
MAX_PEERS=50                       # Maximum peer connections
DISCOVERY_INTERVAL=300000          # Peer discovery frequency (5 min)
```

## Network Topology Evolution

```
Initial State (3 routers):
A ←→ B ←→ C
↑         ↓
└─────────┘

After Router D joins via A:
A ←→ B ←→ C
↑ ↖   ↗ ↓
│   D   │
└───────┘

Final State (full mesh):
A ←→ B ←→ C
↑ ↖ ↗ ↖ ↗ ↓
│   D   │
└───────┘
```

## Troubleshooting

### Router Not Discovering Peers
1. Check network connectivity to bootstrap peers
2. Verify `/peers` endpoint is accessible
3. Check router logs for discovery errors

### Peer Announcements Not Propagating
1. Verify `/messages` endpoint is working
2. Check message signature validation
3. Monitor network latency and timeouts

### Network Partition Recovery
1. Routers automatically attempt reconnection
2. Manual peer registration can bridge partitions
3. Monitor network topology via `/peers` endpoints