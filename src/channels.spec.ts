import { Interaction } from "@pact-foundation/pact";
import { exportedForTesting, pollForAirgapReleaseStatus } from "./channels";
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

describe("pollForAirgapReleaseStatus", () => {
  const mockServer = mockttp.getLocal();
  const apiClient = new VendorPortalApi();
  apiClient.apiToken = "abcd1234";
  apiClient.endpoint = "http://localhost:8080";
  // Start your mock server
  beforeEach(() => {
    mockServer.start(8080);
  });
  afterEach(() => mockServer.stop());

  it("poll for airgapped release status", async () => {
    const data = {
      releases: [
        {
          sequence: 0,
          airgapBuildStatus: "built"
        }
      ]
    };
    await mockServer.forGet("/app/1234abcd/channel/1/releases").thenReply(200, JSON.stringify(data));

    const result = await pollForAirgapReleaseStatus(apiClient, "1234abcd", "1", 0, "built");
    expect(result).toEqual("built");
  });
});
