import { getApplicationDetails } from "./applications";
import { VendorPortalApi } from "./configuration";
export interface ChannelRelease {
  sequence: string;
  channelSequence?: string;
  airgapBuildStatus?: string;
  airgapBuildError?: string;
}

// AirgapBuildStatus is the wire shape returned by the dedicated
// /airgap/status endpoint (vendor-api PR replicatedhq/vandoor#9761). The
// channelName is included to make logging / job summaries easier without an
// extra channel lookup.
export interface AirgapBuildStatus {
  channelId: string;
  channelSequence: number;
  channelName: string;
  airgapBuildStatus: string;
  airgapBuildError: string;
  fullAirgapBuild?: boolean;
}

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

export async function createChannel(vendorPortalApi: VendorPortalApi, appSlug: string, channelName: string, buildAirgapAutomatically?: boolean): Promise<Channel> {
  const http = await vendorPortalApi.client();

  // 1. get the app id from the app slug
  const app = await getApplicationDetails(vendorPortalApi, appSlug);

  // 2. create the channel
  console.log(`Creating channel ${channelName}...`);
  const reqBody: any = {
    name: channelName
  };
  if (typeof buildAirgapAutomatically !== "undefined") {
    reqBody.buildAirgapAutomatically = buildAirgapAutomatically;
  }
  const createChannelUri = `${vendorPortalApi.endpoint}/app/${app.id}/channel`;
  const createChannelRes = await http.post(createChannelUri, JSON.stringify(reqBody));
  if (createChannelRes.message.statusCode != 201) {
    // discard the response body
    await createChannelRes.readBody();
    throw new Error(`Failed to create channel: Server responded with ${createChannelRes.message.statusCode}`);
  }
  const createChannelBody: any = JSON.parse(await createChannelRes.readBody());

  console.log(`Created channel with id ${createChannelBody.channel.id}`);
  return { name: createChannelBody.channel.name, id: createChannelBody.channel.id, slug: createChannelBody.channel.channelSlug, buildAirgapAutomatically: createChannelBody.channel.buildAirgapAutomatically };
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
  const uri = `${vendorPortalApi.endpoint}/app/${appId}/channel/${channelId}/airgap/download-url?channelSequence=${release.channelSequence}`;
  const res = await http.get(uri);

  if (res.message.statusCode != 200) {
    // discard the response body
    await res.readBody();
    throw new Error(`Failed to get airgap build release: Server responded with ${res.message.statusCode}`);
  }
  const body: any = JSON.parse(await res.readBody());
  return body.url;
}

async function getAirgapBuildRelease(vendorPortalApi: VendorPortalApi, appId: string, channelId: string, releaseSequence: number): Promise<ChannelRelease> {
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
    channelSequence: release.channelSequence,
    airgapBuildStatus: release.airgapBuildStatus
  };
}

// getAirgapBuildStatus reads the airgap-build status for a single channel-
// release using the dedicated GET /v3/app/{appId}/channel/{channelId}/release/
// {channelSequence}/airgap/status endpoint (vendor-api PR
// replicatedhq/vandoor#9761). This is the canonical polling entry point for
// "I just promoted, give me a real-time view of the build" use cases — it
// returns "pending" (synthesized) when no kots_airgap_build_status row exists
// yet, building / built / failed / failed_with_metadata / cancelled / warn /
// metadata once the worker has written one. Returns null on 404.
export async function getAirgapBuildStatus(vendorPortalApi: VendorPortalApi, appId: string, channelId: string, channelSequence: number): Promise<AirgapBuildStatus | null> {
  const http = await vendorPortalApi.client();
  const uri = `${vendorPortalApi.endpoint}/app/${appId}/channel/${channelId}/release/${channelSequence}/airgap/status`;
  const res = await http.get(uri);
  if (res.message.statusCode === 404) {
    await res.readBody();
    return null;
  }
  if (res.message.statusCode !== 200) {
    await res.readBody();
    throw new Error(`Failed to get airgap build status: Server responded with ${res.message.statusCode}`);
  }
  const body: any = JSON.parse(await res.readBody());
  return {
    channelId: body.channelId || channelId,
    channelSequence: body.channelSequence ?? channelSequence,
    channelName: body.channelName || "",
    airgapBuildStatus: body.airgapBuildStatus || "",
    airgapBuildError: body.airgapBuildError || "",
    fullAirgapBuild: body.fullAirgapBuild
  };
}

// getLatestAirgapStatusForRelease finds the most recent channel-release for
// the given (channel, release) pair and returns its airgap-build status.
// A release can be promoted to the same channel multiple times — each promote
// produces a distinct channelSequence with its own airgap build — and the
// caller almost always wants the latest one (their freshly-promoted build).
//
// Returns null if no channel-release matches the release sequence.
export async function getLatestAirgapStatusForRelease(vendorPortalApi: VendorPortalApi, appId: string, channelId: string, releaseSequence: number): Promise<AirgapBuildStatus | null> {
  const http = await vendorPortalApi.client();
  const uri = `${vendorPortalApi.endpoint}/app/${appId}/channel/${channelId}/releases`;
  const res = await http.get(uri);
  if (res.message.statusCode !== 200) {
    await res.readBody();
    throw new Error(`Failed to get channel releases: Server responded with ${res.message.statusCode}`);
  }
  const body: any = JSON.parse(await res.readBody());
  if (!body.releases || !Array.isArray(body.releases)) {
    return null;
  }
  const matching = body.releases.filter((r: any) => r.sequence === releaseSequence);
  if (matching.length === 0) {
    return null;
  }
  const release = matching.reduce((latest: any, r: any) => ((r.channelSequence ?? 0) > (latest.channelSequence ?? 0) ? r : latest));
  return {
    channelId: channelId,
    channelSequence: release.channelSequence ?? 0,
    channelName: release.channelName || "",
    airgapBuildStatus: release.airgapBuildStatus || "",
    airgapBuildError: release.airgapBuildError || "",
    fullAirgapBuild: release.fullAirgapBuild
  };
}

// getAirgapBundleDownloadURL is a variant of getDownloadUrlAirgapBuildRelease
// that takes a pre-known channelSequence directly. Use this when the caller
// already has the channelSequence from a promote response or status poll —
// it skips the redundant /releases scrape that the older function performs.
export async function getAirgapBundleDownloadURL(vendorPortalApi: VendorPortalApi, appId: string, channelId: string, channelSequence: number): Promise<string> {
  const http = await vendorPortalApi.client();
  const uri = `${vendorPortalApi.endpoint}/app/${appId}/channel/${channelId}/airgap/download-url?channelSequence=${channelSequence}`;
  const res = await http.get(uri);
  if (res.message.statusCode !== 200) {
    await res.readBody();
    throw new Error(`Failed to get airgap bundle download URL: Server responded with ${res.message.statusCode}`);
  }
  const body: any = JSON.parse(await res.readBody());
  return body.url;
}
