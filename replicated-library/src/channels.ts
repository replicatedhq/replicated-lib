import * as core from '@actions/core';
import * as httpClient from '@actions/http-client';

export class Channel {
    name: string;
    id: string;
    slug: string;
    releaseSequence: number;
  }

export async function getChannelDetails(appSlug: string, channelName: string): Promise<Channel> {
    const http = new httpClient.HttpClient()
    const replicatedEndpoint= 'https://api.replicated.com/vendor/v3';
    http.requestOptions = {
      headers: {
        "Authorization": core.getInput('replicated-api-token'),
      }
    }
  
    // 1. get the app id from the app slug
    core.info('Getting app id from app slug...');
    const listAppsUri = `${replicatedEndpoint}/apps`;
    const listAppsRes = await http.get(listAppsUri);
    if (listAppsRes.message.statusCode != 200) {
      throw new Error(`Failed to list apps: Server responded with ${listAppsRes.message.statusCode}`);
    }
    const listAppsBody: any = JSON.parse(await listAppsRes.readBody());
    const appId = listAppsBody.apps.find((app: any) => app.slug === appSlug).id;
    core.info(`Found app id ${appId} for app slug ${appSlug}`);
  
    // 2. get the channel id from the channel name
    core.info('Getting channel id from channel name...');
    const listChannelsUri = `${replicatedEndpoint}/app/${appId}/channels?channelName=${channelName}&excludeDetail=true}`;
    const listChannelsRes = await http.get(listChannelsUri);
    if (listChannelsRes.message.statusCode != 200) {
      throw new Error(`Failed to list channels: Server responded with ${listChannelsRes.message.statusCode}`);
    }
    const listChannelsBody: any = JSON.parse(await listChannelsRes.readBody());
  
    const channel = await findChannelDetailsInOutput(listChannelsBody.channels, channelName);
    core.info(`Found channel for channel name ${channelName}`);
  
    
    return channel;
}

  export async function archiveChannel(appSlug: string, channelName: string) {
    const channel = await getChannelDetails(appSlug, channelName)

    const http = new httpClient.HttpClient()
    const replicatedEndpoint= 'https://api.replicated.com/vendor/v3';
    http.requestOptions = {
      headers: {
        "Authorization": core.getInput('replicated-api-token'),
      }
    }

    // 1. get the app id from the app slug
    core.info('Getting app id from app slug...');
    const listAppsUri = `${replicatedEndpoint}/apps`;
    const listAppsRes = await http.get(listAppsUri);
    if (listAppsRes.message.statusCode != 200) {
      throw new Error(`Failed to list apps: Server responded with ${listAppsRes.message.statusCode}`);
    }
    const listAppsBody: any = JSON.parse(await listAppsRes.readBody());
    const appId = listAppsBody.apps.find((app: any) => app.slug === appSlug).id;
    core.info(`Found app id ${appId} for app slug ${appSlug}`);
  
    // 2. Archive the channel
    core.info('Archive Channel...');
    const archiveChannelUri = `${replicatedEndpoint}/app/${appId}/channel/${channel.id}`;
    const archiveChannelRes = await http.del(archiveChannelUri);
    if (archiveChannelRes.message.statusCode != 200) {
      throw new Error(`Failed to archive channels: Server responded with ${archiveChannelRes.message.statusCode}`);
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