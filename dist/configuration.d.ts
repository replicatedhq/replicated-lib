import * as httpClient from "@actions/http-client";
export declare class VendorPortalApi {
    endpoint: string;
    apiToken: string;
    client(): Promise<httpClient.HttpClient>;
}
