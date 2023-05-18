"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pact_1 = require("@pact-foundation/pact");
const channels_1 = require("./channels");
const configuration_1 = require("./configuration");
const applications_spec_1 = require("./applications.spec");
describe('findChannelDetailsInOutput', () => {
    it('should find the channel id when it exists', async () => {
        const channels = [
            {
                "id": "channelid1",
                "appId": "appid1",
                "appSlug": "relmatrix",
                "appName": "relmatrix",
                "channelSlug": "stable",
                "name": "Stable",
                "releaseSequence": 1
            },
            {
                "id": "channelid2",
                "appId": "appid1",
                "appSlug": "relmatrix",
                "appName": "relmatrix",
                "channelSlug": "ci-reliability-matrix",
                "name": "ci-reliability-matrix",
                "releaseSequence": 2
            }
        ];
        const channelName = 'ci-reliability-matrix';
        const channel = await (0, channels_1.findChannelDetailsInOutput)(channels, channelName);
        expect(channel.id).toBe('channelid2');
    });
});
describe('ChannelsService', () => {
    const provider = new pact_1.Pact({
        consumer: 'channel_consumer',
        provider: 'channel_service',
    });
    beforeAll(() => provider.setup());
    afterEach(() => provider.verify());
    afterAll(() => provider.finalize());
    test('should return channel', () => {
        const expectedChannels = { 'channels': [
                { id: "1234abcd", name: 'Stable', slug: 'stable' },
                { id: "5678efgh", name: 'Beta', slug: 'beta' },
                { id: "9012ijkl", name: 'Unstable', slug: 'unstable' }
            ] };
        provider.addInteraction({
            state: 'app',
            uponReceiving: 'a request for apps',
            withRequest: {
                method: 'GET',
                path: '/apps'
            },
            willRespondWith: {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: applications_spec_1.expectedApplications
            }
        });
        provider.addInteraction({
            state: 'channel exist',
            uponReceiving: 'a request for channels',
            withRequest: {
                method: 'GET',
                path: '/app/1234abcd/channels',
                query: 'channelName=Stable&excludeDetail=true'
            },
            willRespondWith: {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: expectedChannels
            }
        });
        const apiClient = new configuration_1.VendorPortalApi();
        apiClient.apiToken = "abcd1234";
        apiClient.endpoint = provider.mockService.baseUrl;
        return (0, channels_1.getChannelDetails)(apiClient, "app-1", "Stable").then(channel => {
            expect(channel).toEqual(expectedChannels.channels[0]);
        });
    });
});
