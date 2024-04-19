// Using the first argument as cluster id, create a postgres addon

import { VendorPortalApi } from "../dist/configuration";
import { createAddonPostgres, pollForAddonStatus } from "../dist/clusters";

// get first argument from command line as cluster id
if (process.argv.length < 3) {
  console.error("Usage: node create-postgres.js <cluster-id>");
  process.exit(1);
}
const clusterId = process.argv[2];

const api = new VendorPortalApi();
api.apiToken = process.env.REPLICATED_API_TOKEN ?? "";

createAddonPostgres(api, clusterId)
  .then(addon => {
    console.log(`Postgres created: ${addon.id}`);
    // Poll till addon is ready
    pollForAddonStatus(api, clusterId, addon.id, "ready", 240)
      .then(() => {
        console.log("Postgres is ready");
      })
      .catch(err => {
        console.error("Error polling for postgres status:", err);
      });
  })
  .catch(err => {
    console.error("Error creating postgres:", err);
  });
