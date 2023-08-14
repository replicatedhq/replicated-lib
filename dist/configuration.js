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
        const replicatedEndpoint = this.endpoint;
        http.requestOptions = {
            headers: {
                "Authorization": this.apiToken,
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
        };
        return http;
    }
}
exports.VendorPortalApi = VendorPortalApi;
