import { Interaction } from "@pact-foundation/pact";
import { exportedForTesting, createChannel, pollForAirgapReleaseStatus, getDownloadUrlAirgapBuildRelease } from "./channels";
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
