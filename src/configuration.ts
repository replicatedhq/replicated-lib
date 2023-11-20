// Replicated Library Configuration
import * as httpClient from '@actions/http-client';

export class VendorPortalApi {
    endpoint: string = 'https://api.replicated.com/vendor/v3';
    // apiToken with default value
    apiToken: string = 'default';

    async client(): Promise<httpClient.HttpClient> {
      const http = new httpClient.HttpClient()

      const headers = {
        "Authorization": this.apiToken,
        "Content-Type": "application/json",
        "Accept": "application/json"
      };

      // while this is specifically a github action, we still check
      // for the github actions environment variables
      if (process.env.CI) {
        headers["X-Replicated-CI"] = "true";
      }
      if (process.env.GITHUB_RUN_ID) {
        headers["X-Replicated-GitHubRunID"] = process.env.GITHUB_RUN_ID;
      }
      if (process.env.GITHUB_RUN_NUMBER) {
        headers["X-Replicated-GitHubRunNumber"] = process.env.GITHUB_RUN_NUMBER;
      }
      if (process.env.GITHUB_SERVER_URL) {
        headers["X-Replicated-GitHubServerURL"] = process.env.GITHUB_SERVER_URL;
      }
      if (process.env.GITHUB_REPOSITORY) {
        headers["X-Replicated-GitHubRepository"] = process.env.GITHUB_REPOSITORY;
      }

      http.requestOptions = {
        headers,
      }

      return http
  }
}
