// Test script for listCustomersByName function
// Usage: npm run test-list-customers -- <customer-name> <auth-token> [app-slug]
// Or use environment variable: REPLICATED_API_TOKEN=token npm run test-list-customers -- <customer-name> [app-slug]

import { VendorPortalApi } from "../dist/configuration";
import { listCustomersByName } from "../dist/customers";

// Debug: show all arguments
console.log("=== Debug: process.argv ===");
console.log(process.argv);
console.log("");

// Get arguments from command line
// When using npm run, arguments after -- start at index 2
// process.argv[0] = node path
// process.argv[1] = script path
// process.argv[2+] = actual arguments

const customerName = process.argv[2];
const authToken = process.env.REPLICATED_API_TOKEN || process.argv[3];
const appSlug = process.env.REPLICATED_API_TOKEN ? process.argv[3] : process.argv[4]; // Optional

if (!customerName) {
  console.error("Error: Customer name is required");
  console.error("\nUsage: npm run test-list-customers -- <customer-name> <auth-token> [app-slug]");
  console.error("   Or: REPLICATED_API_TOKEN=token npm run test-list-customers -- <customer-name> [app-slug]");
  console.error("\nExample: npm run test-list-customers -- 'CI Test Customer 3' 'your-token-here'");
  process.exit(1);
}

if (!authToken) {
  console.error("Error: Auth token is required");
  console.error("\nProvide token either as:");
  console.error("  1. Third argument: npm run test-list-customers -- <name> <token>");
  console.error("  2. Environment variable: REPLICATED_API_TOKEN=token npm run test-list-customers -- <name>");
  process.exit(1);
}

console.log("=== Test Configuration ===");
console.log(`Customer Name: ${customerName}`);
console.log(`Auth Token: ${authToken.substring(0, 10)}...${authToken.substring(authToken.length - 4)} (length: ${authToken.length})`);
console.log(`App Slug: ${appSlug || "undefined (will search across all apps)"}`);
console.log(`Query that will be used: name:${customerName}`);
console.log(`API Endpoint: https://api.replicated.com/vendor/v3`);
console.log("");

const api = new VendorPortalApi();
api.apiToken = authToken;

console.log("=== Calling listCustomersByName ===");
listCustomersByName(api, appSlug, customerName)
  .then(customers => {
    console.log(`\n=== Results ===`);
    console.log(`Found ${customers.length} customer(s):`);
    
    if (customers.length === 0) {
      console.log("No customers found!");
      console.log("\n=== Debug Info ===");
      console.log("This might indicate:");
      console.log("1. The query format might be different than expected");
      console.log("2. The include flags might be filtering out results");
      console.log("3. The app_id filter might be excluding results");
      console.log("\n=== Request Body Comparison ===");
      console.log("Your curl command sends:");
      console.log("  - include_test: true");
      console.log("  - include_active: true");
      console.log("  - include_archived: true  <-- NOTE: This is TRUE in curl");
      console.log("  - include_inactive: true");
      console.log("\nFunction sends:");
      console.log("  - include_paid: true");
      console.log("  - include_inactive: true");
      console.log("  - include_dev: true");
      console.log("  - include_community: true");
      console.log("  - include_archived: false  <-- NOTE: This is FALSE in function");
      console.log("  - include_active: true");
      console.log("  - include_test: true");
      console.log("  - include_trial: true");
      console.log("\n⚠️  POTENTIAL ISSUE: include_archived is false in function but true in curl!");
      console.log("   If the customer is archived, the function won't find it.");
    } else {
      customers.forEach((customer, index) => {
        console.log(`\n${index + 1}. Customer ID: ${customer.customerId}`);
        console.log(`   Name: ${customer.name}`);
      });
    }
  })
  .catch(err => {
    console.error("\n=== Error ===");
    console.error(err.message);
    
    if (err.message.includes("401")) {
      console.error("\n⚠️  401 Unauthorized - Authentication failed!");
      console.error("Please verify:");
      console.error("  1. Your auth token is correct");
      console.error("  2. The token has the necessary permissions");
      console.error(`  3. Token being used: ${authToken.substring(0, 10)}...${authToken.substring(authToken.length - 4)}`);
      console.error("\nCompare with your curl command - make sure the token matches exactly.");
    }
    
    console.error("\nFull error:", err);
    process.exit(1);
  });

