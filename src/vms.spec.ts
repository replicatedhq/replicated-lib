import { VendorPortalApi } from "./configuration";
import { createVM, pollForVMStatus } from ".";
import { VM } from "./vms";
import { StatusError } from "./clusters";
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

describe("VMService use cases", () => {
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

  test("should return vm with tags", async () => {
    const expectedVMs = {
      vms: [{ name: "vm1", id: "1234abcd", status: "provisioning" }]
    };
    await mockServer.forPost("/vm").thenReply(201, JSON.stringify(expectedVMs));

    const tags = [{ key: "foo", value: "bar" }];

    const vms: VM[] = await createVM(apiClient, "vm1", "ubuntu", "10m", undefined, undefined, undefined, undefined, undefined, tags);
    expect(vms).toHaveLength(1);
    expect(vms[0].name).toEqual(expectedVMs.vms[0].name);
    expect(vms[0].id).toEqual(expectedVMs.vms[0].id);
    expect(vms[0].status).toEqual(expectedVMs.vms[0].status);
  });

  test("should return multiple vms when count > 1", async () => {
    const expectedVMs = {
      vms: [
        { name: "vm1", id: "aaaa1111", status: "provisioning" },
        { name: "vm1", id: "bbbb2222", status: "provisioning" },
        { name: "vm1", id: "cccc3333", status: "provisioning" }
      ]
    };
    await mockServer.forPost("/vm").thenReply(201, JSON.stringify(expectedVMs));

    const vms: VM[] = await createVM(apiClient, "vm1", "ubuntu", "10m", undefined, undefined, undefined, 3);
    expect(vms).toHaveLength(3);
    expect(vms[0].id).toEqual("aaaa1111");
    expect(vms[1].id).toEqual("bbbb2222");
    expect(vms[2].id).toEqual("cccc3333");
  });

  test("should return vm with public keys", async () => {
    const expectedVMs = {
      vms: [{ name: "vm1", id: "1234abcd", status: "provisioning" }]
    };
    await mockServer.forPost("/vm").thenReply(201, JSON.stringify(expectedVMs));

    const vms: VM[] = await createVM(apiClient, "vm1", "ubuntu", "10m", undefined, undefined, undefined, undefined, ["ssh-rsa AAAA..."]);
    expect(vms).toHaveLength(1);
    expect(vms[0].id).toEqual(expectedVMs.vms[0].id);
  });
});

describe("pollForVM", () => {
  const mockServer = mockttp.getLocal();
  const apiClient = new VendorPortalApi();
  apiClient.apiToken = "abcd1234";

  beforeEach(async () => {
    await mockServer.start();
    apiClient.endpoint = `http://localhost:${mockServer.port}`;
  });

  afterEach(async () => {
    await mockServer.stop();
  });

  test("should eventually return success with expected status", async () => {
    const expectedVM = { id: "1234abcd", name: "vm1", status: "running" };
    const responseVM = { id: "1234abcd", name: "vm1" };

    await mockServer
      .forGet(`/vm/${responseVM.id}`)
      .once()
      .thenReply(200, JSON.stringify({ vm: { ...responseVM, status: "pending" } }));
    await mockServer
      .forGet(`/vm/${responseVM.id}`)
      .once()
      .thenReply(200, JSON.stringify({ vm: { ...responseVM, status: "provisioning" } }));
    await mockServer.forGet(`/vm/${responseVM.id}`).once().thenReply(503);
    await mockServer.forGet(`/vm/${responseVM.id}`).thenReply(200, JSON.stringify({ vm: { ...responseVM, status: "running" } }));

    const vm: VM = await pollForVMStatus(apiClient, "1234abcd", "running", 1, 10);
    expect(vm).toEqual(expectedVM);
  });

  test("should still fail on 404", async () => {
    const responseVM = { id: "1234abcd", name: "vm1" };

    await mockServer
      .forGet(`/vm/${responseVM.id}`)
      .once()
      .thenReply(200, JSON.stringify({ vm: { ...responseVM, status: "pending" } }));
    await mockServer.forGet(`/vm/${responseVM.id}`).thenReply(404);

    await expect(pollForVMStatus(apiClient, "1234abcd", "running", 1, 10)).rejects.toThrow(StatusError);
  });
});
