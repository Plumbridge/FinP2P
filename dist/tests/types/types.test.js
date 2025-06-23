"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../src/types");
describe('Type Definitions', () => {
    describe('FinID', () => {
        it('should create valid FinID objects', () => {
            const finId = {
                id: 'test-id',
                type: 'institution',
                domain: 'example.com'
            };
            expect(finId.id).toBe('test-id');
            expect(finId.type).toBe('institution');
            expect(finId.domain).toBe('example.com');
        });
        it('should support all FinID types', () => {
            const types = ['institution', 'asset', 'account'];
            types.forEach(type => {
                const finId = {
                    id: `${type}-id`,
                    type,
                    domain: 'example.com'
                };
                expect(finId.type).toBe(type);
            });
        });
        it('should support optional metadata', () => {
            const finId = {
                id: 'test-id',
                type: 'asset',
                domain: 'example.com',
                metadata: {
                    description: 'Test asset',
                    version: '1.0.0'
                }
            };
            expect(finId.metadata).toBeDefined();
            expect(finId.metadata?.description).toBe('Test asset');
        });
    });
    describe('Asset', () => {
        it('should create valid Asset objects', () => {
            const finId = {
                id: 'asset-123',
                type: 'asset',
                domain: 'example.com'
            };
            const metadata = {
                description: 'Test token',
                imageUrl: 'https://example.com/image.png'
            };
            const asset = {
                id: 'asset-123',
                finId,
                symbol: 'TEST',
                name: 'Test Token',
                decimals: 18,
                totalSupply: BigInt('1000000000000000000000'),
                ledgerId: 'ethereum',
                metadata,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            expect(asset.symbol).toBe('TEST');
            expect(asset.decimals).toBe(18);
            expect(typeof asset.totalSupply).toBe('bigint');
        });
        it('should support optional contract address', () => {
            const asset = {
                contractAddress: '0x1234567890abcdef'
            };
            expect(asset.contractAddress).toBe('0x1234567890abcdef');
        });
    });
    describe('AssetMetadata', () => {
        it('should create valid metadata objects', () => {
            const metadata = {
                description: 'A test asset',
                imageUrl: 'https://example.com/image.png',
                externalUrl: 'https://example.com',
                attributes: [
                    { trait_type: 'rarity', value: 'common' },
                    { trait_type: 'level', value: 5 }
                ]
            };
            expect(metadata.attributes).toHaveLength(2);
            expect(metadata.attributes?.[0].trait_type).toBe('rarity');
            expect(metadata.attributes?.[1].value).toBe(5);
        });
        it('should support optional fields', () => {
            const metadata = {};
            expect(metadata.description).toBeUndefined();
            expect(metadata.imageUrl).toBeUndefined();
        });
    });
    describe('Account', () => {
        it('should create valid Account objects', () => {
            const finId = {
                id: 'account-123',
                type: 'account',
                domain: 'example.com'
            };
            const balances = new Map();
            balances.set('asset-1', BigInt('1000'));
            balances.set('asset-2', BigInt('2000'));
            const account = {
                finId,
                address: '0xabcdef1234567890',
                ledgerId: 'ethereum',
                institutionId: 'institution-1',
                balances,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            expect(account.balances.get('asset-1')).toBe(BigInt('1000'));
            expect(account.balances.size).toBe(2);
        });
    });
    describe('Enums', () => {
        it('should have correct DualConfirmationStatus values', () => {
            expect(types_1.DualConfirmationStatus.PENDING).toBe('pending');
            expect(types_1.DualConfirmationStatus.PARTIAL_CONFIRMED).toBe('partial_confirmed');
            expect(types_1.DualConfirmationStatus.DUAL_CONFIRMED).toBe('dual_confirmed');
            expect(types_1.DualConfirmationStatus.FAILED).toBe('failed');
        });
        it('should have correct TransferStatus values', () => {
            expect(types_1.TransferStatus.PENDING).toBe('pending');
            expect(types_1.TransferStatus.ROUTING).toBe('routing');
            expect(types_1.TransferStatus.EXECUTING).toBe('executing');
            expect(types_1.TransferStatus.COMPLETED).toBe('completed');
            expect(types_1.TransferStatus.FAILED).toBe('failed');
            expect(types_1.TransferStatus.CANCELLED).toBe('cancelled');
        });
        it('should have correct RouterStatus values', () => {
            expect(types_1.RouterStatus.ONLINE).toBe('online');
            expect(types_1.RouterStatus.OFFLINE).toBe('offline');
            expect(types_1.RouterStatus.MAINTENANCE).toBe('maintenance');
        });
        it('should have correct MessageType values', () => {
            expect(types_1.MessageType.TRANSFER_REQUEST).toBe('transfer_request');
            expect(types_1.MessageType.TRANSFER_RESPONSE).toBe('transfer_response');
            expect(types_1.MessageType.ROUTE_DISCOVERY).toBe('route_discovery');
            expect(types_1.MessageType.ROUTE_RESPONSE).toBe('route_response');
            expect(types_1.MessageType.HEARTBEAT).toBe('heartbeat');
            expect(types_1.MessageType.ERROR).toBe('error');
        });
        it('should have correct LedgerType values', () => {
            expect(types_1.LedgerType.SUI).toBe('sui');
            expect(types_1.LedgerType.HEDERA).toBe('hedera');
            expect(types_1.LedgerType.APTOS).toBe('aptos');
            expect(types_1.LedgerType.FABRIC).toBe('fabric');
            expect(types_1.LedgerType.MOCK).toBe('mock');
        });
        it('should have correct TransactionStatus values', () => {
            expect(types_1.TransactionStatus.PENDING).toBe('pending');
            expect(types_1.TransactionStatus.CONFIRMED).toBe('confirmed');
            expect(types_1.TransactionStatus.FAILED).toBe('failed');
        });
    });
    describe('Transfer', () => {
        it('should create valid Transfer objects', () => {
            const fromAccount = {
                id: 'account-1',
                type: 'account',
                domain: 'bank1.com'
            };
            const toAccount = {
                id: 'account-2',
                type: 'account',
                domain: 'bank2.com'
            };
            const asset = {
                id: 'asset-1',
                type: 'asset',
                domain: 'tokenissuer.com'
            };
            const route = [
                {
                    routerId: 'router-1',
                    ledgerId: 'ethereum',
                    action: 'lock',
                    status: 'completed',
                    timestamp: new Date(),
                    txHash: '0xabc123'
                }
            ];
            const metadata = {
                reference: 'REF-123',
                description: 'Test transfer'
            };
            const transfer = {
                id: 'transfer-123',
                fromAccount,
                toAccount,
                asset,
                amount: BigInt('1000'),
                status: types_1.TransferStatus.PENDING,
                route,
                metadata,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            expect(transfer.amount).toBe(BigInt('1000'));
            expect(transfer.route).toHaveLength(1);
            expect(transfer.route[0].action).toBe('lock');
        });
    });
    describe('RouteStep', () => {
        it('should support all action types', () => {
            const actions = ['lock', 'unlock', 'mint', 'burn', 'transfer'];
            actions.forEach(action => {
                const step = {
                    routerId: 'router-1',
                    ledgerId: 'ethereum',
                    action,
                    status: 'pending',
                    timestamp: new Date()
                };
                expect(step.action).toBe(action);
            });
        });
        it('should support all status types', () => {
            const statuses = ['pending', 'executing', 'completed', 'failed'];
            statuses.forEach(status => {
                const step = {
                    routerId: 'router-1',
                    ledgerId: 'ethereum',
                    action: 'transfer',
                    status,
                    timestamp: new Date()
                };
                expect(step.status).toBe(status);
            });
        });
    });
    describe('Router', () => {
        it('should create valid Router objects', () => {
            const metadata = {
                version: '1.0.0',
                capabilities: ['transfer', 'routing'],
                region: 'us-east-1',
                institution: {
                    name: 'Test Bank',
                    country: 'US',
                    regulatoryId: 'REG-123'
                }
            };
            const router = {
                id: 'router-123',
                name: 'Test Router',
                institutionId: 'institution-1',
                endpoint: 'https://router.example.com',
                publicKey: 'pub-key-123',
                supportedLedgers: ['ethereum', 'sui'],
                status: types_1.RouterStatus.ONLINE,
                lastSeen: new Date(),
                metadata
            };
            expect(router.supportedLedgers).toContain('ethereum');
            expect(router.metadata.capabilities).toContain('transfer');
        });
    });
    describe('Message', () => {
        it('should create valid Message objects', () => {
            const message = {
                id: 'msg-123',
                type: types_1.MessageType.TRANSFER_REQUEST,
                fromRouter: 'router-1',
                toRouter: 'router-2',
                payload: { transferId: 'transfer-123' },
                signature: 'signature-123',
                timestamp: new Date(),
                ttl: 3600
            };
            expect(message.type).toBe(types_1.MessageType.TRANSFER_REQUEST);
            expect(message.payload.transferId).toBe('transfer-123');
        });
    });
    describe('Transaction', () => {
        it('should create valid Transaction objects', () => {
            const transaction = {
                hash: '0xabc123',
                ledgerId: 'ethereum',
                from: '0x123',
                to: '0x456',
                assetId: 'asset-1',
                amount: BigInt('1000'),
                status: types_1.TransactionStatus.CONFIRMED,
                blockNumber: 12345,
                timestamp: new Date(),
                gasUsed: BigInt('21000'),
                gasPrice: BigInt('20000000000')
            };
            expect(transaction.amount).toBe(BigInt('1000'));
            expect(transaction.blockNumber).toBe(12345);
        });
    });
    describe('RoutingTable', () => {
        it('should create valid RoutingTable objects', () => {
            const destination = {
                id: 'account-123',
                type: 'account',
                domain: 'example.com'
            };
            const routingEntry = {
                destination,
                nextHop: 'router-2',
                cost: 10,
                hops: 2,
                lastUpdated: new Date()
            };
            expect(routingEntry.cost).toBe(10);
            expect(routingEntry.hops).toBe(2);
        });
    });
    describe('NetworkTopology', () => {
        it('should create valid NetworkTopology objects', () => {
            const routers = new Map();
            const connections = new Map();
            connections.set('router-1', ['router-2', 'router-3']);
            connections.set('router-2', ['router-1']);
            const topology = {
                routers,
                connections,
                lastUpdated: new Date()
            };
            expect(topology.connections.get('router-1')).toContain('router-2');
        });
    });
    describe('PerformanceMetrics', () => {
        it('should create valid PerformanceMetrics objects', () => {
            const metrics = {
                routerId: 'router-123',
                timestamp: new Date(),
                transfersProcessed: 100,
                averageLatency: 250.5,
                throughput: 50.2,
                errorRate: 0.01,
                activeConnections: 25,
                memoryUsage: 512.5,
                cpuUsage: 45.2
            };
            expect(metrics.transfersProcessed).toBe(100);
            expect(metrics.errorRate).toBe(0.01);
        });
    });
    describe('ConfigOptions', () => {
        it('should create valid ConfigOptions objects', () => {
            const config = {
                routerId: 'router-123',
                port: 3000,
                host: 'localhost',
                redis: {
                    url: 'redis://localhost:6379',
                    keyPrefix: 'router:',
                    ttl: 3600
                },
                network: {
                    peers: ['router-2', 'router-3'],
                    heartbeatInterval: 30000,
                    maxRetries: 3,
                    timeout: 5000
                },
                security: {
                    enableAuth: true,
                    jwtSecret: 'secret-key',
                    encryptionKey: 'encryption-key',
                    rateLimitWindow: 60000,
                    rateLimitMax: 100
                },
                ledgers: {
                    ethereum: {
                        type: types_1.LedgerType.SUI,
                        config: {
                            rpcUrl: 'https://eth.example.com',
                            privateKey: 'private-key'
                        }
                    }
                },
                monitoring: {
                    enableMetrics: true,
                    metricsPort: 9090,
                    enableHealthCheck: true,
                    logLevel: 'info'
                }
            };
            expect(config.port).toBe(3000);
            expect(config.network.peers).toContain('router-2');
            expect(config.security.enableAuth).toBe(true);
        });
    });
    describe('Type compatibility', () => {
        it('should handle bigint serialization concerns', () => {
            const amount = BigInt('1000000000000000000');
            // BigInt cannot be directly JSON.stringify'd
            expect(() => JSON.stringify({ amount })).toThrow();
            // But can be converted to string for serialization
            const serializable = { amount: amount.toString() };
            expect(JSON.stringify(serializable)).toContain('1000000000000000000');
        });
        it('should handle Map serialization concerns', () => {
            const balances = new Map();
            balances.set('asset-1', BigInt('1000'));
            // Maps don't serialize to JSON directly
            const serialized = JSON.stringify({ balances });
            expect(serialized).toBe('{"balances":{}}');
            // But can be converted to objects
            const balancesObj = Object.fromEntries(Array.from(balances.entries()).map(([k, v]) => [k, v.toString()]));
            expect(balancesObj['asset-1']).toBe('1000');
        });
        it('should handle Date serialization', () => {
            const date = new Date('2023-01-01T00:00:00.000Z');
            const serialized = JSON.stringify({ date });
            expect(serialized).toContain('2023-01-01T00:00:00.000Z');
        });
    });
});
//# sourceMappingURL=types.test.js.map