"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const configuration_1 = require("./configuration");
const releases_1 = require("./releases");
const mockttp = require("mockttp");
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
        const apiClient = new configuration_1.VendorPortalApi();
        apiClient.apiToken = "abcd1234";
        apiClient.endpoint = globalThis.provider.mockService.baseUrl;
        return (0, releases_1.promoteReleaseByAppId)(apiClient, "1234abcd", "channelid", 1, "v1.0.0").then(() => {
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
                            }
                        ]
                    }
                },
            }
        });
        const apiClient = new configuration_1.VendorPortalApi();
        apiClient.apiToken = "abcd1234";
        apiClient.endpoint = globalThis.provider.mockService.baseUrl;
        return (0, releases_1.getReleaseByAppId)(apiClient, "1234abcd", 1).then(() => {
            expect(true).toEqual(true);
        }).catch((err) => {
            fail(err);
        });
    });
});
// Test for areReleaseChartsPushed
describe('areReleaseChartsPushed', () => {
    it('returns true if all charts are pushed', () => {
        const charts = [
            { name: 'chart1', version: '1.0.0', status: 'pushed', error: null },
            { name: 'chart2', version: '1.0.0', status: 'pushed', error: null },
        ];
        const result = (0, releases_1.areReleaseChartsPushed)(charts);
        expect(result).toBe(true);
    });
    it('throws an error if any chart has error status', () => {
        const charts = [
            { name: 'chart1', version: '1.0.0', status: 'pushed', error: null },
            { name: 'chart2', version: '1.0.0', status: 'error', error: 'Some error message' },
        ];
        expect(() => {
            (0, releases_1.areReleaseChartsPushed)(charts);
        }).toThrowError('chart chart2 failed to push: Some error message');
    });
    it('throws an error for unknown status', () => {
        const charts = [
            { name: 'chart1', version: '1.0.0', status: 'pushed', error: null },
            { name: 'chart2', version: '1.0.0', status: 'invalidStatus', error: null },
        ];
        expect(() => {
            (0, releases_1.areReleaseChartsPushed)(charts);
        }).toThrowError('unknown release chart status invalidStatus');
    });
    it('returns false if not all charts are pushed', () => {
        const charts = [
            { name: 'chart1', version: '1.0.0', status: 'pushed', error: null },
            { name: 'chart2', version: '1.0.0', status: 'unknown', error: null },
        ];
        const result = (0, releases_1.areReleaseChartsPushed)(charts);
        expect(result).toBe(false);
    });
});
describe('isReleaseReadyForInstall', () => {
    const mockServer = mockttp.getLocal();
    const apiClient = new configuration_1.VendorPortalApi();
    apiClient.apiToken = "abcd1234";
    apiClient.endpoint = "http://localhost:8080";
    // Start your mock server
    beforeEach(() => {
        mockServer.start(8080);
    });
    afterEach(() => mockServer.stop());
    it("chart with status unknown", async () => {
        const data = {
            "release": {
                "sequence": 1,
                "charts": [
                    {
                        "name": "my-chart",
                        "version": "1.0.0",
                        "status": "unknown",
                    }
                ]
            }
        };
        await mockServer.forGet("/app/1234abcd/release/1").thenReply(200, JSON.stringify(data));
        const ready = await (0, releases_1.isReleaseReadyForInstall)(apiClient, "1234abcd", 1);
        expect(ready).toEqual(false);
    }, 60000);
    it("chart with status pushed", async () => {
        const data = {
            "release": {
                "sequence": 1,
                "charts": [
                    {
                        "name": "my-chart",
                        "version": "1.0.0",
                        "status": "pushed",
                    }
                ]
            }
        };
        await mockServer.forGet("/app/1234abcd/release/1").thenReply(200, JSON.stringify(data));
        const ready = await (0, releases_1.isReleaseReadyForInstall)(apiClient, "1234abcd", 1);
        expect(ready).toEqual(true);
    });
});
