"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = exports.VendorPortalApi = void 0;
// Replicated Library Configuration
const httpClient = require("@actions/http-client");
class VendorPortalApi {
    constructor() {
        this.endpoint = 'https://api.replicated.com/vendor/v3';
        // apiToken with default value
        this.apiToken = 'default';
    }
}
exports.VendorPortalApi = VendorPortalApi;
async function client(vendorPortalApi) {
    const http = new httpClient.HttpClient();
    const replicatedEndpoint = vendorPortalApi.endpoint;
    http.requestOptions = {
        headers: {
            "Authorization": vendorPortalApi.apiToken,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
    };
    return http;
}
exports.client = client;
