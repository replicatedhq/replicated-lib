import { VendorPortalApi } from "./configuration";
import { ReleaseChart, areReleaseChartsPushed, getReleaseByAppId, promoteReleaseByAppId } from "./releases";



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

// Test for areReleaseChartsPushed
describe('areReleaseChartsPushed', () => {
    it('returns true if all charts are pushed', () => {
      const charts: ReleaseChart[] = [
        { name: 'chart1', version: '1.0.0', status: 'pushed', error: null },
        { name: 'chart2', version: '1.0.0', status: 'pushed', error: null },
      ];
  
      const result = areReleaseChartsPushed(charts);
      expect(result).toBe(true);
    });
  
    it('throws an error if any chart has error status', () => {
      const charts: ReleaseChart[] = [
        { name: 'chart1', version: '1.0.0', status: 'pushed', error: null },
        { name: 'chart2', version: '1.0.0', status: 'error', error: 'Some error message' },
      ];
  
      expect(() => {
        areReleaseChartsPushed(charts);
      }).toThrowError('chart chart2 failed to push: Some error message');
    });
  
    it('throws an error for unknown status', () => {
      const charts: ReleaseChart[] = [
        { name: 'chart1', version: '1.0.0', status: 'pushed', error: null },
        { name: 'chart2', version: '1.0.0', status: 'invalidStatus', error: null },
      ];
  
      expect(() => {
        areReleaseChartsPushed(charts);
      }).toThrowError('unknown release chart status invalidStatus');
    });
  
    it('returns false if not all charts are pushed', () => {
      const charts: ReleaseChart[] = [
        { name: 'chart1', version: '1.0.0', status: 'pushed', error: null },
        { name: 'chart2', version: '1.0.0', status: 'unknown', error: null },
      ];
  
      const result = areReleaseChartsPushed(charts);
      expect(result).toBe(false);
    });
  });
