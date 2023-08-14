"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findChannelDetailsInOutput = exports.archiveChannel = exports.getChannelByApplicationId = exports.getChannelDetails = exports.createChannel = exports.Channel = void 0;
const applications_1 = require("./applications");
class Channel {
}
exports.Channel = Channel;
async function createChannel(vendorPortalApi, appSlug, channelName) {
    const http = await vendorPortalApi.client();
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
async function getChannelDetails(vendorPortalApi, appSlug, { slug, name }) {
    const http = await vendorPortalApi.client();
    // 1. get the app id from the app slug
    const app = await (0, applications_1.getApplicationDetails)(vendorPortalApi, appSlug);
    if (typeof slug === 'undefined' && typeof name === 'undefined') {
        throw new Error(`Must provide either a channel slug or channel name`);
    }
    // 2. get the channel id from the channel slug
    return await getChannelByApplicationId(vendorPortalApi, app.id, { slug, name });
}
exports.getChannelDetails = getChannelDetails;
async function getChannelByApplicationId(vendorPortalApi, appid, { slug, name }) {
    const http = await vendorPortalApi.client();
    console.log(`Getting channel id from channel slug ${slug} or name ${name}...`);
    const listChannelsUri = `${vendorPortalApi.endpoint}/app/${appid}/channels?excludeDetail=true`;
    const listChannelsRes = await http.get(listChannelsUri);
    if (listChannelsRes.message.statusCode != 200) {
        throw new Error(`Failed to list channels: Server responded with ${listChannelsRes.message.statusCode}`);
    }
    const listChannelsBody = JSON.parse(await listChannelsRes.readBody());
    const channel = await findChannelDetailsInOutput(listChannelsBody.channels, { slug, name });
    console.log(`Found channel for channel slug ${channel.slug}`);
    return channel;
}
exports.getChannelByApplicationId = getChannelByApplicationId;
async function archiveChannel(vendorPortalApi, appSlug, channelSlug) {
    const channel = await getChannelDetails(vendorPortalApi, appSlug, { slug: channelSlug });
    const http = await vendorPortalApi.client();
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
async function findChannelDetailsInOutput(channels, { slug, name }) {
    for (const channel of channels) {
        if (slug && channel.channelSlug == slug) {
            return { name: channel.name, id: channel.id, slug: channel.channelSlug, releaseSequence: channel.releaseSequence };
        }
        if (name && channel.name == name) {
            return { name: channel.name, id: channel.id, slug: channel.channelSlug, releaseSequence: channel.releaseSequence };
        }
    }
    return Promise.reject({ "channel": null, "reason": `Could not find channel with slug ${slug} or name ${name}` });
}
exports.findChannelDetailsInOutput = findChannelDetailsInOutput;
