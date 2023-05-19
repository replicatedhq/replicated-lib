"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const configuration_1 = require("./configuration");
const customers_1 = require("./customers");
describe('CustomerService', () => {
    beforeAll(() => globalThis.provider.setup());
    afterEach(() => globalThis.provider.verify());
    afterAll(() => globalThis.provider.finalize());
    test('archive customer', () => {
        const expectedCluster = { cluster: { name: "cluster1", id: "1234abcd", status: "provisioning" } };
        const reqBody = {
            name: "cluster1",
            kubernetes_distribution: "kind",
            kubernetes_version: "v1.25.1",
            ttl: "10m",
        };
        globalThis.provider.addInteraction({
            state: 'customer archived',
            uponReceiving: 'a request for archiving a customer',
            withRequest: {
                method: 'POST',
                path: '/customer/1234abcd/archive'
            },
            willRespondWith: {
                status: 204,
                headers: { 'Content-Type': 'application/json' },
            }
        });
        const apiClient = new configuration_1.VendorPortalApi();
        apiClient.apiToken = "abcd1234";
        apiClient.endpoint = globalThis.provider.mockService.baseUrl;
        return (0, customers_1.archiveCustomer)(apiClient, "1234abcd").then(() => {
            expect(true).toEqual(true);
        }).catch((err) => {
            fail(err);
        });
    });
});
