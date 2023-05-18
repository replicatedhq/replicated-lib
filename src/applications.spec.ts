import { getApplicationDetails } from './applications';
import { Interaction, InteractionObject, Pact } from '@pact-foundation/pact';
import { VendorPortalApi } from './configuration';

export const expectedApplications = {'apps':[
    { id: "1234abcd", name: 'App 1', slug: 'app-1' },
    { id: "5678efgh", name: 'App 2', slug: 'app-2' }
  ]};

const applicationInteraction: InteractionObject = {
    state: 'applications exist',
    uponReceiving: 'a request for applications',
    withRequest: {
        method: 'GET',
        path: '/apps'
    },
    willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: expectedApplications
    }
};


describe('ApplicationService', () => {
  beforeAll(() => globalThis.provider.setup());
  afterEach(() => globalThis.provider.verify());
  afterAll(() => globalThis.provider.finalize());

  test('should return application', () => {
    globalThis.provider.addInteraction(applicationInteraction);

    const apiClient = new VendorPortalApi();
    apiClient.apiToken = "abcd1234";
    apiClient.endpoint = globalThis.provider.mockService.baseUrl;

    return getApplicationDetails(apiClient,"app-1").then(application => {
      expect(application).toEqual(expectedApplications.apps[0]);
    });
  });
});