// Replicated Library Configuration
import * as httpClient from '@actions/http-client';

export class VendorPortalApi {
    endpoint: string = 'https://api.replicated.com/vendor/v3';
    // apiToken with default value
    apiToken: string = 'default';

    async client(): Promise<httpClient.HttpClient> {
      const http = new httpClient.HttpClient()
      const replicatedEndpoint= this.endpoint;
      http.requestOptions = {
        headers: {
          "Authorization": this.apiToken,
          "Content-Type": "application/json",
          "Accept": "application/json",
        }
      }
  
      return http
  }
}