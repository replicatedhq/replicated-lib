import { VendorPortalApi } from "./configuration";
import { createVM, getVMDetails, pollForVMStatus, removeVM, exposeVMPort } from ".";
import { VM, VMPort } from "./vms";
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

describe("getVMDetails", () => {
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

  test("should return vm with ssh endpoint and port", async () => {
    const vmId = "1234abcd";
    const vmData = {
      vm: {
        id: vmId,
        name: "vm1",
        status: "running",
        direct_ssh_endpoint: "192.168.1.100",
        direct_ssh_port: 2222
      }
    };
    await mockServer.forGet(`/vm/${vmId}`).thenReply(200, JSON.stringify(vmData));

    const vm: VM = await getVMDetails(apiClient, vmId);
    expect(vm.id).toEqual(vmId);
    expect(vm.name).toEqual("vm1");
    expect(vm.status).toEqual("running");
    expect(vm.sshEndpoint).toEqual("192.168.1.100");
    expect(vm.sshPort).toEqual(2222);
  });

  test("should throw StatusError on non-200", async () => {
    const vmId = "9999zzzz";
    await mockServer.forGet(`/vm/${vmId}`).thenReply(404);

    await expect(getVMDetails(apiClient, vmId)).rejects.toThrow(StatusError);
  });
});

describe("removeVM", () => {
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

  test("should resolve on successful delete", async () => {
    const vmId = "1234abcd";
    await mockServer.forDelete(`/vm/${vmId}`).thenReply(200, "{}");

    await expect(removeVM(apiClient, vmId)).resolves.toBeUndefined();
  });

  test("should throw StatusError on non-200", async () => {
    const vmId = "9999zzzz";
    await mockServer.forDelete(`/vm/${vmId}`).thenReply(404);

    await expect(removeVM(apiClient, vmId)).rejects.toThrow(StatusError);
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

describe("VM Exposed Ports", () => {
  const mockServer = mockttp.getLocal();
  const apiClient = new VendorPortalApi();
  apiClient.apiToken = "abcd1234";

  beforeAll(async () => {
    await mockServer.start(8283);
    apiClient.endpoint = `http://localhost:${mockServer.port}`;
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  test("should return exposed port", async () => {
    const vmId = "1234abcd";
    const expectedExposedPort = {
      port: {
        vm_id: vmId,
        addon_id: "abcd1234",
        upstream_port: 8080,
        hostname: "http://my-vm.ingress.replicatedvm.com/",
        exposed_ports: [{ exposed_port: 8080, protocol: "http" }],
        port_name: "port-8080",
        state: "ready"
      }
    };

    await mockServer.forPost(`/vm/${vmId}/port`).thenReply(201, JSON.stringify(expectedExposedPort));

    const vmPort: VMPort = await exposeVMPort(apiClient, vmId, 8080, ["http"]);
    expect(vmPort).toEqual(expectedExposedPort.port);
  });

  test("should return exposed port with isWildcard", async () => {
    const vmId = "1234abcd";
    const expectedExposedPort = {
      port: {
        vm_id: vmId,
        addon_id: "abcd1234",
        upstream_port: 80,
        hostname: "http://my-vm.ingress.replicatedvm.com/",
        exposed_ports: [{ exposed_port: 80, protocol: "http" }],
        port_name: "port-80",
        state: "ready"
      }
    };

    await mockServer
      .forPost(`/vm/${vmId}/port`)
      .withJsonBodyIncluding({ port: 80, protocols: ["http"], is_wildcard: true })
      .thenReply(201, JSON.stringify(expectedExposedPort));

    const vmPort: VMPort = await exposeVMPort(apiClient, vmId, 80, ["http"], true);
    expect(vmPort).toEqual(expectedExposedPort.port);
  });
});
