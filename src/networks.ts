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

export class NetworkEventData {
  timestamp?: string;
  srcIp?: string;
  dstIp?: string;
  srcPort?: number;
  dstPort?: number;
  sourcePod?: string;
  dstPod?: string;
  proto?: string;
  comm?: string;
  pid?: number;
  likelyService?: string;
  dnsQueryName?: string;
}

export class NetworkReport {
  events: NetworkEventData[];
}

export class NetworkReportSummarySource {
  id: string;
  ip?: string;
  service?: string;
  command?: string;
  pod?: string;
}

export class NetworkReportSummaryDestination {
  id: string;
  ip?: string;
  protocol?: string;
  port?: number;
  count?: number;
  sources?: NetworkReportSummarySource[];
}

export class NetworkReportSummaryDomain {
  id: string;
  domain: string;
  count: number;
}

export class NetworkReportSummary {
  id: string;
  network_id: string;
  total_events: number;
  time_range_start: string;
  time_range_end: string;
  created_at: string;
  domains?: NetworkReportSummaryDomain[];
  destinations?: NetworkReportSummaryDestination[];
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

export async function getNetworkReport(vendorPortalApi: VendorPortalApi, networkId: string, after?: Date): Promise<NetworkReport> {
  const http = await vendorPortalApi.client();

  let uri = `${vendorPortalApi.endpoint}/network/${networkId}/report`;
  if (after) {
    uri = `${uri}?after=${encodeURIComponent(after.toISOString())}`;
  }

  const res = await http.get(uri);
  if (res.message.statusCode != 200) {
    await res.readBody();
    throw new StatusError(`Failed to get network report: Server responded with ${res.message.statusCode}`, res.message.statusCode);
  }

  const body: any = JSON.parse(await res.readBody());

  return {
    events: Array.isArray(body.events) ? body.events : []
  };
}

export async function getNetworkReportSummary(vendorPortalApi: VendorPortalApi, networkId: string): Promise<NetworkReportSummary> {
  const http = await vendorPortalApi.client();

  const uri = `${vendorPortalApi.endpoint}/network/${networkId}/report/summary`;
  const res = await http.get(uri);
  if (res.message.statusCode != 200) {
    await res.readBody();
    throw new StatusError(`Failed to get network report summary: Server responded with ${res.message.statusCode}`, res.message.statusCode);
  }

  const body: any = JSON.parse(await res.readBody());
  if (body.error) {
    throw new Error(`Failed to get network report summary: ${body.error}`);
  }

  return {
    id: body.id,
    network_id: body.network_id,
    total_events: body.total_events,
    time_range_start: body.time_range_start,
    time_range_end: body.time_range_end,
    created_at: body.created_at,
    domains: body.domains,
    destinations: body.destinations
  };
}
