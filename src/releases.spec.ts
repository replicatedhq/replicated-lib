import { VendorPortalApi } from "./configuration";
import { getReleaseByAppId, promoteReleaseByAppId } from "./releases";



describe('ReleasesService', () => {

    beforeAll(() => globalThis.provider.setup());
    afterEach(() => globalThis.provider.verify());
    afterAll(() => globalThis.provider.finalize());

    test('promote release', () => {
        globalThis.provider.addInteraction({
            state: 'release promoted',
            uponReceiving: 'a request for promoting a release',
            withRequest: {
                method: 'POST',
                path: '/app/1234abcd/release/1/promote',
            },
            willRespondWith: {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        });

        const apiClient = new VendorPortalApi();
        apiClient.apiToken = "abcd1234";
        apiClient.endpoint = globalThis.provider.mockService.baseUrl;

        return promoteReleaseByAppId(apiClient, "1234abcd", "channelid", 1, "v1.0.0").then(() => {
            expect(true).toEqual(true);
        }).catch((err) => {
            fail(err);
        });
    });

    test('get release', () => {
        globalThis.provider.addInteraction({
            state: 'get promoted',
            uponReceiving: 'a request for get a release',
            withRequest: {
                method: 'GET',
                path: '/app/1234abcd/release/1',
            },
            willRespondWith: {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: {
                    "release": {
                        "sequence": 1,
                        "charts": [
                            {
                                "name": "my-chart",
                                "version": "1.0.0",
                                "status": "unknowm",
                            }]
                        }
                    },
            }
        });

        const apiClient = new VendorPortalApi();
        apiClient.apiToken = "abcd1234";
        apiClient.endpoint = globalThis.provider.mockService.baseUrl;

        return getReleaseByAppId(apiClient, "1234abcd", 1).then(() => {
            expect(true).toEqual(true);
        }).catch((err) => {
            fail(err);
        });
    });

});