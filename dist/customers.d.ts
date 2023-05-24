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
export declare function createCustomer(vendorPortalApi: VendorPortalApi, appSlug: string, name: string, email: string, licenseType: string, channelSlug: string, entitlementValues?: entitlementValue[]): Promise<Customer>;
export declare function archiveCustomer(vendorPortalApi: VendorPortalApi, customerId: string): Promise<void>;
export {};
