import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { FinID, RoutingTable, NetworkTopology, RouteStep } from '../types';
export declare class RoutingEngine {
    private redis;
    private logger;
    private routingTable;
    private readonly ROUTING_TABLE_KEY;
    private readonly NETWORK_TOPOLOGY_KEY;
    constructor(redis: RedisClientType, logger: Logger);
    initialize(): Promise<void>;
    findRoute(fromAccount: FinID, toAccount: FinID, networkTopology: NetworkTopology): Promise<RouteStep[]>;
    private findIntermediateRouters;
    private domainToLedgerId;
    updateRoutingTable(destination: FinID, nextHop: string, cost: number, hops: number): Promise<void>;
    getRoutingTable(): Promise<RoutingTable[]>;
    discoverRoutes(networkTopology: NetworkTopology): Promise<void>;
    private ledgerIdToDomain;
    calculateOptimalRoute(fromAccount: FinID, toAccount: FinID, networkTopology: NetworkTopology): Promise<{
        route: RouteStep[];
        cost: number;
        estimatedTime: number;
    }>;
    validateRoute(route: RouteStep[]): Promise<boolean>;
    private loadRoutingTable;
    private saveRoutingTable;
    clearRoutingTable(): Promise<void>;
    getRouteMetrics(): Promise<{
        totalRoutes: number;
        averageCost: number;
        averageHops: number;
    }>;
}
//# sourceMappingURL=RoutingEngine.d.ts.map