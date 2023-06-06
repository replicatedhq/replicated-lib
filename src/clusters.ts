import { VendorPortalApi, client } from "./configuration";

export class Cluster {
    name: string;
    id: string;
    status: string;
}

export class SupportedCluster {
  name: string;
  version: string;
}

export async function createCluster(vendorPortalApi: VendorPortalApi, clusterName: string, k8sDistribution: string, k8sVersion: string, clusterTTL: string): Promise<Cluster> {
    const http = await client(vendorPortalApi);

    const reqBody = {
        "name": clusterName,
        "kubernetes_distribution": k8sDistribution,
        "kubernetes_version": k8sVersion,
        "ttl": clusterTTL,
    }
    const uri = `${vendorPortalApi.endpoint}/cluster`;
    const res = await http.post(uri, JSON.stringify(reqBody));
    if (res.message.statusCode != 201) { 
       throw new Error(`Failed to queue cluster create: Server responded with ${res.message.statusCode}`);
    }

    const body: any = JSON.parse(await res.readBody());
  
    return {name: body.cluster.name, id: body.cluster.id, status: body.cluster.status};
    
}

export async function pollForStatus(vendorPortalApi: VendorPortalApi, clusterId: string, expectedStatus: string, timeout: number = 120): Promise<Cluster> {
    // get clusters from the api, look for the status of the id to be ${status}
    // if it's not ${status}, sleep for 5 seconds and try again
    // if it is ${status}, return the cluster with that status
  
    const sleeptime: number = 5;
    // iterate for timeout/sleeptime times
    for (let i = 0; i < timeout/sleeptime; i++) {
      const clusterDetails = await getClusterDetails(vendorPortalApi, clusterId);
      if (clusterDetails.status === expectedStatus) {
        return clusterDetails;
      }
  
      console.debug(`Cluster status is ${clusterDetails.status}, sleeping for ${sleeptime} seconds`);
      await new Promise(f => setTimeout(f, sleeptime*1000));
    }

    throw new Error(`Cluster did not reach state ${expectedStatus} within ${timeout} seconds`);
  }

export async function getClusterDetails(vendorPortalApi: VendorPortalApi, clusterId: string): Promise<Cluster> {
    const http = await client(vendorPortalApi);
  
    const uri = `${vendorPortalApi.endpoint}/clusters`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
      throw new Error(`Failed to get clusters: Server responded with ${res.message.statusCode}`);
    }
  
    const body: any = JSON.parse(await res.readBody());
    const cluster = body.clusters.find((c: any) => c.id === clusterId);
    if (!cluster) {
      throw new Error(`Failed to find cluster with id ${clusterId}`);
    }
  
    return {name: cluster.name, id: cluster.id, status: cluster.status};
}

export async function getKubeconfig(vendorPortalApi: VendorPortalApi, clusterId: string): Promise<string> {
    const http = await client(vendorPortalApi);
  
    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}/kubeconfig`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
      throw new Error(`Failed to get kubeconfig: Server responded with ${res.message.statusCode}`);
    }
  
    const body: any = JSON.parse(await res.readBody());
  
    return atob(body.kubeconfig);
}

export async function removeCluster(vendorPortalApi: VendorPortalApi, clusterId: string) {
    const http = await client(vendorPortalApi);

    const uri = `${vendorPortalApi.endpoint}/cluster/${clusterId}`;
    const res = await http.del(uri);
    if (res.message.statusCode != 200) {
      throw new Error(`Failed to remove cluster: Server responded with ${res.message.statusCode}`);
    }

}

export async function getSupportedClusters(vendorPortalApi: VendorPortalApi): Promise<SupportedCluster[]> {
    const http = await client(vendorPortalApi);
    const uri = `${vendorPortalApi.endpoint}/supported-clusters`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
      throw new Error(`Failed to get supported clusters: Server responded with ${res.message.statusCode}`);
    }
  
    const body: any = JSON.parse(await res.readBody());
  
    // 2. Convert body into SupportedCluster[]
    let supportedClusters = [];
    for (const cluster of body['supported-clusters']) {
      for (const version of cluster.versions) {
        supportedClusters.push({
          name: cluster.name,
          version: version
        });
      }
    }

    return supportedClusters;
}