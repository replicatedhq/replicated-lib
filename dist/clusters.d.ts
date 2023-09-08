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
export declare function createCluster(vendorPortalApi: VendorPortalApi, clusterName: string, k8sDistribution: string, k8sVersion: string, clusterTTL: string): Promise<Cluster>;
export declare function pollForStatus(vendorPortalApi: VendorPortalApi, clusterId: string, expectedStatus: string, timeout?: number): Promise<Cluster>;
export declare function getKubeconfig(vendorPortalApi: VendorPortalApi, clusterId: string): Promise<string>;
export declare function removeCluster(vendorPortalApi: VendorPortalApi, clusterId: string): Promise<void>;
export declare function upgradeCluster(vendorPortalApi: VendorPortalApi, clusterId: string, k8sVersion: string): Promise<Cluster>;
export declare function getClusterVersions(vendorPortalApi: VendorPortalApi): Promise<ClusterVersion[]>;
