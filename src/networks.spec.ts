import { VendorPortalApi } from "./configuration";
import { updateNetwork, getNetworkReport, getNetworkReportSummary } from ".";
import { Network, NetworkReport, NetworkReportSummary } from "./networks";
import { StatusError } from "./clusters";
import * as mockttp from "mockttp";

describe("updateNetwork", () => {
  const mockServer = mockttp.getLocal();
  const apiClient = new VendorPortalApi();
  apiClient.apiToken = "abcd1234";

  beforeAll(async () => {
    await mockServer.start();
    apiClient.endpoint = `http://localhost:${mockServer.port}`;
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  test("should update policy", async () => {
    const networkId = "net-1234";
    const expected = {
      network: { id: networkId, name: "net1", status: "running", policy: "airgap", collect_report: false }
    };
    const endpoint = await mockServer.forPut(`/network/${networkId}/update`).thenReply(200, JSON.stringify(expected));

    const network: Network = await updateNetwork(apiClient, networkId, { policy: "airgap" });
    expect(network.id).toEqual(networkId);
    expect(network.policy).toEqual("airgap");
    expect(network.collect_report).toEqual(false);

    const requests = await endpoint.getSeenRequests();
    expect(requests).toHaveLength(1);
    expect(await requests[0].body.getJson()).toEqual({ policy: "airgap" });
  });

  test("should enable collect-report", async () => {
    const networkId = "net-5678";
    const expected = {
      network: { id: networkId, name: "net1", status: "running", policy: "open", collect_report: true }
    };
    const endpoint = await mockServer.forPut(`/network/${networkId}/update`).thenReply(200, JSON.stringify(expected));

    const network: Network = await updateNetwork(apiClient, networkId, { collectReport: true });
    expect(network.collect_report).toEqual(true);

    const requests = await endpoint.getSeenRequests();
    expect(requests).toHaveLength(1);
    expect(await requests[0].body.getJson()).toEqual({ policy: "", collect_report: true });
  });

  test("should send both policy and collect-report when provided", async () => {
    const networkId = "net-9999";
    const expected = {
      network: { id: networkId, name: "net1", status: "running", policy: "airgap", collect_report: true }
    };
    const endpoint = await mockServer.forPut(`/network/${networkId}/update`).thenReply(200, JSON.stringify(expected));

    await updateNetwork(apiClient, networkId, { policy: "airgap", collectReport: true });

    const requests = await endpoint.getSeenRequests();
    expect(requests).toHaveLength(1);
    expect(await requests[0].body.getJson()).toEqual({ policy: "airgap", collect_report: true });
  });

  test("should throw StatusError on non-200", async () => {
    const networkId = "net-bad";
    await mockServer.forPut(`/network/${networkId}/update`).thenReply(404, JSON.stringify({ error: { message: "not found" } }));

    await expect(updateNetwork(apiClient, networkId, { policy: "airgap" })).rejects.toThrow(StatusError);
  });
});

describe("getNetworkReport", () => {
  const mockServer = mockttp.getLocal();
  const apiClient = new VendorPortalApi();
  apiClient.apiToken = "abcd1234";

  beforeAll(async () => {
    await mockServer.start();
    apiClient.endpoint = `http://localhost:${mockServer.port}`;
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  test("should return events", async () => {
    const networkId = "net-1234";
    const expected = {
      events: [
        { timestamp: "2026-04-27T10:00:00Z", srcIp: "10.0.0.1", dstIp: "1.2.3.4", dstPort: 443, proto: "tcp" },
        { timestamp: "2026-04-27T10:00:01Z", srcIp: "10.0.0.1", dstIp: "5.6.7.8", dstPort: 80, proto: "tcp" }
      ]
    };
    await mockServer.forGet(`/network/${networkId}/report`).thenReply(200, JSON.stringify(expected));

    const report: NetworkReport = await getNetworkReport(apiClient, networkId);
    expect(report.events).toHaveLength(2);
    expect(report.events[0].srcIp).toEqual("10.0.0.1");
    expect(report.events[1].dstPort).toEqual(80);
  });

  test("should send after as RFC3339 query param", async () => {
    const networkId = "net-after";
    await mockServer.forGet(`/network/${networkId}/report`).thenReply(200, JSON.stringify({ events: [] }));

    const after = new Date("2026-04-27T10:00:00.000Z");
    await getNetworkReport(apiClient, networkId, after);

    const requests = await mockServer
      .getMockedEndpoints()
      .then(eps => Promise.all(eps.map(ep => ep.getSeenRequests())))
      .then(rs => rs.flat());
    const matching = requests.filter(r => r.url.includes(`/network/${networkId}/report`));
    expect(matching.length).toBeGreaterThan(0);
    expect(matching[0].url).toContain(`after=${encodeURIComponent("2026-04-27T10:00:00.000Z")}`);
  });

  test("should default events to empty array when missing", async () => {
    const networkId = "net-empty";
    await mockServer.forGet(`/network/${networkId}/report`).thenReply(200, JSON.stringify({}));

    const report: NetworkReport = await getNetworkReport(apiClient, networkId);
    expect(report.events).toEqual([]);
  });

  test("should throw StatusError on non-200", async () => {
    const networkId = "net-bad";
    await mockServer.forGet(`/network/${networkId}/report`).thenReply(404);

    await expect(getNetworkReport(apiClient, networkId)).rejects.toThrow(StatusError);
  });
});

describe("getNetworkReportSummary", () => {
  const mockServer = mockttp.getLocal();
  const apiClient = new VendorPortalApi();
  apiClient.apiToken = "abcd1234";

  beforeAll(async () => {
    await mockServer.start();
    apiClient.endpoint = `http://localhost:${mockServer.port}`;
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  test("should return summary", async () => {
    const networkId = "net-1234";
    const expected = {
      id: "summary-1",
      network_id: networkId,
      total_events: 42,
      time_range_start: "2026-04-27T09:00:00Z",
      time_range_end: "2026-04-27T11:00:00Z",
      created_at: "2026-04-27T11:01:00Z",
      domains: [{ id: "d1", domain: "example.com", count: 10 }],
      destinations: [
        {
          id: "dst1",
          ip: "1.2.3.4",
          protocol: "tcp",
          port: 443,
          count: 5,
          sources: [{ id: "s1", ip: "10.0.0.1", pod: "app-1" }]
        }
      ]
    };
    await mockServer.forGet(`/network/${networkId}/report/summary`).thenReply(200, JSON.stringify(expected));

    const summary: NetworkReportSummary = await getNetworkReportSummary(apiClient, networkId);
    expect(summary.id).toEqual("summary-1");
    expect(summary.network_id).toEqual(networkId);
    expect(summary.total_events).toEqual(42);
    expect(summary.domains).toHaveLength(1);
    expect(summary.domains?.[0].domain).toEqual("example.com");
    expect(summary.destinations?.[0].sources?.[0].pod).toEqual("app-1");
  });

  test("should throw on api error in body", async () => {
    const networkId = "net-err";
    await mockServer.forGet(`/network/${networkId}/report/summary`).thenReply(200, JSON.stringify({ error: "no summary" }));

    await expect(getNetworkReportSummary(apiClient, networkId)).rejects.toThrow("no summary");
  });

  test("should throw StatusError on non-200", async () => {
    const networkId = "net-404";
    await mockServer.forGet(`/network/${networkId}/report/summary`).thenReply(404);

    await expect(getNetworkReportSummary(apiClient, networkId)).rejects.toThrow(StatusError);
  });
});
