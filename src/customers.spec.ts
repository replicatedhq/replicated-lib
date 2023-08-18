import { VendorPortalApi } from "./configuration";
import { Customer, archiveCustomer, createCustomer } from "./customers";
import * as mockttp from 'mockttp';

describe('Archive Customer', () => {

    beforeAll(() => globalThis.provider.setup());
    afterEach(() => globalThis.provider.verify());
    afterAll(() => globalThis.provider.finalize());

    test('archive customer', () => {
        globalThis.provider.addInteraction({
            state: 'customer archived',
            uponReceiving: 'a request for archiving a customer',
            withRequest: {
                method: 'POST',
                path: '/customer/1234abcd/archive'
            },
            willRespondWith: {
                status: 204,
                headers: { 'Content-Type': 'application/json' },
            }
        });

        const apiClient = new VendorPortalApi();
        apiClient.apiToken = "abcd1234";
        apiClient.endpoint = globalThis.provider.mockService.baseUrl;

        return archiveCustomer(apiClient, "1234abcd").then(() => {
            expect(true).toEqual(true);
        }).catch((err) => {
            fail(err);
        });
    });

});

describe('Create Customer', () => {
    const mockServer = mockttp.getLocal()
    const apiClient = new VendorPortalApi();
    apiClient.apiToken = "abcd1234";

    beforeEach(async () => {
        await mockServer.start();
        apiClient.endpoint = "http://localhost:" + mockServer.port;
    });

    afterEach(async () => {
        mockServer.stop();
    });

    it("create a new customer for testing", async () => {
        const expectedApplications = {'apps':[
          { id: "1234abcd", name: 'App 1', slug: 'app-1' },
          { id: "5678efgh", name: 'App 2', slug: 'app-2' }
        ]};
        const customerResponse =  {
            "customer": {
                "id": "5678efgh",
                "installationId": "1234abcd",
            }
        };
        await mockServer.forGet("/apps").thenReply(200, JSON.stringify(expectedApplications));
        await mockServer.forPost("/customer").thenReply(201, JSON.stringify(customerResponse));
        await mockServer.forGet("/app/1234abcd/customer/5678efgh/license-download").thenReply(403)
        
      
        const customer: Customer = await createCustomer(apiClient, "app-1", "testing", "testing@replicated.com", "test", "", 0);
        expect(customer.name).toEqual("testing");
        expect(customer.customerId).toEqual("5678efgh");
        expect(customer.licenseId).toEqual("1234abcd");

    });
});