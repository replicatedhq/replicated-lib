import { VendorPortalApi } from './configuration';
export declare class Customer {
    name: string;
    customerId: string;
    licenseId: string;
    license: string;
}
export declare function createCustomer(vendorPortalApi: VendorPortalApi, appSlug: string, name: string, email: string, licenseType: string, channelName: string): Promise<Customer>;
export declare function archiveCustomer(vendorPortalApi: VendorPortalApi, customerId: string): Promise<void>;
