import { VendorPortalApi } from "./configuration";
import { StatusError } from "./clusters";

export class VM {
  name: string;
  id: string;
  status: string;
}

interface tag {
  key: string;
  value: string;
}

export async function createVM(
  vendorPortalApi: VendorPortalApi,
  name: string,
  distribution: string,
  vmTTL: string,
  version?: string,
  diskGib?: number,
  instanceType?: string,
  count?: number,
  publicKeys?: string[],
  tags?: tag[]
): Promise<VM[]> {
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
    status: v.status
  }));
}
