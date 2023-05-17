import * as httpClient from '@actions/http-client';
export declare class VendorPortalApi {
    endpoint: string;
    apiToken: string;
}
export declare function client(vendorPortalApi: VendorPortalApi): Promise<httpClient.HttpClient>;
