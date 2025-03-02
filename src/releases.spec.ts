import { VendorPortalApi } from "./configuration";
import { ReleaseChart, exportedForTesting, KotsSingleSpec, createReleaseFromChart, Release, CompatibilityResult } from "./releases";
import * as mockttp from "mockttp";
import * as fs from "fs-extra";
import * as path from "path";
import { gzip } from "pako";

const areReleaseChartsPushed = exportedForTesting.areReleaseChartsPushed;
const getReleaseByAppId = exportedForTesting.getReleaseByAppId;
const isReleaseReadyForInstall = exportedForTesting.isReleaseReadyForInstall;
const promoteReleaseByAppId = exportedForTesting.promoteReleaseByAppId;
const reportCompatibilityResultByAppId = exportedForTesting.reportCompatibilityResultByAppId;
const readChart = exportedForTesting.readChart;

describe("Promote Release", () => {
  beforeAll(() => globalThis.provider.setup());
  afterEach(() => globalThis.provider.verify());
  afterAll(() => globalThis.provider.finalize());

  test("promote release", () => {
    globalThis.provider.addInteraction({
      state: "release promoted",
      uponReceiving: "a request for promoting a release",
      withRequest: {
        method: "POST",
        path: "/app/1234abcd/release/1/promote",
        body: {
          versionLabel: "v1.0.0",
          channelIds: ["channelid"],
          releaseNotesGzip: Buffer.from(gzip(JSON.stringify("release notes"))).toString("base64")
        }
      },
      willRespondWith: {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    });

    const apiClient = new VendorPortalApi();
    apiClient.apiToken = "abcd1234";
    apiClient.endpoint = globalThis.provider.mockService.baseUrl;

    return promoteReleaseByAppId(apiClient, "1234abcd", "channelid", 1, "v1.0.0", "release notes")
      .then(() => {
        expect(true).toEqual(true);
      })
      .catch(err => {
        fail(err);
      });
  });
});

describe("Report Results", () => {
  const mockServer = mockttp.getLocal();
  const apiClient = new VendorPortalApi();
  apiClient.apiToken = "abcd1234";
  apiClient.endpoint = "http://localhost:8282";
  // Start your mock server
  beforeEach(() => {
    mockServer.start(8282);
  });
  afterEach(() => mockServer.stop());

  test("report compatibility results", async () => {
    const c11yResult: CompatibilityResult = {
      distribution: "eks",
      version: "1.27",
      successAt: new Date(),
      successNotes: "working"
    };

    await mockServer.forPost("/app/1234abcd/release/1/compatibility").thenReply(201, JSON.stringify(c11yResult));
    return reportCompatibilityResultByAppId(apiClient, "1234abcd", 1, c11yResult)
      .then(() => {
        expect(true).toEqual(true);
      })
      .catch(err => {
        fail(err);
      });
  });
});

describe("Get Release", () => {
  const mockServer = mockttp.getLocal();
  const apiClient = new VendorPortalApi();
  apiClient.apiToken = "abcd1234";
  apiClient.endpoint = "http://localhost:8181";
  // Start your mock server
  beforeEach(() => {
    mockServer.start(8181);
  });
  afterEach(() => mockServer.stop());

  test("get release", async () => {
    const data = {
      release: {
        sequence: 1,
        charts: [
          {
            name: "my-chart",
            version: "1.0.0",
            status: "unknown"
          }
        ]
      }
    };

    await mockServer.forGet("/app/1234abcd/release/1").thenReply(200, JSON.stringify(data));

    return getReleaseByAppId(apiClient, "1234abcd", 1)
      .then(() => {
        expect(true).toEqual(true);
      })
      .catch(err => {
        fail(err);
      });
  });
});

// Test for areReleaseChartsPushed
describe("areReleaseChartsPushed", () => {
  it("returns true if all charts are pushed", () => {
    const charts: ReleaseChart[] = [
      { name: "chart1", version: "1.0.0", status: "pushed", error: null },
      { name: "chart2", version: "1.0.0", status: "pushed", error: null }
    ];

    const result = areReleaseChartsPushed(charts);
    expect(result).toBe(true);
  });

  it("throws an error if any chart has error status", () => {
    const charts: ReleaseChart[] = [
      { name: "chart1", version: "1.0.0", status: "pushed", error: null },
      { name: "chart2", version: "1.0.0", status: "error", error: "Some error message" }
    ];

    expect(() => {
      areReleaseChartsPushed(charts);
    }).toThrowError("chart chart2 failed to push: Some error message");
  });

  it("ignore charts with status different from known ones", () => {
    const charts: ReleaseChart[] = [
      { name: "chart1", version: "1.0.0", status: "pushed", error: null },
      { name: "chart2", version: "1.0.0", status: "invalidStatus", error: null }
    ];

    const result = areReleaseChartsPushed(charts);
    expect(result).toBe(true);
  });

  it("returns false if not all charts are pushed", () => {
    const charts: ReleaseChart[] = [
      { name: "chart1", version: "1.0.0", status: "pushed", error: null },
      { name: "chart2", version: "1.0.0", status: "unknown", error: null }
    ];

    const result = areReleaseChartsPushed(charts);
    expect(result).toBe(false);
  });
});

describe("isReleaseReadyForInstall", () => {
  const mockServer = mockttp.getLocal();
  const apiClient = new VendorPortalApi();
  apiClient.apiToken = "abcd1234";
  apiClient.endpoint = "http://localhost:8080";
  // Start your mock server
  beforeEach(() => {
    mockServer.start(8080);
  });
  afterEach(() => mockServer.stop());

  it("chart with status unknown", async () => {
    const data = {
      release: {
        sequence: 1,
        charts: [
          {
            name: "my-chart",
            version: "1.0.0",
            status: "unknown"
          }
        ]
      }
    };
    await mockServer.forGet("/app/1234abcd/release/1").thenReply(200, JSON.stringify(data));

    const ready: boolean = await isReleaseReadyForInstall(apiClient, "1234abcd", 1);
    expect(ready).toEqual(false);
  }, 60000);

  it("chart with status pushed", async () => {
    const data = {
      release: {
        sequence: 1,
        charts: [
          {
            name: "my-chart",
            version: "1.0.0",
            status: "pushed"
          }
        ]
      }
    };
    await mockServer.forGet("/app/1234abcd/release/1").thenReply(200, JSON.stringify(data));

    const ready: boolean = await isReleaseReadyForInstall(apiClient, "1234abcd", 1);
    expect(ready).toEqual(true);
  });
});

describe("readChart", () => {
  // Path to the temporary directory
  const tempDirPath = path.join(__dirname, "temp");
  const tempFileName = "helmchart.tgz";
  const tempFilePath = path.join(tempDirPath, tempFileName);

  beforeEach(async () => {
    // Create the temporary directory before each test
    await fs.ensureDir(tempDirPath);

    // Create a temporary file for each test

    await fs.writeFile(tempFilePath, "Invalid chart");
  });

  afterEach(async () => {
    // Remove the temporary directory after each test
    await fs.remove(tempDirPath);
  });

  it("chart is directory", async () => {
    await expect(readChart(tempDirPath)).rejects.toThrow(Error);
  });

  it("chart is valid", async () => {
    const kSingleSpec: KotsSingleSpec[] = await readChart(tempFilePath);
    expect(kSingleSpec.length).toEqual(1);
    expect(kSingleSpec[0].name).toEqual("helmchart.tgz");
    expect(kSingleSpec[0].path).toEqual("helmchart.tgz");
  });
});

describe("createReleaseFromChart", () => {
  const mockServer = mockttp.getLocal();
  const apiClient = new VendorPortalApi();
  apiClient.apiToken = "abcd1234";
  apiClient.endpoint = "http://localhost:8080";

  // Path to the temporary directory
  const tempDirPath = path.join(__dirname, "temp");
  const tempFileName = "helmchart.tgz";
  const tempFilePath = path.join(tempDirPath, tempFileName);

  beforeEach(async () => {
    mockServer.start(8080);
    // Create the temporary directory before each test
    await fs.ensureDir(tempDirPath);

    // Create a temporary file for each test

    await fs.writeFile(tempFilePath, "Invalid chart");
  });

  afterEach(async () => {
    mockServer.stop();
    // Remove the temporary directory after each test
    await fs.remove(tempDirPath);
  });

  it("create a new release with a helm chart", async () => {
    const expectedApplications = {
      apps: [
        { id: "1234abcd", name: "App 1", slug: "app-1" },
        { id: "5678efgh", name: "App 2", slug: "app-2" }
      ]
    };
    const releaseResponse = {
      release: {
        sequence: 1,
        charts: [
          {
            name: "helmchart",
            version: "1.0.0",
            status: "pushed"
          }
        ]
      }
    };
    await mockServer.forGet("/apps").thenReply(200, JSON.stringify(expectedApplications));
    await mockServer.forPost("/app/1234abcd/release").thenReply(201, JSON.stringify(releaseResponse));
    await mockServer.forGet("/app/1234abcd/release/1").thenReply(200, JSON.stringify(releaseResponse));

    const release: Release = await createReleaseFromChart(apiClient, "app-1", tempFilePath);
    expect(release.sequence).toBeGreaterThanOrEqual(0);
    expect(release.charts?.length).toEqual(1);
  });
});
