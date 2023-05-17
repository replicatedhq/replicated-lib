"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const channels_1 = require("./channels");
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
