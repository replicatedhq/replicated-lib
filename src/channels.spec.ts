import { Interaction } from "@pact-foundation/pact";
import { exportedForTesting, createChannel, pollForAirgapReleaseStatus, getDownloadUrlAirgapBuildRelease, getAirgapBuildStatus, getLatestAirgapStatusForRelease, getAirgapBundleDownloadURL } from "./channels";
import { VendorPortalApi } from "./configuration";
import * as mockttp from "mockttp";

const getChannelByApplicationId = exportedForTesting.getChannelByApplicationId;
const findChannelDetailsInOutput = exportedForTesting.findChannelDetailsInOutput;

describe("findChannelDetailsInOutput", () => {
  it("should find the channel id when it exists", async () => {
    const channels = [
      {
        id: "channelid1",
        appId: "appid1",
        appSlug: "relmatrix",
        appName: "relmatrix",
        channelSlug: "stable",
        name: "Stable",
        releaseSequence: 1,
        buildAirgapAutomatically: true
      },
      {
        id: "channelid2",
        appId: "appid1",
        appSlug: "relmatrix",
        appName: "relmatrix",
        channelSlug: "ci-reliability-matrix",
        name: "ci-reliability-matrix",
        releaseSequence: 2,
        buildAirgapAutomatically: false
      }
    ];
    const channelSlug = "ci-reliability-matrix";
    const channel = await findChannelDetailsInOutput(channels, { slug: channelSlug });
    expect(channel.id).toBe("channelid2");
  });
});

describe("ChannelsService", () => {
  beforeAll(() => globalThis.provider.setup());
  afterEach(() => globalThis.provider.verify());
  afterAll(() => globalThis.provider.finalize());

  test("should return channel", () => {
    const expectedChannels = {
      channels: [
        { id: "1234abcd", name: "Stable", channelSlug: "stable", releaseSequence: 1, buildAirgapAutomatically: true },
        { id: "5678efgh", name: "Beta", channelSlug: "beta", releaseSequence: 2, buildAirgapAutomatically: false }
      ]
    };

    const channelsInteraction = new Interaction()
      .given("I have a list of channels")
      .uponReceiving("a request for all channels with the builder pattern")
      .withRequest({
        method: "GET",
        path: "/app/1234abcd/channels",
        query: { excludeDetail: "true" },
        headers: {
          Accept: "application/json"
        }
      })
      .willRespondWith({
        status: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: expectedChannels
      });

    globalThis.provider.addInteraction(channelsInteraction);

    const apiClient = new VendorPortalApi();
    apiClient.apiToken = "abcd1234";
    apiClient.endpoint = globalThis.provider.mockService.baseUrl;

    return getChannelByApplicationId(apiClient, "1234abcd", { slug: "stable" }).then(channel => {
      expect(channel.id).toEqual(expectedChannels.channels[0].id);
      expect(channel.name).toEqual(expectedChannels.channels[0].name);
      expect(channel.slug).toEqual(expectedChannels.channels[0].channelSlug);
      expect(channel.releaseSequence).toEqual(expectedChannels.channels[0].releaseSequence);
    });
  });
});

describe("createChannel", () => {
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

  it("should create a channel without buildAirgapAutomatically", async () => {
    const appData = {
      apps: [
        {
          id: "appid1",
          slug: "my-app",
          name: "My App"
        }
      ]
    };
    const channelData = {
      channel: {
        id: "channelid1",
        name: "Stable",
        channelSlug: "stable",
        buildAirgapAutomatically: false
      }
    };

    await mockServer.forGet("/apps").once().thenReply(200, JSON.stringify(appData));
    await mockServer.forPost("/app/appid1/channel").withJsonBodyIncluding({ name: "Stable" }).once().thenReply(201, JSON.stringify(channelData));

    const channel = await createChannel(apiClient, "my-app", "Stable");
    expect(channel.id).toEqual("channelid1");
    expect(channel.name).toEqual("Stable");
    expect(channel.slug).toEqual("stable");
    expect(channel.buildAirgapAutomatically).toEqual(false);
  });

  it("should create a channel with buildAirgapAutomatically set to true", async () => {
    const appData = {
      apps: [
        {
          id: "appid1",
          slug: "my-app",
          name: "My App"
        }
      ]
    };
    const channelData = {
      channel: {
        id: "channelid2",
        name: "Beta",
        channelSlug: "beta",
        buildAirgapAutomatically: true
      }
    };

    await mockServer.forGet("/apps").once().thenReply(200, JSON.stringify(appData));
    await mockServer.forPost("/app/appid1/channel").withJsonBodyIncluding({ name: "Beta", buildAirgapAutomatically: true }).once().thenReply(201, JSON.stringify(channelData));

    const channel = await createChannel(apiClient, "my-app", "Beta", true);
    expect(channel.id).toEqual("channelid2");
    expect(channel.name).toEqual("Beta");
    expect(channel.slug).toEqual("beta");
    expect(channel.buildAirgapAutomatically).toEqual(true);
  });
});

describe("pollForAirgapReleaseStatus", () => {
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

  it("should poll for airgapped release status until it reaches the expected status", async () => {
    const releaseData = {
      releases: [
        {
          sequence: 0,
          channelSequence: 1,
          airgapBuildStatus: "built"
        }
      ]
    };

    await mockServer.forGet("/app/1234abcd/channel/1/releases").once().thenReply(200, JSON.stringify(releaseData));

    const releaseResult = await pollForAirgapReleaseStatus(apiClient, "1234abcd", "1", 0, "built");
    expect(releaseResult).toEqual("built");
  });
});

describe("getDownloadUrlAirgapBuildRelease", () => {
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

  it("should get the download URL for an airgap build release", async () => {
    const releaseData = {
      releases: [
        {
          sequence: 0,
          channelSequence: 1,
          airgapBuildStatus: "built"
        }
      ]
    };
    const downloadUrlData = {
      url: "https://s3.amazonaws.com/airgap.replicated.com/xxxxxxxxx/7.airgap?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=xxxxxx%2F20250317%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date="
    };

    await mockServer.forGet("/app/1234abcd/channel/1/releases").once().thenReply(200, JSON.stringify(releaseData));
    await mockServer.forGet("/app/1234abcd/channel/1/airgap/download-url").withQuery({ channelSequence: 1 }).once().thenReply(200, JSON.stringify(downloadUrlData));

    const downloadUrlResult = await getDownloadUrlAirgapBuildRelease(apiClient, "1234abcd", "1", 0);
    expect(downloadUrlResult).toEqual("https://s3.amazonaws.com/airgap.replicated.com/xxxxxxxxx/7.airgap?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=xxxxxx%2F20250317%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=");
  });
});

describe("getAirgapBuildStatus", () => {
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

  it("returns the airgap build status for a known channel-release", async () => {
    const statusBody = {
      channelId: "1234abcd",
      channelSequence: 7,
      channelName: "Stable",
      airgapBuildStatus: "built",
      airgapBuildError: "",
      fullAirgapBuild: true
    };
    await mockServer.forGet("/app/app1/channel/1234abcd/release/7/airgap/status").once().thenReply(200, JSON.stringify(statusBody));

    const result = await getAirgapBuildStatus(apiClient, "app1", "1234abcd", 7);
    expect(result).not.toBeNull();
    expect(result!.airgapBuildStatus).toBe("built");
    expect(result!.fullAirgapBuild).toBe(true);
    expect(result!.channelName).toBe("Stable");
  });

  it("returns the synthesized pending status when the worker has not started yet", async () => {
    const statusBody = {
      channelId: "1234abcd",
      channelSequence: 7,
      channelName: "Stable",
      airgapBuildStatus: "pending",
      airgapBuildError: ""
    };
    await mockServer.forGet("/app/app1/channel/1234abcd/release/7/airgap/status").once().thenReply(200, JSON.stringify(statusBody));

    const result = await getAirgapBuildStatus(apiClient, "app1", "1234abcd", 7);
    expect(result!.airgapBuildStatus).toBe("pending");
  });

  it("returns null on 404", async () => {
    await mockServer.forGet("/app/app1/channel/1234abcd/release/7/airgap/status").once().thenReply(404, "");

    const result = await getAirgapBuildStatus(apiClient, "app1", "1234abcd", 7);
    expect(result).toBeNull();
  });

  it("throws on non-200 / non-404 responses", async () => {
    await mockServer.forGet("/app/app1/channel/1234abcd/release/7/airgap/status").once().thenReply(500, "");

    await expect(getAirgapBuildStatus(apiClient, "app1", "1234abcd", 7)).rejects.toThrow(/500/);
  });
});

describe("getLatestAirgapStatusForRelease", () => {
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

  it("picks the most recent channelSequence when a release was promoted multiple times", async () => {
    // Same release (sequence 5) was promoted twice, producing two channel-releases.
    // The second promote (channelSequence 12) is the one the caller is waiting on.
    const releaseData = {
      releases: [
        { sequence: 5, channelSequence: 9, channelName: "Stable", airgapBuildStatus: "failed", airgapBuildError: "old failure" },
        { sequence: 5, channelSequence: 12, channelName: "Stable", airgapBuildStatus: "building", airgapBuildError: "" },
        { sequence: 6, channelSequence: 13, channelName: "Stable", airgapBuildStatus: "pending", airgapBuildError: "" }
      ]
    };
    await mockServer.forGet("/app/app1/channel/1234abcd/releases").once().thenReply(200, JSON.stringify(releaseData));

    const result = await getLatestAirgapStatusForRelease(apiClient, "app1", "1234abcd", 5);
    expect(result).not.toBeNull();
    expect(result!.channelSequence).toBe(12);
    expect(result!.airgapBuildStatus).toBe("building");
  });

  it("returns null when the release sequence has no channel-releases", async () => {
    const releaseData = {
      releases: [{ sequence: 5, channelSequence: 9, airgapBuildStatus: "built" }]
    };
    await mockServer.forGet("/app/app1/channel/1234abcd/releases").once().thenReply(200, JSON.stringify(releaseData));

    const result = await getLatestAirgapStatusForRelease(apiClient, "app1", "1234abcd", 99);
    expect(result).toBeNull();
  });

  it("returns null when the response has no releases array", async () => {
    await mockServer.forGet("/app/app1/channel/1234abcd/releases").once().thenReply(200, JSON.stringify({}));

    const result = await getLatestAirgapStatusForRelease(apiClient, "app1", "1234abcd", 5);
    expect(result).toBeNull();
  });
});

describe("getAirgapBundleDownloadURL", () => {
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

  it("fetches the download URL for a known channelSequence without scraping /releases", async () => {
    const downloadUrlData = { url: "https://s3.amazonaws.com/airgap.replicated.com/xxx/7.airgap?sig=abc" };
    await mockServer.forGet("/app/app1/channel/1234abcd/airgap/download-url").withQuery({ channelSequence: 7 }).once().thenReply(200, JSON.stringify(downloadUrlData));

    const url = await getAirgapBundleDownloadURL(apiClient, "app1", "1234abcd", 7);
    expect(url).toBe("https://s3.amazonaws.com/airgap.replicated.com/xxx/7.airgap?sig=abc");
  });

  it("throws on non-200 responses", async () => {
    await mockServer.forGet("/app/app1/channel/1234abcd/airgap/download-url").withQuery({ channelSequence: 7 }).once().thenReply(500, "");

    await expect(getAirgapBundleDownloadURL(apiClient, "app1", "1234abcd", 7)).rejects.toThrow(/500/);
  });
});
