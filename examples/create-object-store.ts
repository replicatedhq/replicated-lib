// Using the first argument as cluster id, create an object store with bucket name test

import { VendorPortalApi } from "../dist/configuration";
import { createAddonObjectStore, pollForAddonStatus } from "../dist/clusters";

// get first argument from command line as cluster id
if (process.argv.length < 3) {
  console.error("Usage: node create-object-store.js <cluster-id>");
  process.exit(1);
}
const clusterId = process.argv[2];
const bucketName = "test";

const api = new VendorPortalApi();
api.apiToken = process.env.REPLICATED_API_TOKEN ?? "";

createAddonObjectStore(api, clusterId, bucketName)
  .then(addon => {
    console.log(`Object store created: ${addon.id}`);
    // Poll till addon is ready
    pollForAddonStatus(api, clusterId, addon.id, "ready")
      .then(() => {
        console.log("Object store is ready");
      })
      .catch(err => {
        console.error("Error polling for object store status:", err);
      });
  })
  .catch(err => {
    console.error("Error creating object store:", err);
  });
