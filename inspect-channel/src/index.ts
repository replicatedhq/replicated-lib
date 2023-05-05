import * as core from '@actions/core';
import { getChannelDetails } from './channels';


async function run() {
  try {
    const channel = await getChannelDetails(core.getInput('replicated-app'), core.getInput('channel-name'))

    core.setOutput('channel-id', channel.id);
    core.setOutput('channel-slug', channel.slug);
    core.setOutput('release-sequence', channel.releaseSequence);
  } catch (error) {
    core.setFailed(error.message);
  }
}


run()