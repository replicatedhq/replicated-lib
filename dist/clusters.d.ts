import { VendorPortalApi } from "./configuration";
export declare class Cluster {
    name: string;
    id: string;
    status: string;
}
export declare class ClusterVersion {
    name: string;
    version: string;
}
export declare class Addon {
    id: string;
    status: string;
    object_store?: ObjectStore;
    postgres?: Postgres;
}
export declare class ObjectStore {
    bucket_name: string;
    bucket_prefix: string;
    service_account_name: string;
    service_account_name_read_only: string;
    service_account_namespace: string;
}
export declare class Postgres {
    version: string;
    instance_type: string;
    disk_gib: number;
    uri: string;
}
export declare class StatusError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number);
}
interface tag {
    key: string;
    value: string;
}
interface nodeGroup {
    name: string;
    node_count: number;
    min_node_count?: number;
    max_node_count?: number;
    instance_type: string;
    disk_gib: number;
}
export declare function createCluster(vendorPortalApi: VendorPortalApi, clusterName: string, k8sDistribution: string, k8sVersion: string, clusterTTL: string, diskGib?: number, nodeCount?: number, minNodeCount?: number, maxNodeCount?: number, instanceType?: string, nodeGroups?: nodeGroup[], tags?: tag[]): Promise<Cluster>;
export declare function createClusterWithLicense(vendorPortalApi: VendorPortalApi, clusterName: string, k8sDistribution: string, k8sVersion: string, licenseId: string, clusterTTL: string, diskGib?: number, nodeCount?: number, minNodeCount?: number, maxNodeCount?: number, instanceType?: string, nodeGroups?: nodeGroup[], tags?: tag[]): Promise<Cluster>;
export declare function pollForStatus(vendorPortalApi: VendorPortalApi, clusterId: string, expectedStatus: string, timeout?: number, sleeptimeMs?: number): Promise<Cluster>;
export declare function getKubeconfig(vendorPortalApi: VendorPortalApi, clusterId: string): Promise<string>;
export declare function removeCluster(vendorPortalApi: VendorPortalApi, clusterId: string): Promise<void>;
export declare function upgradeCluster(vendorPortalApi: VendorPortalApi, clusterId: string, k8sVersion: string): Promise<Cluster>;
export declare function getClusterVersions(vendorPortalApi: VendorPortalApi): Promise<ClusterVersion[]>;
export declare function createAddonObjectStore(vendorPortalApi: VendorPortalApi, clusterId: string, bucketName: string): Promise<Addon>;
export declare function createAddonPostgres(vendorPortalApi: VendorPortalApi, clusterId: string, version?: string, instanceType?: string, diskGib?: number): Promise<Addon>;
export declare function pollForAddonStatus(vendorPortalApi: VendorPortalApi, clusterId: string, addonId: string, expectedStatus: string, timeout?: number, sleeptimeMs?: number): Promise<Addon>;
export {};
