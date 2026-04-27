import { VendorPortalApi } from "./configuration";
import { updateNetwork } from ".";
import { Network } from "./networks";
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
