"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClusterVersions = exports.removeCluster = exports.getKubeconfig = exports.getClusterDetails = exports.pollForStatus = exports.createCluster = exports.ClusterVersion = exports.Cluster = void 0;
const configuration_1 = require("./configuration");
class Cluster {
}
exports.Cluster = Cluster;
class ClusterVersion {
}
exports.ClusterVersion = ClusterVersion;
async function createCluster(vendorPortalApi, clusterName, k8sDistribution, k8sVersion, clusterTTL) {
    const http = await (0, configuration_1.client)(vendorPortalApi);
    const reqBody = {
        "name": clusterName,
        "kubernetes_distribution": k8sDistribution,
        "kubernetes_version": k8sVersion,
        "ttl": clusterTTL,
        "disk_gib": 50,
    };
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
async function pollForStatus(vendorPortalApi, clusterId, expectedStatus, timeout = 120) {
    // get clusters from the api, look for the status of the id to be ${status}
    // if it's not ${status}, sleep for 5 seconds and try again
    // if it is ${status}, return the cluster with that status
    const sleeptime = 5;
    await new Promise(f => setTimeout(f, sleeptime * 1000)); // sleep for 5 seconds before polling as the cluster takes a few seconds to start provisioning
    // iterate for timeout/sleeptime times
    for (let i = 0; i < timeout / sleeptime; i++) {
        const clusterDetails = await getClusterDetails(vendorPortalApi, clusterId);
        if (clusterDetails.status === expectedStatus) {
            return clusterDetails;
        }
        console.debug(`Cluster status is ${clusterDetails.status}, sleeping for ${sleeptime} seconds`);
        await new Promise(f => setTimeout(f, sleeptime * 1000));
    }
    throw new Error(`Cluster did not reach state ${expectedStatus} within ${timeout} seconds`);
}
exports.pollForStatus = pollForStatus;
async function getClusterDetails(vendorPortalApi, clusterId) {
    const http = await (0, configuration_1.client)(vendorPortalApi);
    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
        throw new Error(`Failed to get cluster: Server responded with ${res.message.statusCode}`);
    }
    const body = JSON.parse(await res.readBody());
    return { name: body.cluster.name, id: body.cluster.id, status: body.cluster.status };
}
exports.getClusterDetails = getClusterDetails;
async function getKubeconfig(vendorPortalApi, clusterId) {
    const http = await (0, configuration_1.client)(vendorPortalApi);
    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}/kubeconfig`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
        throw new Error(`Failed to get kubeconfig: Server responded with ${res.message.statusCode}`);
    }
    const body = JSON.parse(await res.readBody());
    return atob(body.kubeconfig);
}
exports.getKubeconfig = getKubeconfig;
async function removeCluster(vendorPortalApi, clusterId) {
    const http = await (0, configuration_1.client)(vendorPortalApi);
    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}`;
    const res = await http.del(uri);
    if (res.message.statusCode != 200) {
        throw new Error(`Failed to remove cluster: Server responded with ${res.message.statusCode}`);
    }
}
exports.removeCluster = removeCluster;
async function getClusterVersions(vendorPortalApi) {
    const http = await (0, configuration_1.client)(vendorPortalApi);
    const uri = `${vendorPortalApi.endpoint}/cluster/versions`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
        throw new Error(`Failed to get cluster versions: Server responded with ${res.message.statusCode}`);
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
