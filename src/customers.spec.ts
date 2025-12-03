import { VendorPortalApi } from "./configuration";
import { Customer, CustomerSummary, archiveCustomer, createCustomer, listCustomersByName } from "./customers";
import * as mockttp from "mockttp";

describe("Archive Customer", () => {
  beforeAll(() => globalThis.provider.setup());
  afterEach(() => globalThis.provider.verify());
  afterAll(() => globalThis.provider.finalize());

  test("archive customer", () => {
    globalThis.provider.addInteraction({
      state: "customer archived",
      uponReceiving: "a request for archiving a customer",
      withRequest: {
        method: "POST",
        path: "/customer/1234abcd/archive"
      },
      willRespondWith: {
        status: 204,
        headers: { "Content-Type": "application/json" }
      }
    });

    const apiClient = new VendorPortalApi();
    apiClient.apiToken = "abcd1234";
    apiClient.endpoint = globalThis.provider.mockService.baseUrl;

    return archiveCustomer(apiClient, "1234abcd")
      .then(() => {
        expect(true).toEqual(true);
      })
      .catch(err => {
        fail(err);
      });
  });
});

describe("Create Customer", () => {
  let mockServer: mockttp.Mockttp;
  const apiClient = new VendorPortalApi();
  apiClient.apiToken = "abcd1234";

  beforeEach(async () => {
    mockServer = mockttp.getLocal();
    await mockServer.start();
    apiClient.endpoint = "http://localhost:" + mockServer.port;
  });

  afterEach(async () => {
    await mockServer.stop();
  });

  it("create a new customer for testing", async () => {
    const expectedApplications = {
      apps: [
        { id: "1234abcd", name: "App 1", slug: "app-1" },
        { id: "5678efgh", name: "App 2", slug: "app-2" }
      ]
    };
    const customerResponse = {
      customer: {
        id: "5678efgh",
        installationId: "1234abcd"
      }
    };
    await mockServer.forGet("/apps").once().thenReply(200, JSON.stringify(expectedApplications));
    await mockServer.forPost("/customer").once().thenReply(201, JSON.stringify(customerResponse));
    await mockServer.forGet("/app/1234abcd/customer/5678efgh/license-download").once().thenReply(403);

    const customer: Customer = await createCustomer(apiClient, "app-1", "testing", "testing@replicated.com", "test", "", 0);
    expect(customer.name).toEqual("testing");
    expect(customer.customerId).toEqual("5678efgh");
    expect(customer.licenseId).toEqual("1234abcd");
  });
});

describe("List Customers By Name", () => {
  let mockServer: mockttp.Mockttp;
  const apiClient = new VendorPortalApi();
  apiClient.apiToken = "abcd1234";

  beforeEach(async () => {
    mockServer = mockttp.getLocal();
    await mockServer.start();
    apiClient.endpoint = "http://localhost:" + mockServer.port;
  });

  afterEach(async () => {
    await mockServer.stop();
  });

  it("should return customers matching the name", async () => {
    const appId = "test-app-1";
    const appSlug = "test-app-1";
    const expectedApplications = {
      apps: [
        { id: appId, name: "Test App 1", slug: appSlug },
        { id: "5678efgh", name: "App 2", slug: "app-2" }
      ]
    };
    const customersResponse = {
      data: [
        { id: "customer-1", name: "Test Customer" },
        { id: "customer-2", name: "Test Customer Two" }
      ],
      total_count: 2
    };

    await mockServer.forGet("/apps").thenReply(200, JSON.stringify(expectedApplications));
    await mockServer.forPost("/customers/search").thenReply(200, JSON.stringify(customersResponse));

    const customers: CustomerSummary[] = await listCustomersByName(apiClient, appSlug, "Test Customer");
    expect(customers).toHaveLength(2);
    expect(customers[0].name).toEqual("Test Customer");
    expect(customers[0].customerId).toEqual("customer-1");
    expect(customers[1].name).toEqual("Test Customer Two");
    expect(customers[1].customerId).toEqual("customer-2");
  });

  it("should return empty array when no customers match", async () => {
    const appId = "1234abcd";
    const appSlug = "app-1";
    const expectedApplications = {
      apps: [{ id: appId, name: "App 1", slug: appSlug }]
    };
    const customersResponse = {
      data: [],
      total_count: 0
    };

    await mockServer.forGet("/apps").thenReply(200, JSON.stringify(expectedApplications));
    await mockServer.forPost("/customers/search").thenReply(200, JSON.stringify(customersResponse));

    const customers: CustomerSummary[] = await listCustomersByName(apiClient, appSlug, "NonExistent");
    expect(customers).toHaveLength(0);
  });

  it("should return empty array when data field is undefined", async () => {
    const appId = "test-app-2";
    const appSlug = "test-app-2";
    const expectedApplications = {
      apps: [{ id: appId, name: "Test App 2", slug: appSlug }]
    };
    const customersResponse = {
      data: undefined,
      total_count: 0
    };

    await mockServer.forGet("/apps").thenReply(200, JSON.stringify(expectedApplications));
    await mockServer.forPost("/customers/search").thenReply(200, JSON.stringify(customersResponse));

    const customers: CustomerSummary[] = await listCustomersByName(apiClient, appSlug, "Test");
    expect(customers).toHaveLength(0);
  });

  it("should properly handle customer name with special characters", async () => {
    const appId = "1234abcd";
    const appSlug = "app-1";
    const expectedApplications = {
      apps: [{ id: appId, name: "App 1", slug: appSlug }]
    };
    const customersResponse = {
      data: [{ id: "customer-1", name: "Customer & Co" }],
      total_count: 1
    };

    await mockServer.forGet("/apps").thenReply(200, JSON.stringify(expectedApplications));
    await mockServer.forPost("/customers/search").thenReply(200, JSON.stringify(customersResponse));

    const customers: CustomerSummary[] = await listCustomersByName(apiClient, appSlug, "Customer & Co");
    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual("Customer & Co");
    expect(customers[0].customerId).toEqual("customer-1");
  });

  it("should throw error when API returns non-200 status", async () => {
    const appId = "test-app-3";
    const appSlug = "test-app-3";
    const expectedApplications = {
      apps: [{ id: appId, name: "Test App 3", slug: appSlug }]
    };

    await mockServer.forGet("/apps").thenReply(200, JSON.stringify(expectedApplications));
    await mockServer.forPost("/customers/search").thenReply(500, JSON.stringify({ error: "Internal Server Error" }));

    await expect(listCustomersByName(apiClient, appSlug, "Test")).rejects.toThrow("Failed to list customers: Server responded with 500");
  });

  it("should handle pagination correctly", async () => {
    const appId = "test-app-1";
    const appSlug = "test-app-1";
    const expectedApplications = {
      apps: [
        { id: appId, name: "Test App 1", slug: appSlug },
        { id: "5678efgh", name: "App 2", slug: "app-2" }
      ]
    };
    // Simulate pagination with total_count > pageSize (100)
    // First page returns 100 items, second page returns 50 items
    const firstPageData = Array.from({ length: 100 }, (_, i) => ({
      id: `customer-${i + 1}`,
      name: "Test Customer"
    }));
    const firstPageResponse = {
      data: firstPageData,
      total_count: 150
    };
    const secondPageData = Array.from({ length: 50 }, (_, i) => ({
      id: `customer-${i + 101}`,
      name: "Test Customer"
    }));
    const secondPageResponse = {
      data: secondPageData,
      total_count: 150
    };

    await mockServer.forGet("/apps").thenReply(200, JSON.stringify(expectedApplications));
    await mockServer.forPost("/customers/search").thenReply(200, JSON.stringify(firstPageResponse));
    await mockServer.forPost("/customers/search").thenReply(200, JSON.stringify(secondPageResponse));

    const customers: CustomerSummary[] = await listCustomersByName(apiClient, appSlug, "Test Customer");
    expect(customers).toHaveLength(150);
    expect(customers[0].customerId).toEqual("customer-1");
    expect(customers[99].customerId).toEqual("customer-100");
    expect(customers[100].customerId).toEqual("customer-101");
    expect(customers[149].customerId).toEqual("customer-150");
  });

  it("should search across all apps when appSlug is undefined", async () => {
    const customersResponse = {
      data: [
        { id: "customer-1", name: "Test Customer", app_name: "App 1" },
        { id: "customer-2", name: "Test Customer Two", app_name: "App 2" },
        { id: "customer-3", name: "Test Customer Three", app_name: "App 3" }
      ],
      total_count: 3
    };

    // When appSlug is undefined, we should NOT call the /apps endpoint
    // Just set up the search endpoint response
    await mockServer.forPost("/customers/search").thenReply(200, JSON.stringify(customersResponse));

    const customers: CustomerSummary[] = await listCustomersByName(apiClient, undefined, "Test Customer");
    expect(customers).toHaveLength(3);
    expect(customers[0].name).toEqual("Test Customer");
    expect(customers[1].name).toEqual("Test Customer Two");
    expect(customers[2].name).toEqual("Test Customer Three");
  });

  it("should include app_id when appSlug is provided", async () => {
    const appId = "test-app-123";
    const appSlug = "test-app";
    const expectedApplications = {
      apps: [{ id: appId, name: "Test App", slug: appSlug }]
    };
    const customersResponse = {
      data: [{ id: "customer-1", name: "Test Customer" }],
      total_count: 1
    };

    // When appSlug is provided, we should call /apps first, then search
    await mockServer.forGet("/apps").thenReply(200, JSON.stringify(expectedApplications));
    await mockServer.forPost("/customers/search").thenReply(200, JSON.stringify(customersResponse));

    const customers: CustomerSummary[] = await listCustomersByName(apiClient, appSlug, "Test Customer");
    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual("Test Customer");
  });
});
