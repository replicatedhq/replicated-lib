import { VendorPortalApi } from "./configuration";
import { getChannelDetails } from "./channels";
import { getApplicationDetails } from "./applications";

import { add } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

export class Customer {
  name: string;
  customerId: string;
  licenseId: string;
  license: string;
}

export class CustomerSummary {
  name: string;
  customerId: string;
}

interface entitlementValue {
  name: string;
  value: string;
}

export class KubernetesDistribution {
  k8sDistribution: string;
  k8sVersion: string;
  kotsVersion: string;
  cloudProvider: string;
  isKurl: boolean;
  numberOfInstances: number;
  isAirgap: boolean;
}

export async function createCustomer(vendorPortalApi: VendorPortalApi, appSlug: string, name: string, email: string, licenseType: string, channelSlug: string, expiresIn: number, entitlementValues?: entitlementValue[], isKotsInstallEnabled?: boolean, isDevModeEnabled?: boolean): Promise<Customer> {
  try {
    const app = await getApplicationDetails(vendorPortalApi, appSlug);

    console.log("Creating customer on appId " + app.id);

    const http = await vendorPortalApi.client();

    // 1. create the customer
    const createCustomerUri = `${vendorPortalApi.endpoint}/customer`;
    let createCustomerReqBody = {
      name: name,
      email: email,
      type: licenseType,
      app_id: app.id
    };
    if (isKotsInstallEnabled !== undefined) {
      createCustomerReqBody["is_kots_install_enabled"] = isKotsInstallEnabled;
    }
    if (channelSlug) {
      const channel = await getChannelDetails(vendorPortalApi, appSlug, { slug: channelSlug });
      createCustomerReqBody["channel_id"] = channel.id;
    }
    // expiresIn is in days, if it's 0 or less, ignore it - non-expiring license
    if (expiresIn > 0) {
      const now = new Date();
      const expiresAt = fromZonedTime(add(now, { days: expiresIn }), "UTC");
      createCustomerReqBody["expires_at"] = expiresAt.toISOString();
    }
    if (entitlementValues) {
      createCustomerReqBody["entitlementValues"] = entitlementValues;
    }
    if (isDevModeEnabled !== undefined) {
      createCustomerReqBody["is_dev_mode_enabled"] = isDevModeEnabled;
    }

    const createCustomerRes = await http.post(createCustomerUri, JSON.stringify(createCustomerReqBody));
    if (createCustomerRes.message.statusCode != 201) {
      let body = "";
      try {
        body = await createCustomerRes.readBody();
      } catch (err) {
        // ignore
      }
      throw new Error(`Failed to create customer: Server responded with ${createCustomerRes.message.statusCode}: ${body}`);
    }
    const createCustomerBody: any = JSON.parse(await createCustomerRes.readBody());

    // 2. download the license
    const downloadLicenseUri = `${vendorPortalApi.endpoint}/app/${app.id}/customer/${createCustomerBody.customer.id}/license-download`;
    const downloadLicenseRes = await http.get(downloadLicenseUri);
    // If response is 403, ignore as we could be using a trial license (on builders plan)
    if (downloadLicenseRes.message.statusCode != 200 && downloadLicenseRes.message.statusCode != 403) {
      // discard the response body
      await downloadLicenseRes.readBody();
      throw new Error(`Failed to download created license: Server responded with ${downloadLicenseRes.message.statusCode}`);
    }
    let downloadLicenseBody: string = "";
    if (downloadLicenseRes.message.statusCode == 200) {
      downloadLicenseBody = await downloadLicenseRes.readBody();
    } else {
      // discard the response body
      await downloadLicenseRes.readBody();
    }

    return { name: name, customerId: createCustomerBody.customer.id, licenseId: createCustomerBody.customer.installationId, license: downloadLicenseBody };
  } catch (error) {
    console.error(error.message);
    throw error;
  }
}

export async function archiveCustomer(vendorPortalApi: VendorPortalApi, customerId: string) {
  const http = await vendorPortalApi.client();

  // 2. Archive a customer
  console.log(`Archive Customer ...`);
  const archiveCustomerUri = `${vendorPortalApi.endpoint}/customer/${customerId}/archive`;
  const archiveCustomerRes = await http.post(archiveCustomerUri, undefined);
  // discard the response body
  await archiveCustomerRes.readBody();
  if (archiveCustomerRes.message.statusCode != 204) {
    throw new Error(`Failed to archive customer: Server responded with ${archiveCustomerRes.message.statusCode}`);
  }
}

export async function getUsedKubernetesDistributions(vendorPortalApi: VendorPortalApi, appSlug: string): Promise<KubernetesDistribution[]> {
  const http = await vendorPortalApi.client();

  // 1. get the app
  const app = await getApplicationDetails(vendorPortalApi, appSlug);

  // 1. get the cluster usage
  const getClusterUsageUri = `${vendorPortalApi.endpoint}/app/${app.id}/cluster-usage`;
  const getClusterUsageRes = await http.get(getClusterUsageUri);
  if (getClusterUsageRes.message.statusCode != 200) {
    // discard the response body
    await getClusterUsageRes.readBody();
    throw new Error(`Failed to get Cluster Usage: Server responded with ${getClusterUsageRes.message.statusCode}`);
  }
  const getClusterUsageBody: any = JSON.parse(await getClusterUsageRes.readBody());

  // 2. Convert body into KubernetesDistribution
  let kubernetesDistributions: KubernetesDistribution[] = [];

  // check if getClusterUsageBody.clusterUsageDetails is undefined
  if (!getClusterUsageBody.clusterUsageDetails) {
    return kubernetesDistributions;
  }

  for (const cluster of getClusterUsageBody.clusterUsageDetails) {
    kubernetesDistributions.push({
      k8sDistribution: cluster.kubernetes_distribution,
      k8sVersion: cluster.kubernetes_version,
      kotsVersion: cluster.kots_version,
      cloudProvider: cluster.cloud_provider,
      isKurl: cluster.is_kurl,
      numberOfInstances: cluster.number_of_instances,
      isAirgap: cluster.is_airgap
    });
  }

  return kubernetesDistributions;
}

async function searchCustomers(vendorPortalApi: VendorPortalApi, appSlug: string | undefined, query: string): Promise<CustomerSummary[]> {
  const http = await vendorPortalApi.client();

  // Get the app ID from the app slug to filter results (if appSlug is provided)
  let app: any;
  if (appSlug) {
    app = await getApplicationDetails(vendorPortalApi, appSlug);
  }

  // Use the searchTeamCustomers endpoint to search for customers
  const searchCustomersUri = `${vendorPortalApi.endpoint}/customers/search`;

  let allCustomers: CustomerSummary[] = [];
  let offset = 0; // offset is the number of pages to skip
  const pageSize = 100;
  let hasMorePages = true;

  while (hasMorePages) {
    const requestBody: any = {
      include_paid: true,
      include_inactive: true,
      include_dev: true,
      include_community: true,
      include_archived: false,
      include_active: true,
      include_test: true,
      include_trial: true,
      query: query,
      offset: offset,
      page_size: pageSize
    };

    // Only add app_id if appSlug was provided
    if (app) {
      requestBody.app_id = app.id;
    }

    const searchCustomersRes = await http.post(searchCustomersUri, JSON.stringify(requestBody));
    if (searchCustomersRes.message.statusCode != 200) {
      let body = "";
      try {
        body = await searchCustomersRes.readBody();
      } catch (err) {
        // ignore
      }
      throw new Error(`Failed to list customers: Server responded with ${searchCustomersRes.message.statusCode}: ${body}`);
    }
    const searchCustomersBody: any = JSON.parse(await searchCustomersRes.readBody());

    // Convert response body into CustomerSummary array
    if (searchCustomersBody.customers && Array.isArray(searchCustomersBody.customers)) {
      for (const customer of searchCustomersBody.customers) {
        allCustomers.push({
          name: customer.name,
          customerId: customer.id
        });
      }
    }

    // Check if there are more pages to fetch
    const totalCount = searchCustomersBody.total_hits || 0;
    const currentPageSize = searchCustomersBody.customers ? searchCustomersBody.customers.length : 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    hasMorePages = currentPageSize > 0 && offset + 1 < totalPages;
    offset++; // Increment offset by 1 (one more page to skip)
  }

  return allCustomers;
}

export async function listCustomersByName(vendorPortalApi: VendorPortalApi, appSlug: string | undefined, customerName: string): Promise<CustomerSummary[]> {
  return searchCustomers(vendorPortalApi, appSlug, `name:${customerName}`);
}

export async function listCustomersByEmail(vendorPortalApi: VendorPortalApi, appSlug: string | undefined, customerEmail: string): Promise<CustomerSummary[]> {
  return searchCustomers(vendorPortalApi, appSlug, `email:${customerEmail}`);
}
