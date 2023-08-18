import { VendorPortalApi } from './configuration';
export declare class Application {
    name: string;
    id: string;
    slug: string;
}
export declare function getApplicationDetails(vendorPortalApi: VendorPortalApi, appSlug: string): Promise<Application>;
