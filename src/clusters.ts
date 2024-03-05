import { VendorPortalApi } from "./configuration";

export class Cluster {
    name: string;
    id: string;
    status: string;
}

export class ClusterVersion {
  name: string;
  version: string;
}

export class StatusError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

interface tag {
  key: string;
  value: string;
}

interface nodeGroup {
  name: string;
  node_count: number;
  min_node_count?: number;
  max_node_count?: number;
  instance_type: string;
  disk_gib: number;
}


export async function createCluster(vendorPortalApi: VendorPortalApi, clusterName: string, k8sDistribution: string, k8sVersion: string, 
                                    clusterTTL: string, diskGib?: number, nodeCount?: number, minNodeCount?: number, maxNodeCount?: number,
                                    instanceType?: string, nodeGroups?:nodeGroup[], tags?: tag[]): Promise<Cluster> {
    const http = await vendorPortalApi.client();

    const reqBody = {
        "name": clusterName,
        "kubernetes_distribution": k8sDistribution,
        "kubernetes_version": k8sVersion,
        "ttl": clusterTTL,
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

    console.log(reqBody);
    const uri = `${vendorPortalApi.endpoint}/cluster`;
    const res = await http.post(uri, JSON.stringify(reqBody));
    if (res.message.statusCode != 201) {
      let body = "";
      try {
        body = await res.readBody();
      } catch (err) {
        // ignore
      }
      throw new Error(`Failed to queue cluster create: Server responded with ${res.message.statusCode}: ${body}`);
    }

    const body: any = JSON.parse(await res.readBody());
  
    return {name: body.cluster.name, id: body.cluster.id, status: body.cluster.status};
    
}

export async function pollForStatus(vendorPortalApi: VendorPortalApi, clusterId: string, expectedStatus: string, timeout: number = 120, sleeptimeMs: number = 5000): Promise<Cluster> {
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

        console.debug(`Cluster status is ${clusterDetails.status}, sleeping for ${sleeptimeMs/1000} seconds`);
      } catch (err) {
        if (err instanceof StatusError) {
          if (err.statusCode >= 500) {
            // 5xx errors are likely transient, so we should retry
            console.debug(`Got HTTP error with status ${err.statusCode}, sleeping for ${sleeptimeMs/1000} seconds`);
          } else {
            console.debug(`Got HTTP error with status ${err.statusCode}, exiting`);
            throw err;
          }
        } else {
          throw err;
        }
      }

      await new Promise(f => setTimeout(f, sleeptimeMs));
    }

    throw new Error(`Cluster did not reach state ${expectedStatus} within ${timeout} seconds`);
  }

async function getClusterDetails(vendorPortalApi: VendorPortalApi, clusterId: string): Promise<Cluster> {
    const http = await vendorPortalApi.client();

    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
      throw new StatusError(`Failed to get cluster: Server responded with ${res.message.statusCode}`, res.message.statusCode);
    }
  
    const body: any = JSON.parse(await res.readBody());
  
    return {name: body.cluster.name, id: body.cluster.id, status: body.cluster.status};
}

export async function getKubeconfig(vendorPortalApi: VendorPortalApi, clusterId: string): Promise<string> {
    const http = await vendorPortalApi.client();
  
    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}/kubeconfig`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
      throw new StatusError(`Failed to get kubeconfig: Server responded with ${res.message.statusCode}`, res.message.statusCode);
    }
  
    const body: any = JSON.parse(await res.readBody());
  
    return atob(body.kubeconfig);
}

export async function removeCluster(vendorPortalApi: VendorPortalApi, clusterId: string) {
    const http = await vendorPortalApi.client();

    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}`;
    const res = await http.del(uri);
    if (res.message.statusCode != 200) {
      throw new StatusError(`Failed to remove cluster: Server responded with ${res.message.statusCode}`, res.message.statusCode);
    }

}

export async function upgradeCluster(vendorPortalApi: VendorPortalApi, clusterId: string, k8sVersion: string): Promise<Cluster> {
  const http = await vendorPortalApi.client();

  const reqBody = {
    "kubernetes_version": k8sVersion,
  }

  const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}/upgrade`;
  const res = await http.post(uri, JSON.stringify(reqBody));
  if (res.message.statusCode != 200) {
    throw new StatusError(`Failed to upgrade cluster: Server responded with ${res.message.statusCode}`, res.message.statusCode);
  }

  return getClusterDetails(vendorPortalApi, clusterId);

}

export async function getClusterVersions(vendorPortalApi: VendorPortalApi): Promise<ClusterVersion[]> {
    const http = await vendorPortalApi.client();
    const uri = `${vendorPortalApi.endpoint}/cluster/versions`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
      throw new StatusError(`Failed to get cluster versions: Server responded with ${res.message.statusCode}`, res.message.statusCode);
    }
  
    const body: any = JSON.parse(await res.readBody());
  
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