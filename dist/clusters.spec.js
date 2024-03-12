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
            uponReceiving: 'a request for creating a cluster with tags',
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
        return (0, clusters_1.createCluster)(apiClient, "cluster1", "kind", "v1.25.1", "10m", undefined, undefined, undefined, undefined, undefined, undefined, tags)
            .then(cluster => {
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
            uponReceiving: 'a request for creating a cluster with nodegroups',
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
        return (0, clusters_1.createCluster)(apiClient, "cluster1", "eks", "v1.29", "10m", undefined, undefined, undefined, undefined, undefined, nodegroups)
            .then(cluster => {
            expect(cluster.name).toEqual(expectedCluster.cluster.name);
            expect(cluster.id).toEqual(expectedCluster.cluster.id);
            expect(cluster.status).toEqual(expectedCluster.cluster.status);
        });
    });
});
describe('ClusterService with license_id', () => {
    beforeAll(() => globalThis.provider.setup());
    afterEach(() => globalThis.provider.verify());
    afterAll(() => globalThis.provider.finalize());
    test('should return cluster with license_id', () => {
        const expectedCluster = { cluster: { name: "cluster1", id: "1234abcd", status: "provisioning" } };
        const reqBody = {
            name: "cluster1",
            kubernetes_distribution: "embedded-cluster",
            "kubernetes_version": "",
            ttl: "10m",
            "license_id": "license1",
        };
        globalThis.provider.addInteraction({
            state: 'cluster created',
            uponReceiving: 'a request for creating a cluster with license_id',
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
        return (0, clusters_1.createClusterWithLicense)(apiClient, "cluster1", "embedded-cluster", "", "license1", "10m")
            .then(cluster => {
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
    beforeEach(async () => {
        await mockServer.start();
        apiClient.endpoint = `http://localhost:${mockServer.port}`;
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
describe('pollForCluster', () => {
    const mockServer = mockttp.getLocal();
    const apiClient = new configuration_1.VendorPortalApi();
    apiClient.apiToken = "abcd1234";
    beforeEach(async () => {
        await mockServer.start();
        apiClient.endpoint = `http://localhost:${mockServer.port}`;
    });
    afterEach(async () => {
        mockServer.stop();
    });
    test('should eventually return success with expected status', async () => {
        const expectedCluster = { id: "1234abcd", name: "cluster1", status: "running" };
        const responseCluster = { id: "1234abcd", name: "cluster1" };
        await mockServer.forGet(`/cluster/${responseCluster.id}`).once().thenReply(200, JSON.stringify({
            cluster: Object.assign(Object.assign({}, responseCluster), { status: "preparing" }),
        }));
        await mockServer.forGet(`/cluster/${responseCluster.id}`).once().thenReply(200, JSON.stringify({
            cluster: Object.assign(Object.assign({}, responseCluster), { status: "provisioning" }),
        }));
        await mockServer.forGet(`/cluster/${responseCluster.id}`).once().thenReply(503);
        await mockServer.forGet(`/cluster/1234abcd`).thenReply(200, JSON.stringify({
            cluster: Object.assign(Object.assign({}, responseCluster), { status: "running" }),
        }));
        const cluster = await (0, clusters_1.pollForStatus)(apiClient, "1234abcd", "running", 1, 10);
        expect(cluster).toEqual(expectedCluster);
    });
    test('should still fail on 404', async () => {
        const responseCluster = { id: "1234abcd", name: "cluster1" };
        await mockServer.forGet(`/cluster/${responseCluster.id}`).once().thenReply(200, JSON.stringify({
            cluster: Object.assign(Object.assign({}, responseCluster), { status: "preparing" }),
        }));
        await mockServer.forGet(`/cluster/${responseCluster.id}`).once().thenReply(200, JSON.stringify({
            cluster: Object.assign(Object.assign({}, responseCluster), { status: "provisioning" }),
        }));
        await mockServer.forGet(`/cluster/${responseCluster.id}`).thenReply(404);
        await expect((0, clusters_1.pollForStatus)(apiClient, "1234abcd", "running", 1, 10)).rejects.toThrow(clusters_1.StatusError);
    });
});
