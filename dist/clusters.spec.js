"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const configuration_1 = require("./configuration");
const clusters_1 = require("./clusters");
const mockttp = require("mockttp");
describe('ClusterService', () => {
    beforeAll(() => globalThis.provider.setup());
    afterEach(() => globalThis.provider.verify());
    afterAll(() => globalThis.provider.finalize());
    test('should return cluster', () => {
        const expectedCluster = { cluster: { name: "cluster1", id: "1234abcd", status: "provisioning" } };
        const reqBody = {
            name: "cluster1",
            kubernetes_distribution: "kind",
            kubernetes_version: "v1.25.1",
            ttl: "10m",
        };
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
        const apiClient = new configuration_1.VendorPortalApi();
        apiClient.apiToken = "abcd1234";
        apiClient.endpoint = globalThis.provider.mockService.baseUrl;
        return (0, clusters_1.createCluster)(apiClient, "cluster1", "kind", "v1.25.1", "10m").then(cluster => {
            expect(cluster.name).toEqual(expectedCluster.cluster.name);
            expect(cluster.id).toEqual(expectedCluster.cluster.id);
            expect(cluster.status).toEqual(expectedCluster.cluster.status);
        });
    });
});
describe('ClusterService with tags', () => {
    beforeAll(() => globalThis.provider.setup());
    afterEach(() => globalThis.provider.verify());
    afterAll(() => globalThis.provider.finalize());
    test('should return cluster with tags', () => {
        const expectedCluster = { cluster: { name: "cluster1", id: "1234abcd", status: "provisioning" } };
        const reqBody = {
            name: "cluster1",
            kubernetes_distribution: "kind",
            kubernetes_version: "v1.25.1",
            ttl: "10m",
            tags: [
                {
                    key: "foo",
                    value: "bar"
                }
            ]
        };
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
        const apiClient = new configuration_1.VendorPortalApi();
        apiClient.apiToken = "abcd1234";
        apiClient.endpoint = globalThis.provider.mockService.baseUrl;
        const tags = [{ key: "foo", value: "bar" }];
        return (0, clusters_1.createCluster)(apiClient, "cluster1", "kind", "v1.25.1", "10m", undefined, undefined, undefined, undefined, tags).then(cluster => {
            expect(cluster.name).toEqual(expectedCluster.cluster.name);
            expect(cluster.id).toEqual(expectedCluster.cluster.id);
            expect(cluster.status).toEqual(expectedCluster.cluster.status);
        });
    });
});
describe('ClusterService with nodegroups', () => {
    beforeAll(() => globalThis.provider.setup());
    afterEach(() => globalThis.provider.verify());
    afterAll(() => globalThis.provider.finalize());
    test('should return cluster with nodegroups', () => {
        const expectedCluster = { cluster: { name: "cluster1", id: "1234abcd", status: "provisioning" } };
        const reqBody = {
            name: "cluster1",
            kubernetes_distribution: "eks",
            kubernetes_version: "v1.29",
            ttl: "10m",
            node_groups: [
                {
                    name: "foo",
                    node_count: 3,
                    instance_type: "r1.medium",
                    disk_gib: 100
                }
            ]
        };
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
        const apiClient = new configuration_1.VendorPortalApi();
        apiClient.apiToken = "abcd1234";
        apiClient.endpoint = globalThis.provider.mockService.baseUrl;
        const nodegroups = [{ name: "foo", node_count: 3, instance_type: "r1.medium", disk_gib: 100 }];
        return (0, clusters_1.createCluster)(apiClient, "cluster1", "eks", "v1.29", "10m", undefined, undefined, undefined, nodegroups).then(cluster => {
            expect(cluster.name).toEqual(expectedCluster.cluster.name);
            expect(cluster.id).toEqual(expectedCluster.cluster.id);
            expect(cluster.status).toEqual(expectedCluster.cluster.status);
        });
    });
});
describe('upgradeCluster', () => {
    const mockServer = mockttp.getLocal();
    const apiClient = new configuration_1.VendorPortalApi();
    apiClient.apiToken = "abcd1234";
    apiClient.endpoint = "http://localhost:8080";
    beforeEach(async () => {
        mockServer.start(8080);
    });
    afterEach(async () => {
        mockServer.stop();
    });
    it("upgrade a kurl cluster", async () => {
        const expectedUpgradeResponse = {};
        await mockServer.forPost("/cluster/1234abcd/upgrade").thenReply(200, JSON.stringify(expectedUpgradeResponse));
        await mockServer.forGet("/cluster/1234abcd").thenReply(200, JSON.stringify({ cluster: { id: "1234abcd", status: "upgrading" } }));
        const cluster = await (0, clusters_1.upgradeCluster)(apiClient, "1234abcd", "latest");
        expect(cluster.id).toEqual("1234abcd");
        expect(cluster.status).toEqual("upgrading");
    });
});
