"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const configuration_1 = require("./configuration");
const _1 = require(".");
const clusters_1 = require("./clusters");
const mockttp = require("mockttp");
describe('ClusterService', () => {
    beforeAll(() => globalThis.provider.setup());
    afterEach(() => globalThis.provider.verify());
    afterAll(() => globalThis.provider.finalize());
    test('should return cluster', () => {
        const expectedCluster = {
            cluster: { name: 'cluster1', id: '1234abcd', status: 'provisioning' }
        };
        const reqBody = {
            name: 'cluster1',
            kubernetes_distribution: 'kind',
            kubernetes_version: 'v1.25.1',
            ttl: '10m'
        };
        globalThis.provider.addInteraction({
            state: 'cluster created',
            uponReceiving: 'a request for creating a cluster',
            withRequest: {
                method: 'POST',
                path: '/cluster',
                body: reqBody
            },
            willRespondWith: {
                status: 201,
                headers: { 'Content-Type': 'application/json' },
                body: expectedCluster
            }
        });
        const apiClient = new configuration_1.VendorPortalApi();
        apiClient.apiToken = 'abcd1234';
        apiClient.endpoint = globalThis.provider.mockService.baseUrl;
        return (0, _1.createCluster)(apiClient, 'cluster1', 'kind', 'v1.25.1', '10m').then((cluster) => {
            expect(cluster.name).toEqual(expectedCluster.cluster.name);
            expect(cluster.id).toEqual(expectedCluster.cluster.id);
            expect(cluster.status).toEqual(expectedCluster.cluster.status);
        });
    });
});
describe('ClusterService use cases', () => {
    const mockServer = mockttp.getLocal();
    const apiClient = new configuration_1.VendorPortalApi();
    apiClient.apiToken = 'abcd1234';
    beforeAll(async () => {
        await mockServer.start();
        apiClient.endpoint = `http://localhost:${mockServer.port}`;
    });
    afterAll(async () => {
        await mockServer.stop();
    });
    test('should return cluster with tags', async () => {
        const expectedCluster = {
            cluster: { name: 'cluster1', id: '1234abcd', status: 'provisioning' }
        };
        await mockServer
            .forPost('/cluster')
            .thenReply(201, JSON.stringify(expectedCluster));
        const tags = [{ key: 'foo', value: 'bar' }];
        const cluster = await (0, _1.createCluster)(apiClient, 'cluster1', 'kind', 'v1.25.1', '10m', undefined, undefined, undefined, undefined, undefined, undefined, tags);
        expect(cluster.name).toEqual(expectedCluster.cluster.name);
        expect(cluster.id).toEqual(expectedCluster.cluster.id);
        expect(cluster.status).toEqual(expectedCluster.cluster.status);
    });
    test('should return cluster with nodegroups', async () => {
        const expectedCluster = {
            cluster: { name: 'cluster1', id: '1234abcd', status: 'provisioning' }
        };
        await mockServer
            .forPost('/cluster')
            .thenReply(201, JSON.stringify(expectedCluster));
        const nodegroups = [
            { name: 'foo', node_count: 3, instance_type: 'r1.medium', disk_gib: 100 }
        ];
        const cluster = await (0, _1.createCluster)(apiClient, 'cluster1', 'eks', 'v1.29', '10m', undefined, undefined, undefined, undefined, undefined, nodegroups);
        expect(cluster.name).toEqual(expectedCluster.cluster.name);
        expect(cluster.id).toEqual(expectedCluster.cluster.id);
        expect(cluster.status).toEqual(expectedCluster.cluster.status);
    });
    test('should return cluster with license_id', async () => {
        const expectedCluster = {
            cluster: { name: 'cluster1', id: '1234abcd', status: 'provisioning' }
        };
        await mockServer
            .forPost('/cluster')
            .thenReply(201, JSON.stringify(expectedCluster));
        const cluster = await (0, _1.createClusterWithLicense)(apiClient, 'cluster1', 'embedded-cluster', '', 'license1', '10m');
        expect(cluster.name).toEqual(expectedCluster.cluster.name);
        expect(cluster.id).toEqual(expectedCluster.cluster.id);
        expect(cluster.status).toEqual(expectedCluster.cluster.status);
    });
    test('upgrade a kurl cluster', async () => {
        const expectedUpgradeResponse = {};
        await mockServer
            .forPost('/cluster/1234abcd/upgrade')
            .thenReply(200, JSON.stringify(expectedUpgradeResponse));
        await mockServer
            .forGet('/cluster/1234abcd')
            .thenReply(200, JSON.stringify({ cluster: { id: '1234abcd', status: 'upgrading' } }));
        const cluster = await (0, _1.upgradeCluster)(apiClient, '1234abcd', 'latest');
        expect(cluster.id).toEqual('1234abcd');
        expect(cluster.status).toEqual('upgrading');
    });
});
describe('pollForCluster', () => {
    const mockServer = mockttp.getLocal();
    const apiClient = new configuration_1.VendorPortalApi();
    apiClient.apiToken = 'abcd1234';
    beforeEach(async () => {
        await mockServer.start();
        apiClient.endpoint = `http://localhost:${mockServer.port}`;
    });
    afterEach(async () => {
        await mockServer.stop();
    });
    test('should eventually return success with expected status', async () => {
        const expectedCluster = {
            id: '1234abcd',
            name: 'cluster1',
            status: 'running'
        };
        const responseCluster = { id: '1234abcd', name: 'cluster1' };
        await mockServer
            .forGet(`/cluster/${responseCluster.id}`)
            .once()
            .thenReply(200, JSON.stringify({
            cluster: Object.assign(Object.assign({}, responseCluster), { status: 'preparing' })
        }));
        await mockServer
            .forGet(`/cluster/${responseCluster.id}`)
            .once()
            .thenReply(200, JSON.stringify({
            cluster: Object.assign(Object.assign({}, responseCluster), { status: 'provisioning' })
        }));
        await mockServer
            .forGet(`/cluster/${responseCluster.id}`)
            .once()
            .thenReply(503);
        await mockServer.forGet(`/cluster/1234abcd`).thenReply(200, JSON.stringify({
            cluster: Object.assign(Object.assign({}, responseCluster), { status: 'running' })
        }));
        const cluster = await (0, _1.pollForStatus)(apiClient, '1234abcd', 'running', 1, 10);
        expect(cluster).toEqual(expectedCluster);
    });
    test('should still fail on 404', async () => {
        const responseCluster = { id: '1234abcd', name: 'cluster1' };
        await mockServer
            .forGet(`/cluster/${responseCluster.id}`)
            .once()
            .thenReply(200, JSON.stringify({
            cluster: Object.assign(Object.assign({}, responseCluster), { status: 'preparing' })
        }));
        await mockServer
            .forGet(`/cluster/${responseCluster.id}`)
            .once()
            .thenReply(200, JSON.stringify({
            cluster: Object.assign(Object.assign({}, responseCluster), { status: 'provisioning' })
        }));
        await mockServer.forGet(`/cluster/${responseCluster.id}`).thenReply(404);
        await expect((0, _1.pollForStatus)(apiClient, '1234abcd', 'running', 1, 10)).rejects.toThrow(clusters_1.StatusError);
    });
});
describe('Cluster Add-ons', () => {
    const mockServer = mockttp.getLocal();
    const apiClient = new configuration_1.VendorPortalApi();
    apiClient.apiToken = 'abcd1234';
    beforeAll(async () => {
        await mockServer.start();
        apiClient.endpoint = `http://localhost:${mockServer.port}`;
    });
    afterAll(async () => {
        await mockServer.stop();
    });
    test('should return object store add-on', async () => {
        const clusterId = '1234abcd';
        const expectedAddon = {
            addon: {
                id: 'abcd1234',
                status: 'applied',
                object_store: {
                    bucket_name: 'test-abcd1234-cmx',
                    bucket_prefix: 'test',
                    service_account_name: 'cmx',
                    service_account_name_read_only: 'cmx-ro',
                    service_account_namespace: 'cmx'
                }
            }
        };
        await mockServer
            .forPost(`/cluster/${clusterId}/addons/objectstore`)
            .thenReply(201, JSON.stringify(expectedAddon));
        const addon = await (0, clusters_1.createAddonObjectStore)(apiClient, clusterId, 'test');
        expect(addon.id).toEqual(expectedAddon.addon.id);
        expect(addon.status).toEqual(expectedAddon.addon.status);
        expect(addon.object_store).toEqual(expectedAddon.addon.object_store);
    });
    test('should return postgres add-on', async () => {
        const clusterId = '1234abcd';
        const expectedAddon = {
            addon: {
                id: 'abcd1234',
                status: 'applied',
                postgres: {
                    uri: 'postgres://postgres:1234@test:5432',
                    version: '16.2',
                    instance_type: 'db.t3.micro',
                    disk_gib: 200
                }
            }
        };
        await mockServer
            .forPost(`/cluster/${clusterId}/addons/postgres`)
            .thenReply(201, JSON.stringify(expectedAddon));
        const addon = await (0, clusters_1.createAddonPostgres)(apiClient, clusterId);
        expect(addon.id).toEqual(expectedAddon.addon.id);
        expect(addon.status).toEqual(expectedAddon.addon.status);
        expect(addon.postgres).toEqual(expectedAddon.addon.postgres);
    });
    test('should eventually return success with expected status', async () => {
        const clusterId = '1234abcd';
        const expectedAddon = { id: '1234abcd', status: 'ready' };
        const responseAddonsPending = [{ id: '1234abcd', status: 'pending' }];
        const responseAddonsApplied = [{ id: '1234abcd', status: 'applied' }];
        const responseAddonsReady = [{ id: '1234abcd', status: 'ready' }];
        await mockServer
            .forGet(`/cluster/${clusterId}/addons`)
            .once()
            .thenReply(200, JSON.stringify({
            addons: responseAddonsPending
        }));
        await mockServer
            .forGet(`/cluster/${clusterId}/addons`)
            .once()
            .thenReply(200, JSON.stringify({
            addons: responseAddonsApplied
        }));
        await mockServer
            .forGet(`/cluster/${clusterId}/addons`)
            .once()
            .thenReply(503);
        await mockServer.forGet(`/cluster/${clusterId}/addons`).thenReply(200, JSON.stringify({
            addons: responseAddonsReady
        }));
        const addon = await (0, clusters_1.pollForAddonStatus)(apiClient, '1234abcd', '1234abcd', 'ready', 1, 10);
        expect(addon).toEqual(expectedAddon);
    });
    test('should still fail on 404', async () => {
        const clusterId = '1234abcd';
        const responseAddonsPending = [{ id: '1234abcd', status: 'pending' }];
        const responseAddonsApplied = [{ id: '1234abcd', status: 'applied' }];
        await mockServer
            .forGet(`/cluster/${clusterId}/addons`)
            .once()
            .thenReply(200, JSON.stringify({
            addons: responseAddonsPending
        }));
        await mockServer
            .forGet(`/cluster/${clusterId}/addons`)
            .once()
            .thenReply(200, JSON.stringify({
            addons: responseAddonsApplied
        }));
        await mockServer.forGet(`/cluster/${clusterId}/addons`).thenReply(404);
        await expect((0, clusters_1.pollForAddonStatus)(apiClient, '1234abcd', '1234abcd', 'ready', 1, 10)).rejects.toThrow(clusters_1.StatusError);
    });
});
describe('Cluster Exposed Ports', () => {
    const mockServer = mockttp.getLocal();
    const apiClient = new configuration_1.VendorPortalApi();
    apiClient.apiToken = 'abcd1234';
    beforeAll(async () => {
        await mockServer.start();
        apiClient.endpoint = `http://localhost:${mockServer.port}`;
    });
    afterAll(async () => {
        await mockServer.stop();
    });
    test('should return exposed port', async () => {
        const clusterId = '1234abcd';
        const expectedExposedPort = {
            port: {
                upstream_port: 80,
                hostname: 'http://mystifying-kepler.ingress.replicatedcluster.com/',
                exposed_ports: [{ exposed_port: 80, protocol: 'http' }]
            }
        };
        await mockServer
            .forPost(`/cluster/${clusterId}/port`)
            .thenReply(201, JSON.stringify(expectedExposedPort));
        const clusterPort = await (0, clusters_1.exposeClusterPort)(apiClient, clusterId, 80, ['http']);
        expect(clusterPort).toEqual(expectedExposedPort.port);
    });
});
