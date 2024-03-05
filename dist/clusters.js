"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClusterVersions = exports.upgradeCluster = exports.removeCluster = exports.getKubeconfig = exports.pollForStatus = exports.createCluster = exports.StatusError = exports.ClusterVersion = exports.Cluster = void 0;
class Cluster {
}
exports.Cluster = Cluster;
class ClusterVersion {
}
exports.ClusterVersion = ClusterVersion;
class StatusError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.StatusError = StatusError;
async function createCluster(vendorPortalApi, clusterName, k8sDistribution, k8sVersion, clusterTTL, diskGib, nodeCount, minNodeCount, maxNodeCount, instanceType, nodeGroups, tags) {
    const http = await vendorPortalApi.client();
    const reqBody = {
        "name": clusterName,
        "kubernetes_distribution": k8sDistribution,
        "kubernetes_version": k8sVersion,
        "ttl": clusterTTL,
    };
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
    console.log(reqBody);
    const uri = `${vendorPortalApi.endpoint}/cluster`;
    const res = await http.post(uri, JSON.stringify(reqBody));
    if (res.message.statusCode != 201) {
        let body = "";
        try {
            body = await res.readBody();
        }
        catch (err) {
            // ignore
        }
        throw new Error(`Failed to queue cluster create: Server responded with ${res.message.statusCode}: ${body}`);
    }
    const body = JSON.parse(await res.readBody());
    return { name: body.cluster.name, id: body.cluster.id, status: body.cluster.status };
}
exports.createCluster = createCluster;
async function pollForStatus(vendorPortalApi, clusterId, expectedStatus, timeout = 120, sleeptimeMs = 5000) {
    // get clusters from the api, look for the status of the id to be ${status}
    // if it's not ${status}, sleep for 5 seconds and try again
    // if it is ${status}, return the cluster with that status
    await new Promise(f => setTimeout(f, sleeptimeMs)); // sleep for 5 seconds before polling as the cluster takes a few seconds to start provisioning
    // iterate for timeout/sleeptime times
    const iterations = timeout * 1000 / sleeptimeMs;
    for (let i = 0; i < iterations; i++) {
        try {
            const clusterDetails = await getClusterDetails(vendorPortalApi, clusterId);
            if (clusterDetails.status === expectedStatus) {
                return clusterDetails;
            }
            // Once state is "error", it will never change. So we can shortcut polling.
            if (clusterDetails.status === "error") {
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
        await new Promise(f => setTimeout(f, sleeptimeMs));
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
    return { name: body.cluster.name, id: body.cluster.id, status: body.cluster.status };
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
        "kubernetes_version": k8sVersion,
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
