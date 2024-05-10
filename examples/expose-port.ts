// Using the first argument as cluster id, second argument is the port and third argument is the protocol

import { VendorPortalApi } from "../dist/configuration";
import { exposeClusterPort } from "../dist/clusters";

// get first argument from command line as cluster id
if (process.argv.length < 4) {
  console.error("Usage: node expose-port.js <cluster-id> <port> <protocol>");
  process.exit(1);
}
const clusterId = process.argv[2];
const port = parseInt(process.argv[3]);
const protocol = process.argv[4];

const api = new VendorPortalApi();
api.apiToken = process.env.REPLICATED_API_TOKEN ?? "";

exposeClusterPort(api, clusterId, port, [protocol], false)
  .then(clusterPort => {
    console.log(`ClusterPort created: ${clusterPort.hostname}`);
  })
  .catch(err => {
    console.error("Error creating ClusterPort:", err);
  });
