import { VendorPortalApi } from "./configuration";
import { createCluster } from "./clusters";

describe('ClusterService', () => {

    beforeAll(() => globalThis.provider.setup());
    afterEach(() => globalThis.provider.verify());
    afterAll(() => globalThis.provider.finalize());

    test('should return cluster', () => {
        const expectedCluster = { cluster: { name: "cluster1", id: "1234abcd", status: "provisioning" } }
        const reqBody = {
            name: "cluster1",
            kubernetes_distribution: "kind",
            kubernetes_version: "v1.25.1",
            ttl: "10m",
            disk_gib: 50,
        }
        globalThis.provider.addInteraction({
            state: 'cluster created',
            uponReceiving: 'a request for creating a cluster',
            withRequest: {
                method: 'POST',
                path: '/cluster',
                body: reqBody,
            },
            willRespondWith: {
                status: 201,
                headers: { 'Content-Type': 'application/json' },
                body: expectedCluster
            }
        });

        const apiClient = new VendorPortalApi();
        apiClient.apiToken = "abcd1234";
        apiClient.endpoint = globalThis.provider.mockService.baseUrl;

        return createCluster(apiClient, "cluster1", "kind", "v1.25.1", "10m").then(cluster => {
            expect(cluster.name).toEqual(expectedCluster.cluster.name);
            expect(cluster.id).toEqual(expectedCluster.cluster.id);
            expect(cluster.status).toEqual(expectedCluster.cluster.status);
        });
    });
});