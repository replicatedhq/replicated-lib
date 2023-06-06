import { VendorPortalApi } from "./configuration";
import { archiveCustomer } from "./customers";



describe('CustomerService', () => {
  
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

        return  archiveCustomer(apiClient,"1234abcd").then(() => {
            expect(true).toEqual(true);
        }).catch((err) => {
            fail(err);
        });
    });

  });