// Example script to test the pollForAirgapReleaseStatus function
// Usage: node poll-for-airgap-build.js <appId> <channelId> <releaseSequence> <expectedStatus>

import { VendorPortalApi } from "../dist/configuration";
import { pollForAirgapReleaseStatus, getDownloadUrlAirgapBuildRelease } from "../dist/channels";
import * as readline from 'readline';

// Function to get input from the user
async function getUserInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
    try {
    // Initialize the API client
    const api = new VendorPortalApi();
        
    // Get API token from environment variable
    api.apiToken = process.env.REPLICATED_API_TOKEN || "";
    
    if (!api.apiToken) {
        throw new Error("REPLICATED_API_TOKEN environment variable is not set");
    }

    // Get parameters from command line arguments or prompt for them
    let appId = process.argv[2];
    let channelId = process.argv[3];
    let releaseSequence = process.argv[4] ? parseInt(process.argv[4]) : undefined;
    let expectedStatus = process.argv[5];

    // If any parameters are missing, prompt for them
    if (!appId) {
      appId = await getUserInput("Enter Application ID: ");
    }

    if (!channelId) {
      channelId = await getUserInput("Enter Channel ID: ");
    }

    if (!releaseSequence) {
      const sequenceStr = await getUserInput("Enter Release Sequence: ");
      releaseSequence = parseInt(sequenceStr);
    }

    if (!expectedStatus) {
      expectedStatus = await getUserInput("Enter Expected Status (e.g., 'built', 'warn', 'metadata'): ");
    }

    // Validate inputs
    if (isNaN(releaseSequence)) {
      throw new Error("Release Sequence must be a number");
    }

    console.log(`\nPolling for airgap release status with the following parameters:`);
    console.log(`- Application ID: ${appId}`);
    console.log(`- Channel ID: ${channelId}`);
    console.log(`- Release Sequence: ${releaseSequence}`);
    console.log(`- Expected Status: ${expectedStatus}`);
    console.log(`\nThis will poll until the release reaches the expected status or times out.`);

    console.log("\nStarting to poll for airgap release status...");
    
    const status = await pollForAirgapReleaseStatus(
      api,
      appId,
      channelId,
      releaseSequence,
      expectedStatus,
      60, // 1 minute timeout
      1000  // 1 second polling interval
    );

    console.log(`\nSuccess! Release ${releaseSequence} has reached status: ${status}`);

    if (status === "built") {
      const downloadUrl = await getDownloadUrlAirgapBuildRelease(api, appId, channelId, releaseSequence);
      console.log(`\nDownload URL: ${downloadUrl}`);
    }

  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();
