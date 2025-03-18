import { getApplicationDetails } from "./applications";
import { VendorPortalApi } from "./configuration";
import { Release } from "./releases";

export class Channel {
  name: string;
  id: string;
  slug: string;
  releaseSequence?: number;
  buildAirgapAutomatically?: boolean;
}

export class StatusError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const exportedForTesting = {
  getChannelByApplicationId,
  findChannelDetailsInOutput
};

export async function createChannel(vendorPortalApi: VendorPortalApi, appSlug: string, channelName: string): Promise<Channel> {
  const http = await vendorPortalApi.client();

  // 1. get the app id from the app slug
  const app = await getApplicationDetails(vendorPortalApi, appSlug);

  // 2. create the channel
  console.log(`Creating channel ${channelName}...`);
  const reqBody = {
    name: channelName
  };
  const createChannelUri = `${vendorPortalApi.endpoint}/app/${app.id}/channel`;
  const createChannelRes = await http.post(createChannelUri, JSON.stringify(reqBody));
  if (createChannelRes.message.statusCode != 201) {
    // discard the response body
    await createChannelRes.readBody();
    throw new Error(`Failed to create channel: Server responded with ${createChannelRes.message.statusCode}`);
  }
  const createChannelBody: any = JSON.parse(await createChannelRes.readBody());

  console.log(`Created channel with id ${createChannelBody.channel.id}`);
  return { name: createChannelBody.channel.name, id: createChannelBody.channel.id, slug: createChannelBody.channel.channelSlug };
}

interface ChannelIdentifier {
  slug?: string;
  name?: string;
}

export async function getChannelDetails(vendorPortalApi: VendorPortalApi, appSlug: string, { slug, name }: ChannelIdentifier): Promise<Channel> {
  const http = await vendorPortalApi.client();

  // 1. get the app id from the app slug
  const app = await getApplicationDetails(vendorPortalApi, appSlug);

  if (typeof slug === "undefined" && typeof name === "undefined") {
    throw new Error(`Must provide either a channel slug or channel name`);
  }

  // 2. get the channel id from the channel slug
  return await getChannelByApplicationId(vendorPortalApi, app.id, { slug, name });
}

async function getChannelByApplicationId(vendorPortalApi: VendorPortalApi, appid: string, { slug, name }: ChannelIdentifier): Promise<Channel> {
  const http = await vendorPortalApi.client();
  console.log(`Getting channel id from channel slug ${slug} or name ${name}...`);
  const listChannelsUri = `${vendorPortalApi.endpoint}/app/${appid}/channels?excludeDetail=true`;
  const listChannelsRes = await http.get(listChannelsUri);
  if (listChannelsRes.message.statusCode != 200) {
    // discard the response body
    await listChannelsRes.readBody();
    throw new Error(`Failed to list channels: Server responded with ${listChannelsRes.message.statusCode}`);
  }
  const listChannelsBody: any = JSON.parse(await listChannelsRes.readBody());

  const channel = await findChannelDetailsInOutput(listChannelsBody.channels, { slug, name });
  console.log(`Found channel for channel slug ${channel.slug}`);

  return channel;
}

export async function archiveChannel(vendorPortalApi: VendorPortalApi, appSlug: string, channelSlug: string) {
  const channel = await getChannelDetails(vendorPortalApi, appSlug, { slug: channelSlug });

  const http = await vendorPortalApi.client();

  // 1. get the app id from the app slug
  const app = await getApplicationDetails(vendorPortalApi, appSlug);

  // 2. Archive the channel
  console.log(`Archive Channel with id: ${channel.id} ...`);
  const archiveChannelUri = `${vendorPortalApi.endpoint}/app/${app.id}/channel/${channel.id}`;
  const archiveChannelRes = await http.del(archiveChannelUri);
  if (archiveChannelRes.message.statusCode != 200) {
    // discard the response body
    await archiveChannelRes.readBody();
    throw new Error(`Failed to archive channel: Server responded with ${archiveChannelRes.message.statusCode}`);
  }
  // discard the response body
  await archiveChannelRes.readBody();
}

async function findChannelDetailsInOutput(channels: any[], { slug, name }: ChannelIdentifier): Promise<Channel> {
  for (const channel of channels) {
    if (slug && channel.channelSlug == slug) {
      return { name: channel.name, id: channel.id, slug: channel.channelSlug, releaseSequence: channel.releaseSequence, buildAirgapAutomatically: channel.buildAirgapAutomatically };
    }
    if (name && channel.name == name) {
      return { name: channel.name, id: channel.id, slug: channel.channelSlug, releaseSequence: channel.releaseSequence, buildAirgapAutomatically: channel.buildAirgapAutomatically };
    }
  }
  return Promise.reject({ channel: null, reason: `Could not find channel with slug ${slug} or name ${name}` });
}

export async function pollForAirgapReleaseStatus(vendorPortalApi: VendorPortalApi, appId: string, channelId: string, releaseSequence: number, expectedStatus: string, timeout: number = 120, sleeptimeMs: number = 5000): Promise<string> {
  // get airgapped build release from the api, look for the status of the id to be ${status}
  // if it's not ${status}, sleep for 5 seconds and try again
  // if it is ${status}, return the release with that status
  // iterate for timeout/sleeptime times
  const iterations = (timeout * 1000) / sleeptimeMs;
  for (let i = 0; i < iterations; i++) {
    try {
      const release = await getAirgapBuildRelease(vendorPortalApi, appId, channelId, releaseSequence);
      if (release.airgapBuildStatus === expectedStatus) {
        return release.airgapBuildStatus;
      }
      if (release.airgapBuildStatus === "failed") {
        console.debug(`Airgapped build release ${releaseSequence} failed`);
        return "failed";
      }
      console.debug(`Airgapped build release ${releaseSequence} is not ready, sleeping for ${sleeptimeMs / 1000} seconds`);
      await new Promise(f => setTimeout(f, sleeptimeMs));
    } catch (err) {
      if (err instanceof StatusError) {
        if (err.statusCode >= 500) {
          // 5xx errors are likely transient, so we should retry
          console.debug(`Got HTTP error with status ${err.statusCode}, sleeping for ${sleeptimeMs / 1000} seconds`);
          await new Promise(f => setTimeout(f, sleeptimeMs));
        } else {
          console.debug(`Got HTTP error with status ${err.statusCode}, exiting`);
          throw err;
        }
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Airgapped build release ${releaseSequence} did not reach status ${expectedStatus} in ${timeout} seconds`);
}

export async function getDownloadUrlAirgapBuildRelease(vendorPortalApi: VendorPortalApi, appId: string, channelId: string, releaseSequence: number): Promise<string> {
  const release = await getAirgapBuildRelease(vendorPortalApi, appId, channelId, releaseSequence);
  const http = await vendorPortalApi.client();
  const uri = `${vendorPortalApi.endpoint}/app/${appId}/channel/${channelId}/airgap/download-url?channelSequence=${release.promotedChannelSequence}`;
  const res = await http.get(uri);

  if (res.message.statusCode != 200) {
    // discard the response body
    await res.readBody();
    throw new Error(`Failed to get airgap build release: Server responded with ${res.message.statusCode}`);
  }
  const body: any = JSON.parse(await res.readBody());
  return body.url;
}

async function getAirgapBuildRelease(vendorPortalApi: VendorPortalApi, appId: string, channelId: string, releaseSequence: number): Promise<Release> {
  const http = await vendorPortalApi.client();
  const uri = `${vendorPortalApi.endpoint}/app/${appId}/channel/${channelId}/releases`;
  const res = await http.get(uri);
  if (res.message.statusCode != 200) {
    // discard the response body
    await res.readBody();
    throw new Error(`Failed to get airgap build release: Server responded with ${res.message.statusCode}`);
  }
  const body: any = JSON.parse(await res.readBody());
  const release = body.releases.find((r: any) => r.sequence === releaseSequence);
  return {
    sequence: release.sequence,
    promotedChannelSequence: release.channelSequence,
    airgapBuildStatus: release.airgapBuildStatus
  };
}
