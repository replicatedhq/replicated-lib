import { VendorPortalApi } from "./configuration";
import { StatusError } from "./clusters";

export class VM {
  name: string;
  id: string;
  status: string;
  network_id?: string;
}

interface tag {
  key: string;
  value: string;
}

export async function createVM(vendorPortalApi: VendorPortalApi, name: string, distribution: string, vmTTL: string, version?: string, diskGib?: number, instanceType?: string, count?: number, publicKeys?: string[], tags?: tag[]): Promise<VM[]> {
  const http = await vendorPortalApi.client();

  const reqBody: any = {
    name: name,
    distribution: distribution,
    ttl: vmTTL
  };
  if (version) {
    reqBody["version"] = version;
  }
  if (diskGib) {
    reqBody["disk_gib"] = diskGib;
  }
  if (instanceType) {
    reqBody["instance_type"] = instanceType;
  }
  if (count) {
    reqBody["count"] = count;
  }
  if (publicKeys && publicKeys.length > 0) {
    reqBody["public_keys"] = publicKeys;
  }
  if (tags) {
    reqBody["tags"] = tags;
  }

  const uri = `${vendorPortalApi.endpoint}/vm`;
  const res = await http.post(uri, JSON.stringify(reqBody));
  if (res.message.statusCode != 201) {
    let body = "";
    try {
      body = await res.readBody();
    } catch (err) {
      // ignore
    }
    throw new Error(`Failed to queue vm create: Server responded with ${res.message.statusCode}: ${body}`);
  }

  const body: any = JSON.parse(await res.readBody());

  const vmsArray: any[] = Array.isArray(body.vms) ? body.vms : body.vm ? [body.vm] : [];
  return vmsArray.map(v => ({
    name: v.name,
    id: v.id,
    status: v.status,
    network_id: v.network_id
  }));
}

async function getVMDetails(vendorPortalApi: VendorPortalApi, vmId: string): Promise<VM> {
  const http = await vendorPortalApi.client();

  const uri = `${vendorPortalApi.endpoint}/vm/${vmId}`;
  const res = await http.get(uri);
  if (res.message.statusCode != 200) {
    await res.readBody();
    throw new StatusError(`Failed to get vm: Server responded with ${res.message.statusCode}`, res.message.statusCode);
  }

  const body: any = JSON.parse(await res.readBody());

  return {
    name: body.vm.name,
    id: body.vm.id,
    status: body.vm.status,
    network_id: body.vm.network_id
  };
}

export async function pollForVMStatus(vendorPortalApi: VendorPortalApi, vmId: string, expectedStatus: string, timeout: number = 120, sleeptimeMs: number = 5000): Promise<VM> {
  await new Promise(f => setTimeout(f, sleeptimeMs));
  const iterations = (timeout * 1000) / sleeptimeMs;
  for (let i = 0; i < iterations; i++) {
    try {
      const vmDetails = await getVMDetails(vendorPortalApi, vmId);
      if (vmDetails.status === expectedStatus) {
        return vmDetails;
      }

      if (vmDetails.status === "error") {
        throw new Error(`VM has entered error state`);
      }

      console.debug(`VM status is ${vmDetails.status}, sleeping for ${sleeptimeMs / 1000} seconds`);
    } catch (err) {
      if (err instanceof StatusError) {
        if (err.statusCode >= 500) {
          console.debug(`Got HTTP error with status ${err.statusCode}, sleeping for ${sleeptimeMs / 1000} seconds`);
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

  throw new Error(`VM did not reach state ${expectedStatus} within ${timeout} seconds`);
}

export async function removeVM(vendorPortalApi: VendorPortalApi, vmId: string) {
  const http = await vendorPortalApi.client();

  const uri = `${vendorPortalApi.endpoint}/vm/${vmId}`;
  const res = await http.del(uri);
  await res.readBody();
  if (res.message.statusCode != 200) {
    throw new StatusError(`Failed to remove vm: Server responded with ${res.message.statusCode}`, res.message.statusCode);
  }
}
