import { VendorPortalApi } from './configuration';
export declare class Customer {
    name: string;
    customerId: string;
    licenseId: string;
    license: string;
}
interface entitlementValue {
    name: string;
    value: string;
}
export declare class KubernetesDistribution {
    k8sDistribution: string;
    k8sVersion: string;
    kotsVersion: string;
    cloudProvider: string;
    isKurl: boolean;
    numberOfInstances: number;
    isAirgap: boolean;
}
export declare function createCustomer(vendorPortalApi: VendorPortalApi, appSlug: string, name: string, email: string, licenseType: string, channelSlug: string, expiresIn: number, entitlementValues?: entitlementValue[]): Promise<Customer>;
export declare function archiveCustomer(vendorPortalApi: VendorPortalApi, customerId: string): Promise<void>;
export declare function listCustomerClusters(vendorPortalApi: VendorPortalApi, appSlug: string): Promise<KubernetesDistribution[]>;
export {};
