"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollForPortStatus = exports.exposeClusterPort = exports.pollForAddonStatus = exports.createAddonPostgres = exports.createAddonObjectStore = exports.getClusterVersions = exports.upgradeCluster = exports.removeCluster = exports.getKubeconfig = exports.pollForStatus = exports.createClusterWithLicense = exports.createCluster = exports.StatusError = exports.ClusterExposedPort = exports.ClusterPort = exports.Postgres = exports.ObjectStore = exports.Addon = exports.ClusterVersion = exports.Cluster = void 0;
class Cluster {
}
exports.Cluster = Cluster;
class ClusterVersion {
}
exports.ClusterVersion = ClusterVersion;
class Addon {
}
exports.Addon = Addon;
class ObjectStore {
}
exports.ObjectStore = ObjectStore;
class Postgres {
}
exports.Postgres = Postgres;
class ClusterPort {
}
exports.ClusterPort = ClusterPort;
class ClusterExposedPort {
}
exports.ClusterExposedPort = ClusterExposedPort;
class StatusError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.StatusError = StatusError;
async function createCluster(vendorPortalApi, clusterName, k8sDistribution, k8sVersion, clusterTTL, diskGib, nodeCount, minNodeCount, maxNodeCount, instanceType, nodeGroups, tags) {
    return await createClusterWithLicense(vendorPortalApi, clusterName, k8sDistribution, k8sVersion, '', clusterTTL, diskGib, nodeCount, minNodeCount, maxNodeCount, instanceType, nodeGroups, tags);
}
exports.createCluster = createCluster;
async function createClusterWithLicense(vendorPortalApi, clusterName, k8sDistribution, k8sVersion, licenseId, clusterTTL, diskGib, nodeCount, minNodeCount, maxNodeCount, instanceType, nodeGroups, tags) {
    const http = await vendorPortalApi.client();
    const reqBody = {
        name: clusterName,
        kubernetes_distribution: k8sDistribution,
        kubernetes_version: k8sVersion,
        ttl: clusterTTL
    };
    if (licenseId) {
        reqBody['license_id'] = licenseId;
    }
    if (diskGib) {
        reqBody['disk_gib'] = diskGib;
    }
    if (instanceType) {
        reqBody['instance_type'] = instanceType;
    }
    if (nodeCount) {
        reqBody['node_count'] = nodeCount;
    }
    if (minNodeCount) {
        reqBody['min_node_count'] = minNodeCount;
    }
    if (maxNodeCount) {
        reqBody['max_node_count'] = maxNodeCount;
    }
    if (nodeGroups) {
        reqBody['node_groups'] = nodeGroups;
    }
    if (tags) {
        reqBody['tags'] = tags;
    }
    const uri = `${vendorPortalApi.endpoint}/cluster`;
    const res = await http.post(uri, JSON.stringify(reqBody));
    if (res.message.statusCode != 201) {
        let body = '';
        try {
            body = await res.readBody();
        }
        catch (err) {
            // ignore
        }
        throw new Error(`Failed to queue cluster create: Server responded with ${res.message.statusCode}: ${body}`);
    }
    const body = JSON.parse(await res.readBody());
    return {
        name: body.cluster.name,
        id: body.cluster.id,
        status: body.cluster.status
    };
}
exports.createClusterWithLicense = createClusterWithLicense;
async function pollForStatus(vendorPortalApi, clusterId, expectedStatus, timeout = 120, sleeptimeMs = 5000) {
    // get clusters from the api, look for the status of the id to be ${status}
    // if it's not ${status}, sleep for 5 seconds and try again
    // if it is ${status}, return the cluster with that status
    await new Promise((f) => setTimeout(f, sleeptimeMs)); // sleep for 5 seconds before polling as the cluster takes a few seconds to start provisioning
    // iterate for timeout/sleeptime times
    const iterations = (timeout * 1000) / sleeptimeMs;
    for (let i = 0; i < iterations; i++) {
        try {
            const clusterDetails = await getClusterDetails(vendorPortalApi, clusterId);
            if (clusterDetails.status === expectedStatus) {
                return clusterDetails;
            }
            // Once state is "error", it will never change. So we can shortcut polling.
            if (clusterDetails.status === 'error') {
                throw new Error(`Cluster has entered error state.`);
            }
            console.debug(`Cluster status is ${clusterDetails.status}, sleeping for ${sleeptimeMs / 1000} seconds`);
        }
        catch (err) {
            if (err instanceof StatusError) {
                if (err.statusCode >= 500) {
                    // 5xx errors are likely transient, so we should retry
                    console.debug(`Got HTTP error with status ${err.statusCode}, sleeping for ${sleeptimeMs / 1000} seconds`);
                }
                else {
                    console.debug(`Got HTTP error with status ${err.statusCode}, exiting`);
                    throw err;
                }
            }
            else {
                throw err;
            }
        }
        await new Promise((f) => setTimeout(f, sleeptimeMs));
    }
    throw new Error(`Cluster did not reach state ${expectedStatus} within ${timeout} seconds`);
}
exports.pollForStatus = pollForStatus;
async function getClusterDetails(vendorPortalApi, clusterId) {
    const http = await vendorPortalApi.client();
    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
        throw new StatusError(`Failed to get cluster: Server responded with ${res.message.statusCode}`, res.message.statusCode);
    }
    const body = JSON.parse(await res.readBody());
    return {
        name: body.cluster.name,
        id: body.cluster.id,
        status: body.cluster.status
    };
}
async function getKubeconfig(vendorPortalApi, clusterId) {
    const http = await vendorPortalApi.client();
    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}/kubeconfig`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
        throw new StatusError(`Failed to get kubeconfig: Server responded with ${res.message.statusCode}`, res.message.statusCode);
    }
    const body = JSON.parse(await res.readBody());
    return atob(body.kubeconfig);
}
exports.getKubeconfig = getKubeconfig;
async function removeCluster(vendorPortalApi, clusterId) {
    const http = await vendorPortalApi.client();
    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}`;
    const res = await http.del(uri);
    if (res.message.statusCode != 200) {
        throw new StatusError(`Failed to remove cluster: Server responded with ${res.message.statusCode}`, res.message.statusCode);
    }
}
exports.removeCluster = removeCluster;
async function upgradeCluster(vendorPortalApi, clusterId, k8sVersion) {
    const http = await vendorPortalApi.client();
    const reqBody = {
        kubernetes_version: k8sVersion
    };
    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}/upgrade`;
    const res = await http.post(uri, JSON.stringify(reqBody));
    if (res.message.statusCode != 200) {
        throw new StatusError(`Failed to upgrade cluster: Server responded with ${res.message.statusCode}`, res.message.statusCode);
    }
    return getClusterDetails(vendorPortalApi, clusterId);
}
exports.upgradeCluster = upgradeCluster;
async function getClusterVersions(vendorPortalApi) {
    const http = await vendorPortalApi.client();
    const uri = `${vendorPortalApi.endpoint}/cluster/versions`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
        throw new StatusError(`Failed to get cluster versions: Server responded with ${res.message.statusCode}`, res.message.statusCode);
    }
    const body = JSON.parse(await res.readBody());
    // 2. Convert body into ClusterVersion[]
    let clusterVersions = [];
    for (const cluster of body['cluster-versions']) {
        for (const version of cluster.versions) {
            clusterVersions.push({
                name: cluster.short_name,
                version: version
            });
        }
    }
    return clusterVersions;
}
exports.getClusterVersions = getClusterVersions;
async function createAddonObjectStore(vendorPortalApi, clusterId, bucketName) {
    const http = await vendorPortalApi.client();
    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}/addon/objectstore`;
    const reqBody = {
        bucket: bucketName
    };
    const res = await http.post(uri, JSON.stringify(reqBody));
    if (res.message.statusCode != 201) {
        let body = '';
        try {
            body = await res.readBody();
        }
        catch (err) {
            // ignore
        }
        throw new Error(`Failed to queue addon create: Server responded with ${res.message.statusCode}: ${body}`);
    }
    const body = JSON.parse(await res.readBody());
    var addon = { id: body.id, status: body.status };
    if (body.object_store) {
        addon.object_store = {
            bucket_name: body.object_store.bucket_name,
            bucket_prefix: body.object_store.bucket_prefix,
            service_account_name: body.object_store.service_account_name,
            service_account_name_read_only: body.object_store.service_account_name_read_only,
            service_account_namespace: body.object_store.service_account_namespace
        };
    }
    return addon;
}
exports.createAddonObjectStore = createAddonObjectStore;
async function createAddonPostgres(vendorPortalApi, clusterId, version, instanceType, diskGib) {
    const http = await vendorPortalApi.client();
    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}/addon/postgres`;
    const reqBody = {};
    if (version) {
        reqBody['version'] = version;
    }
    if (instanceType) {
        reqBody['instance_type'] = instanceType;
    }
    if (diskGib) {
        reqBody['disk_gib'] = diskGib;
    }
    const res = await http.post(uri, JSON.stringify(reqBody));
    if (res.message.statusCode != 201) {
        let body = '';
        try {
            body = await res.readBody();
        }
        catch (err) {
            // ignore
        }
        throw new Error(`Failed to queue addon create: Server responded with ${res.message.statusCode}: ${body}`);
    }
    const body = JSON.parse(await res.readBody());
    var addon = { id: body.id, status: body.status };
    if (body.postgres) {
        addon.postgres = {
            uri: body.postgres.uri,
            version: body.postgres.version,
            instance_type: body.postgres.instance_type,
            disk_gib: body.postgres.disk_gib
        };
    }
    return addon;
}
exports.createAddonPostgres = createAddonPostgres;
async function pollForAddonStatus(vendorPortalApi, clusterId, addonId, expectedStatus, timeout = 120, sleeptimeMs = 5000) {
    // get addons from the api, look for the status of the id to be ${status}
    // if it's not ${status}, sleep for 5 seconds and try again
    // if it is ${status}, return the addon with that status
    await new Promise((f) => setTimeout(f, sleeptimeMs)); // sleep for sleeptimeMs seconds before polling as the addon takes a few seconds to start provisioning
    // iterate for timeout/sleeptime times
    const iterations = (timeout * 1000) / sleeptimeMs;
    for (let i = 0; i < iterations; i++) {
        try {
            const addonDetails = await getAddonDetails(vendorPortalApi, clusterId, addonId);
            if (addonDetails.status === expectedStatus) {
                return addonDetails;
            }
            // Once state is "error", it will never change. So we can shortcut polling.
            if (addonDetails.status === 'error') {
                throw new Error(`Addon has entered error state.`);
            }
            console.debug(`Cluster status is ${addonDetails.status}, sleeping for ${sleeptimeMs / 1000} seconds`);
        }
        catch (err) {
            if (err instanceof StatusError) {
                if (err.statusCode >= 500) {
                    // 5xx errors are likely transient, so we should retry
                    console.debug(`Got HTTP error with status ${err.statusCode}, sleeping for ${sleeptimeMs / 1000} seconds`);
                }
                else {
                    console.debug(`Got HTTP error with status ${err.statusCode}, exiting`);
                    throw err;
                }
            }
            else {
                throw err;
            }
        }
        await new Promise((f) => setTimeout(f, sleeptimeMs));
    }
    throw new Error(`Addon did not reach state ${expectedStatus} within ${timeout} seconds`);
}
exports.pollForAddonStatus = pollForAddonStatus;
async function getAddonDetails(vendorPortalApi, clusterId, addonId) {
    const http = await vendorPortalApi.client();
    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}/addons`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
        throw new StatusError(`Failed to get addon: Server responded with ${res.message.statusCode}`, res.message.statusCode);
    }
    const body = JSON.parse(await res.readBody());
    for (const addon of body.addons) {
        if (addon.id === addonId) {
            var addonObj = { id: addon.id, status: addon.status };
            if (addon.object_store) {
                addonObj.object_store = {
                    bucket_name: addon.object_store.bucket_name,
                    bucket_prefix: addon.object_store.bucket_prefix,
                    service_account_name: addon.object_store.service_account_name,
                    service_account_name_read_only: addon.object_store.service_account_name_read_only,
                    service_account_namespace: addon.object_store.service_account_namespace
                };
            }
            if (addon.postgres) {
                addonObj.postgres = {
                    uri: addon.postgres.uri,
                    version: addon.postgres.version,
                    instance_type: addon.postgres.instance_type,
                    disk_gib: addon.postgres.disk_gib
                };
            }
            return addonObj;
        }
    }
    throw new Error(`Addon with id ${addonId} not found`);
}
async function exposeClusterPort(vendorPortalApi, clusterId, port, protocols) {
    const http = await vendorPortalApi.client();
    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}/expose`;
    const reqBody = {
        port: port
    };
    const res = await http.post(uri, JSON.stringify(reqBody));
    if (res.message.statusCode != 201) {
        let body = '';
        try {
            body = await res.readBody();
        }
        catch (err) {
            // ignore
        }
        throw new Error(`Failed to expose cluster port: Server responded with ${res.message.statusCode}: ${body}`);
    }
    const body = JSON.parse(await res.readBody());
    return body;
}
exports.exposeClusterPort = exposeClusterPort;
async function pollForPortStatus(vendorPortalApi, clusterId, host, expectedStatus, timeout = 120, sleeptimeMs = 5000) {
    // get exposed ports from the api, look for the status of the host to be ${status}
    // if it's not ${status}, sleep for 5 seconds and try again
    // if it is ${status}, return the ClusterPort with that status
    await new Promise((f) => setTimeout(f, sleeptimeMs)); // sleep for sleeptimeMs seconds before polling as the ClusterPort takes a few seconds to start provisioning
    // iterate for timeout/sleeptime times
    const iterations = (timeout * 1000) / sleeptimeMs;
    for (let i = 0; i < iterations; i++) {
        try {
            const clusterPortDetails = await getPortDetails(vendorPortalApi, clusterId, host);
            if (clusterPortDetails.state === expectedStatus) {
                return clusterPortDetails;
            }
            // Once state is "error", it will never change. So we can shortcut polling.
            if (clusterPortDetails.state === 'error') {
                throw new Error(`Cluster port has entered error state.`);
            }
            console.debug(`Cluster status is ${clusterPortDetails.state}, sleeping for ${sleeptimeMs / 1000} seconds`);
        }
        catch (err) {
            if (err instanceof StatusError) {
                if (err.statusCode >= 500) {
                    // 5xx errors are likely transient, so we should retry
                    console.debug(`Got HTTP error with status ${err.statusCode}, sleeping for ${sleeptimeMs / 1000} seconds`);
                }
                else {
                    console.debug(`Got HTTP error with status ${err.statusCode}, exiting`);
                    throw err;
                }
            }
            else {
                throw err;
            }
        }
        await new Promise((f) => setTimeout(f, sleeptimeMs));
    }
    throw new Error(`Cluster port did not reach state ${expectedStatus} within ${timeout} seconds`);
}
exports.pollForPortStatus = pollForPortStatus;
async function getPortDetails(vendorPortalApi, clusterId, host) {
    const http = await vendorPortalApi.client();
    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}/ports`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
        throw new StatusError(`Failed to get ports: Server responded with ${res.message.statusCode}`, res.message.statusCode);
    }
    const body = JSON.parse(await res.readBody());
    for (const port of body.ports) {
        if (port.hostname === host) {
            var exposedPorts = [];
            for (const exposed_port of port.exposed_ports) {
                const exposedPort = {
                    protocol: exposed_port.protocol,
                    exposed_port: exposed_port.exposed_port
                };
                exposedPorts.push(exposedPort);
            }
            var portObj = {
                upstream_port: port.upstream_port,
                hostname: port.hostname,
                state: port.state,
                exposed_ports: exposedPorts
            };
            return portObj;
        }
    }
    throw new Error(`Port with hostname ${host} not found`);
}
