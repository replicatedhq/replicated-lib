"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectedApplications = void 0;
const applications_1 = require("./applications");
const configuration_1 = require("./configuration");
exports.expectedApplications = { 'apps': [
        { id: "1234abcd", name: 'App 1', slug: 'app-1' },
        { id: "5678efgh", name: 'App 2', slug: 'app-2' }
    ] };
const applicationInteraction = {
    state: 'applications exist',
    uponReceiving: 'a request for applications',
    withRequest: {
        method: 'GET',
        path: '/apps'
    },
    willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: exports.expectedApplications
    }
};
describe('ApplicationService', () => {
    beforeAll(() => globalThis.provider.setup());
    afterEach(() => globalThis.provider.verify());
    afterAll(() => globalThis.provider.finalize());
    test('should return application', () => {
        globalThis.provider.addInteraction(applicationInteraction);
        const apiClient = new configuration_1.VendorPortalApi();
        apiClient.apiToken = "abcd1234";
        apiClient.endpoint = globalThis.provider.mockService.baseUrl;
        return (0, applications_1.getApplicationDetails)(apiClient, "app-1").then(application => {
            expect(application).toEqual(exports.expectedApplications.apps[0]);
        });
    });
});
