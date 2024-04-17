"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorPortalApi = void 0;
// Replicated Library Configuration
const httpClient = require("@actions/http-client");
class VendorPortalApi {
    constructor() {
        this.endpoint = 'https://api.replicated.com/vendor/v3';
        // apiToken with default value
        this.apiToken = 'default';
    }
    async client() {
        const http = new httpClient.HttpClient();
        const headers = {
            Authorization: this.apiToken,
            'Content-Type': 'application/json',
            Accept: 'application/json'
        };
        // while this is specifically a github action, we still check
        // for the github actions environment variables
        if (process.env.CI) {
            headers['X-Replicated-CI'] = 'true';
        }
        if (process.env.GITHUB_RUN_ID) {
            headers['X-Replicated-GitHubRunID'] = process.env.GITHUB_RUN_ID;
        }
        if (process.env.GITHUB_RUN_NUMBER) {
            headers['X-Replicated-GitHubRunNumber'] = process.env.GITHUB_RUN_NUMBER;
        }
        if (process.env.GITHUB_SERVER_URL) {
            headers['X-Replicated-GitHubServerURL'] = process.env.GITHUB_SERVER_URL;
        }
        if (process.env.GITHUB_REPOSITORY) {
            headers['X-Replicated-GitHubRepository'] = process.env.GITHUB_REPOSITORY;
        }
        http.requestOptions = {
            headers
        };
        return http;
    }
}
exports.VendorPortalApi = VendorPortalApi;
