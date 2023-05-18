"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findChannelDetailsInOutput = exports.archiveChannel = exports.getChannelDetails = exports.createChannel = exports.Channel = void 0;
const applications_1 = require("./applications");
const configuration_1 = require("./configuration");
class Channel {
}
exports.Channel = Channel;
async function createChannel(vendorPortalApi, appSlug, channelName) {
    const http = await (0, configuration_1.client)(vendorPortalApi);
    // 1. get the app id from the app slug
    const app = await (0, applications_1.getApplicationDetails)(vendorPortalApi, appSlug);
    // 2. create the channel
    console.log(`Creating channel ${channelName}...`);
    const reqBody = {
        "name": channelName
    };
    const createChannelUri = `${vendorPortalApi.endpoint}/app/${app.id}/channel`;
    const createChannelRes = await http.post(createChannelUri, JSON.stringify(reqBody));
    if (createChannelRes.message.statusCode != 201) {
        throw new Error(`Failed to create channel: Server responded with ${createChannelRes.message.statusCode}`);
    }
    const createChannelBody = JSON.parse(await createChannelRes.readBody());
    console.log(`Created channel with id ${createChannelBody.channel.id}`);
    return { name: createChannelBody.channel.name, id: createChannelBody.channel.id, slug: createChannelBody.channel.channelSlug };
}
exports.createChannel = createChannel;
async function getChannelDetails(vendorPortalApi, appSlug, channelName) {
    const http = await (0, configuration_1.client)(vendorPortalApi);
    // 1. get the app id from the app slug
    const app = await (0, applications_1.getApplicationDetails)(vendorPortalApi, appSlug);
    // 2. get the channel id from the channel name
    console.log('Getting channel id from channel name...');
    const listChannelsUri = `${vendorPortalApi.endpoint}/app/${app.id}/channels?channelName=${channelName}&excludeDetail=true`;
    const listChannelsRes = await http.get(listChannelsUri);
    if (listChannelsRes.message.statusCode != 200) {
        throw new Error(`Failed to list channels: Server responded with ${listChannelsRes.message.statusCode}`);
    }
    const listChannelsBody = JSON.parse(await listChannelsRes.readBody());
    const channel = await findChannelDetailsInOutput(listChannelsBody.channels, channelName);
    console.log(`Found channel for channel name ${channelName}`);
    return channel;
}
exports.getChannelDetails = getChannelDetails;
async function archiveChannel(vendorPortalApi, appSlug, channelName) {
    const channel = await getChannelDetails(vendorPortalApi, appSlug, channelName);
    const http = await (0, configuration_1.client)(vendorPortalApi);
    // 1. get the app id from the app slug
    const app = await (0, applications_1.getApplicationDetails)(vendorPortalApi, appSlug);
    // 2. Archive the channel
    console.log(`Archive Channel with id: ${channel.id} ...`);
    const archiveChannelUri = `${vendorPortalApi.endpoint}/app/${app.id}/channel/${channel.id}`;
    const archiveChannelRes = await http.del(archiveChannelUri);
    if (archiveChannelRes.message.statusCode != 200) {
        throw new Error(`Failed to archive channel: Server responded with ${archiveChannelRes.message.statusCode}`);
    }
}
exports.archiveChannel = archiveChannel;
async function findChannelDetailsInOutput(channels, channelName) {
    for (const channel of channels) {
        if (channel.name === channelName) {
            return { name: channelName, id: channel.id, slug: channel.channelSlug, releaseSequence: channel.releaseSequence };
        }
    }
    return Promise.reject({ "channel": null, "reason": `Could not find channel with name ${channelName}` });
}
exports.findChannelDetailsInOutput = findChannelDetailsInOutput;
