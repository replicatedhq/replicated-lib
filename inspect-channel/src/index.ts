import * as core from '@actions/core';
import { getChannelDetails } from 'replicated-lib';
import { VendorPortalApi } from 'replicated-lib/dist/configuration';


async function run() {
  try {
    const apiToken = core.getInput('replicated-api-token')
    const appSlug = core.getInput('replicated-app')
    const channelName = core.getInput('channel-name')
    
    const apiClient = new VendorPortalApi();
    apiClient.apiToken = apiToken;

    const channel = await getChannelDetails(apiClient, appSlug, channelName)

    core.setOutput('channel-id', channel.id);
    core.setOutput('channel-slug', channel.slug);
    core.setOutput('release-sequence', channel.releaseSequence);
  } catch (error) {
    core.setFailed(error.message);
  }
}


run()