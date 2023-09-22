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

export async function createCluster(vendorPortalApi: VendorPortalApi, clusterName: string, k8sDistribution: string, k8sVersion: string, clusterTTL: string, diskGib?: number, nodeCount?: number, instanceType?: string): Promise<Cluster> {
    const http = await vendorPortalApi.client();

    const reqBody = {
        "name": clusterName,
        "kubernetes_distribution": k8sDistribution,
        "kubernetes_version": k8sVersion,
        "ttl": clusterTTL,
        "disk_gib": diskGib,
        "node_count": nodeCount,
        "instance_type": instanceType
    }

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

export async function pollForStatus(vendorPortalApi: VendorPortalApi, clusterId: string, expectedStatus: string, timeout: number = 120): Promise<Cluster> {
    // get clusters from the api, look for the status of the id to be ${status}
    // if it's not ${status}, sleep for 5 seconds and try again
    // if it is ${status}, return the cluster with that status
  
    const sleeptime: number = 5;
    await new Promise(f => setTimeout(f, sleeptime*1000)); // sleep for 5 seconds before polling as the cluster takes a few seconds to start provisioning
    // iterate for timeout/sleeptime times
    for (let i = 0; i < timeout/sleeptime; i++) {
      const clusterDetails = await getClusterDetails(vendorPortalApi, clusterId);
      if (clusterDetails.status === expectedStatus) {
        return clusterDetails;
      }

      // Once state is "error", it will never change. So we can shortcut polling.
      if (clusterDetails.status === "error") {
        throw new Error(`Cluster has entered error state.`);
      }

      console.debug(`Cluster status is ${clusterDetails.status}, sleeping for ${sleeptime} seconds`);
      await new Promise(f => setTimeout(f, sleeptime*1000));
    }

    throw new Error(`Cluster did not reach state ${expectedStatus} within ${timeout} seconds`);
  }

async function getClusterDetails(vendorPortalApi: VendorPortalApi, clusterId: string): Promise<Cluster> {
    const http = await vendorPortalApi.client();

    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
      throw new Error(`Failed to get cluster: Server responded with ${res.message.statusCode}`);
    }
  
    const body: any = JSON.parse(await res.readBody());
  
    return {name: body.cluster.name, id: body.cluster.id, status: body.cluster.status};
}

export async function getKubeconfig(vendorPortalApi: VendorPortalApi, clusterId: string): Promise<string> {
    const http = await vendorPortalApi.client();
  
    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}/kubeconfig`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
      throw new Error(`Failed to get kubeconfig: Server responded with ${res.message.statusCode}`);
    }
  
    const body: any = JSON.parse(await res.readBody());
  
    return atob(body.kubeconfig);
}

export async function removeCluster(vendorPortalApi: VendorPortalApi, clusterId: string) {
    const http = await vendorPortalApi.client();

    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}`;
    const res = await http.del(uri);
    if (res.message.statusCode != 200) {
      throw new Error(`Failed to remove cluster: Server responded with ${res.message.statusCode}`);
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
    throw new Error(`Failed to upgrade cluster: Server responded with ${res.message.statusCode}`);
  }

  return getClusterDetails(vendorPortalApi, clusterId);

}

export async function getClusterVersions(vendorPortalApi: VendorPortalApi): Promise<ClusterVersion[]> {
    const http = await vendorPortalApi.client();
    const uri = `${vendorPortalApi.endpoint}/cluster/versions`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
      throw new Error(`Failed to get cluster versions: Server responded with ${res.message.statusCode}`);
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