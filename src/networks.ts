import { VendorPortalApi } from "./configuration";
import { StatusError } from "./clusters";

export class Network {
  id: string;
  name: string;
  status: string;
  policy?: string;
  collect_report?: boolean;
}

export interface UpdateNetworkOptions {
  policy?: string;
  collectReport?: boolean;
}

export async function updateNetwork(vendorPortalApi: VendorPortalApi, networkId: string, options: UpdateNetworkOptions): Promise<Network> {
  const http = await vendorPortalApi.client();

  const reqBody: any = {
    policy: options.policy ?? ""
  };
  if (options.collectReport !== undefined) {
    reqBody["collect_report"] = options.collectReport;
  }

  const uri = `${vendorPortalApi.endpoint}/network/${networkId}/update`;
  const res = await http.put(uri, JSON.stringify(reqBody));
  if (res.message.statusCode != 200) {
    let body = "";
    try {
      body = await res.readBody();
    } catch (err) {
      // ignore
    }
    throw new StatusError(`Failed to update network: Server responded with ${res.message.statusCode}: ${body}`, res.message.statusCode);
  }

  const body: any = JSON.parse(await res.readBody());

  return {
    id: body.network.id,
    name: body.network.name,
    status: body.network.status,
    policy: body.network.policy,
    collect_report: body.network.collect_report
  };
}
