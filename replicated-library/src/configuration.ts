// Replicated Library Configuration
import * as httpClient from '@actions/http-client';

export class VendorPortalApi {
    endpoint: string = 'https://api.replicated.com/vendor/v3';
    // apiToken with default value
    apiToken: string = 'default';
}

export async function client(vendorPortalApi: VendorPortalApi): Promise<httpClient.HttpClient> {
    const http = new httpClient.HttpClient()
    const replicatedEndpoint= vendorPortalApi.endpoint;
    http.requestOptions = {
      headers: {
        "Authorization": vendorPortalApi.apiToken,
        "Content-Type": "application/json",
        "Accept": "application/json",
      }
    }

    return http
}