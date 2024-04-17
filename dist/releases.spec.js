"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const configuration_1 = require("./configuration");
const releases_1 = require("./releases");
const mockttp = require("mockttp");
const fs = require("fs-extra");
const path = require("path");
const areReleaseChartsPushed = releases_1.exportedForTesting.areReleaseChartsPushed;
const getReleaseByAppId = releases_1.exportedForTesting.getReleaseByAppId;
const isReleaseReadyForInstall = releases_1.exportedForTesting.isReleaseReadyForInstall;
const promoteReleaseByAppId = releases_1.exportedForTesting.promoteReleaseByAppId;
const reportCompatibilityResultByAppId = releases_1.exportedForTesting.reportCompatibilityResultByAppId;
const readChart = releases_1.exportedForTesting.readChart;
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
                path: '/app/1234abcd/release/1/promote'
            },
            willRespondWith: {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        });
        const apiClient = new configuration_1.VendorPortalApi();
        apiClient.apiToken = 'abcd1234';
        apiClient.endpoint = globalThis.provider.mockService.baseUrl;
        return promoteReleaseByAppId(apiClient, '1234abcd', 'channelid', 1, 'v1.0.0')
            .then(() => {
            expect(true).toEqual(true);
        })
            .catch((err) => {
            fail(err);
        });
    });
    test('report compatibility results', () => {
        globalThis.provider.addInteraction({
            state: 'release promoted',
            uponReceiving: 'a request for reporting compatibility result',
            withRequest: {
                method: 'POST',
                path: '/app/1234abcd/release/1/compatibility'
            },
            willRespondWith: {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            }
        });
        const apiClient = new configuration_1.VendorPortalApi();
        apiClient.apiToken = 'abcd1234';
        apiClient.endpoint = globalThis.provider.mockService.baseUrl;
        const c11yResult = {
            distribution: 'eks',
            version: '1.27',
            successAt: new Date(),
            successNotes: 'working'
        };
        return reportCompatibilityResultByAppId(apiClient, '1234abcd', 1, c11yResult)
            .then(() => {
            expect(true).toEqual(true);
        })
            .catch((err) => {
            fail(err);
        });
    });
    test('get release', () => {
        globalThis.provider.addInteraction({
            state: 'get promoted',
            uponReceiving: 'a request for get a release',
            withRequest: {
                method: 'GET',
                path: '/app/1234abcd/release/1'
            },
            willRespondWith: {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: {
                    release: {
                        sequence: 1,
                        charts: [
                            {
                                name: 'my-chart',
                                version: '1.0.0',
                                status: 'unknowm'
                            }
                        ]
                    }
                }
            }
        });
        const apiClient = new configuration_1.VendorPortalApi();
        apiClient.apiToken = 'abcd1234';
        apiClient.endpoint = globalThis.provider.mockService.baseUrl;
        return getReleaseByAppId(apiClient, '1234abcd', 1)
            .then(() => {
            expect(true).toEqual(true);
        })
            .catch((err) => {
            fail(err);
        });
    });
});
// Test for areReleaseChartsPushed
describe('areReleaseChartsPushed', () => {
    it('returns true if all charts are pushed', () => {
        const charts = [
            { name: 'chart1', version: '1.0.0', status: 'pushed', error: null },
            { name: 'chart2', version: '1.0.0', status: 'pushed', error: null }
        ];
        const result = areReleaseChartsPushed(charts);
        expect(result).toBe(true);
    });
    it('throws an error if any chart has error status', () => {
        const charts = [
            { name: 'chart1', version: '1.0.0', status: 'pushed', error: null },
            {
                name: 'chart2',
                version: '1.0.0',
                status: 'error',
                error: 'Some error message'
            }
        ];
        expect(() => {
            areReleaseChartsPushed(charts);
        }).toThrowError('chart chart2 failed to push: Some error message');
    });
    it('ignore charts with status different from known ones', () => {
        const charts = [
            { name: 'chart1', version: '1.0.0', status: 'pushed', error: null },
            { name: 'chart2', version: '1.0.0', status: 'invalidStatus', error: null }
        ];
        const result = areReleaseChartsPushed(charts);
        expect(result).toBe(true);
    });
    it('returns false if not all charts are pushed', () => {
        const charts = [
            { name: 'chart1', version: '1.0.0', status: 'pushed', error: null },
            { name: 'chart2', version: '1.0.0', status: 'unknown', error: null }
        ];
        const result = areReleaseChartsPushed(charts);
        expect(result).toBe(false);
    });
});
describe('isReleaseReadyForInstall', () => {
    const mockServer = mockttp.getLocal();
    const apiClient = new configuration_1.VendorPortalApi();
    apiClient.apiToken = 'abcd1234';
    apiClient.endpoint = 'http://localhost:8080';
    // Start your mock server
    beforeEach(() => {
        mockServer.start(8080);
    });
    afterEach(() => mockServer.stop());
    it('chart with status unknown', async () => {
        const data = {
            release: {
                sequence: 1,
                charts: [
                    {
                        name: 'my-chart',
                        version: '1.0.0',
                        status: 'unknown'
                    }
                ]
            }
        };
        await mockServer
            .forGet('/app/1234abcd/release/1')
            .thenReply(200, JSON.stringify(data));
        const ready = await isReleaseReadyForInstall(apiClient, '1234abcd', 1);
        expect(ready).toEqual(false);
    }, 60000);
    it('chart with status pushed', async () => {
        const data = {
            release: {
                sequence: 1,
                charts: [
                    {
                        name: 'my-chart',
                        version: '1.0.0',
                        status: 'pushed'
                    }
                ]
            }
        };
        await mockServer
            .forGet('/app/1234abcd/release/1')
            .thenReply(200, JSON.stringify(data));
        const ready = await isReleaseReadyForInstall(apiClient, '1234abcd', 1);
        expect(ready).toEqual(true);
    });
});
describe('readChart', () => {
    // Path to the temporary directory
    const tempDirPath = path.join(__dirname, 'temp');
    const tempFileName = 'helmchart.tgz';
    const tempFilePath = path.join(tempDirPath, tempFileName);
    beforeEach(async () => {
        // Create the temporary directory before each test
        await fs.ensureDir(tempDirPath);
        // Create a temporary file for each test
        await fs.writeFile(tempFilePath, 'Invalid chart');
    });
    afterEach(async () => {
        // Remove the temporary directory after each test
        await fs.remove(tempDirPath);
    });
    it('chart is directory', async () => {
        await expect(readChart(tempDirPath)).rejects.toThrow(Error);
    });
    it('chart is valid', async () => {
        const kSingleSpec = await readChart(tempFilePath);
        expect(kSingleSpec.length).toEqual(1);
        expect(kSingleSpec[0].name).toEqual('helmchart.tgz');
        expect(kSingleSpec[0].path).toEqual('helmchart.tgz');
    });
});
describe('createReleaseFromChart', () => {
    const mockServer = mockttp.getLocal();
    const apiClient = new configuration_1.VendorPortalApi();
    apiClient.apiToken = 'abcd1234';
    apiClient.endpoint = 'http://localhost:8080';
    // Path to the temporary directory
    const tempDirPath = path.join(__dirname, 'temp');
    const tempFileName = 'helmchart.tgz';
    const tempFilePath = path.join(tempDirPath, tempFileName);
    beforeEach(async () => {
        mockServer.start(8080);
        // Create the temporary directory before each test
        await fs.ensureDir(tempDirPath);
        // Create a temporary file for each test
        await fs.writeFile(tempFilePath, 'Invalid chart');
    });
    afterEach(async () => {
        mockServer.stop();
        // Remove the temporary directory after each test
        await fs.remove(tempDirPath);
    });
    it('create a new release with a helm chart', async () => {
        var _a;
        const expectedApplications = {
            apps: [
                { id: '1234abcd', name: 'App 1', slug: 'app-1' },
                { id: '5678efgh', name: 'App 2', slug: 'app-2' }
            ]
        };
        const releaseResponse = {
            release: {
                sequence: 1,
                charts: [
                    {
                        name: 'helmchart',
                        version: '1.0.0',
                        status: 'pushed'
                    }
                ]
            }
        };
        await mockServer
            .forGet('/apps')
            .thenReply(200, JSON.stringify(expectedApplications));
        await mockServer
            .forPost('/app/1234abcd/release')
            .thenReply(201, JSON.stringify(releaseResponse));
        await mockServer
            .forGet('/app/1234abcd/release/1')
            .thenReply(200, JSON.stringify(releaseResponse));
        const release = await (0, releases_1.createReleaseFromChart)(apiClient, 'app-1', tempFilePath);
        expect(release.sequence).toBeGreaterThanOrEqual(0);
        expect((_a = release.charts) === null || _a === void 0 ? void 0 : _a.length).toEqual(1);
    });
});
