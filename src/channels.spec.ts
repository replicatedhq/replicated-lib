import { Interaction } from "@pact-foundation/pact";
import { exportedForTesting } from "./channels";
import { VendorPortalApi } from "./configuration";

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
        releaseSequence: 1
      },
      {
        id: "channelid2",
        appId: "appid1",
        appSlug: "relmatrix",
        appName: "relmatrix",
        channelSlug: "ci-reliability-matrix",
        name: "ci-reliability-matrix",
        releaseSequence: 2
      }
    ];
    const channelSlug = "ci-reliability-matrix";
    const channel = await findChannelDetailsInOutput(channels, {
      slug: channelSlug
    });
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
        {
          id: "1234abcd",
          name: "Stable",
          channelSlug: "stable",
          releaseSequence: 1
        },
        {
          id: "5678efgh",
          name: "Beta",
          channelSlug: "beta",
          releaseSequence: 2
        }
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

    return getChannelByApplicationId(apiClient, "1234abcd", {
      slug: "stable"
    }).then(channel => {
      expect(channel.id).toEqual(expectedChannels.channels[0].id);
      expect(channel.name).toEqual(expectedChannels.channels[0].name);
      expect(channel.slug).toEqual(expectedChannels.channels[0].channelSlug);
      expect(channel.releaseSequence).toEqual(expectedChannels.channels[0].releaseSequence);
    });
  });
});
