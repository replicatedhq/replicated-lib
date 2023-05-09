import { getApplicationDetails } from './applications';
import { VendorPortalApi, client } from './configuration';

export class Channel {
    name: string;
    id: string;
    slug: string;
    releaseSequence: number;
  }

export async function getChannelDetails(vendorPortalApi: VendorPortalApi, appSlug: string, channelName: string): Promise<Channel> {
    const http = await client(vendorPortalApi);
  
    // 1. get the app id from the app slug
    const app = await getApplicationDetails(vendorPortalApi, appSlug);
  
    // 2. get the channel id from the channel name
    console.log('Getting channel id from channel name...');
    const listChannelsUri = `${vendorPortalApi.endpoint}/app/${app.id}/channels?channelName=${channelName}&excludeDetail=true}`;
    const listChannelsRes = await http.get(listChannelsUri);
    if (listChannelsRes.message.statusCode != 200) {
      throw new Error(`Failed to list channels: Server responded with ${listChannelsRes.message.statusCode}`);
    }
    const listChannelsBody: any = JSON.parse(await listChannelsRes.readBody());
  
    const channel = await findChannelDetailsInOutput(listChannelsBody.channels, channelName);
    console.log(`Found channel for channel name ${channelName}`);
  
    
    return channel;
}

export async function archiveChannel(vendorPortalApi: VendorPortalApi, appSlug: string, channelName: string) {
    const channel = await getChannelDetails(vendorPortalApi, appSlug, channelName)

    const http = await client(vendorPortalApi);

    // 1. get the app id from the app slug
    const app = await getApplicationDetails(vendorPortalApi, appSlug);
  
    // 2. Archive the channel
    console.log(`Archive Channel with id: ${channel.id} ...`);
    const archiveChannelUri = `${vendorPortalApi.endpoint}/app/${app.id}/channel/${channel.id}`;
    const archiveChannelRes = await http.del(archiveChannelUri);
    if (archiveChannelRes.message.statusCode != 200) {
      throw new Error(`Failed to archive channel: Server responded with ${archiveChannelRes.message.statusCode}`);
    }
    
}

export async function findChannelDetailsInOutput(channels: any[], channelName: string): Promise<Channel> {
  for (const channel of channels) {
      if (channel.name === channelName) {
          return {name: channelName, id: channel.id, slug: channel.channelSlug, releaseSequence: channel.releaseSequence};
      }
  }
  return Promise.reject(`Could not find channel with name ${channelName}`);
}