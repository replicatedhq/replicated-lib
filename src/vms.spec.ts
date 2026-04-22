import { VendorPortalApi } from "./configuration";
import { createVM } from ".";
import { VM } from "./vms";
import * as mockttp from "mockttp";

describe("VMService", () => {
  beforeAll(() => globalThis.provider.setup());
  afterEach(() => globalThis.provider.verify());
  afterAll(() => globalThis.provider.finalize());

  test("should return vm", () => {
    const expectedVMs = {
      vms: [{ name: "vm1", id: "1234abcd", status: "provisioning" }]
    };
    const reqBody = {
      name: "vm1",
      distribution: "ubuntu",
      ttl: "10m"
    };
    globalThis.provider.addInteraction({
      state: "vm created",
      uponReceiving: "a request for creating a vm",
      withRequest: {
        method: "POST",
        path: "/vm",
        body: reqBody
      },
      willRespondWith: {
        status: 201,
        headers: { "Content-Type": "application/json" },
        body: expectedVMs
      }
    });

    const apiClient = new VendorPortalApi();
    apiClient.apiToken = "abcd1234";
    apiClient.endpoint = globalThis.provider.mockService.baseUrl;

    return createVM(apiClient, "vm1", "ubuntu", "10m").then(vms => {
      expect(vms).toHaveLength(1);
      expect(vms[0].name).toEqual(expectedVMs.vms[0].name);
      expect(vms[0].id).toEqual(expectedVMs.vms[0].id);
      expect(vms[0].status).toEqual(expectedVMs.vms[0].status);
    });
  });
});
