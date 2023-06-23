"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCustomerClusters = exports.archiveCustomer = exports.createCustomer = exports.KubernetesDistribution = exports.Customer = void 0;
const configuration_1 = require("./configuration");
const channels_1 = require("./channels");
const applications_1 = require("./applications");
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
class Customer {
}
exports.Customer = Customer;
class KubernetesDistribution {
}
exports.KubernetesDistribution = KubernetesDistribution;
async function createCustomer(vendorPortalApi, appSlug, name, email, licenseType, channelSlug, expiresIn, entitlementValues) {
    try {
        const app = await (0, applications_1.getApplicationDetails)(vendorPortalApi, appSlug);
        const channel = await (0, channels_1.getChannelDetails)(vendorPortalApi, appSlug, { slug: channelSlug });
        console.log('Creating customer on appId ' + app.id + ' and channelId ' + channel.id);
        const http = await (0, configuration_1.client)(vendorPortalApi);
        // 1. create the customer
        const createCustomerUri = `${vendorPortalApi.endpoint}/customer`;
        let createCustomerReqBody = {
            name: name,
            email: email,
            type: licenseType,
            channel_id: channel.id,
            app_id: app.id,
        };
        // expiresIn is in days, if it's 0 or less, ignore it - non-expiring license
        if (expiresIn > 0) {
            const now = new Date();
            const expiresAt = (0, date_fns_tz_1.zonedTimeToUtc)((0, date_fns_1.add)(now, { days: expiresIn }), 'UTC');
            createCustomerReqBody['expires_at'] = expiresAt.toISOString();
        }
        if (entitlementValues) {
            createCustomerReqBody['entitlementValues'] = entitlementValues;
        }
        const createCustomerRes = await http.post(createCustomerUri, JSON.stringify(createCustomerReqBody));
        if (createCustomerRes.message.statusCode != 201) {
            throw new Error(`Failed to create customer: Server responded with ${createCustomerRes.message.statusCode}`);
        }
        const createCustomerBody = JSON.parse(await createCustomerRes.readBody());
        // 2. download the license
        const downloadLicenseUri = `${vendorPortalApi.endpoint}/app/${app.id}/customer/${createCustomerBody.customer.id}/license-download`;
        const downloadLicenseRes = await http.get(downloadLicenseUri);
        // If response is 403, ignore as we could be using a trial license (on builders plan)
        if (downloadLicenseRes.message.statusCode != 200 && downloadLicenseRes.message.statusCode != 403) {
            throw new Error(`Failed to download created license: Server responded with ${downloadLicenseRes.message.statusCode}`);
        }
        let downloadLicenseBody = "";
        if (downloadLicenseRes.message.statusCode == 200) {
            downloadLicenseBody = await downloadLicenseRes.readBody();
        }
        return { name: name, customerId: createCustomerBody.customer.id, licenseId: createCustomerBody.customer.installationId, license: downloadLicenseBody };
    }
    catch (error) {
        console.error(error.message);
        throw error;
    }
}
exports.createCustomer = createCustomer;
async function archiveCustomer(vendorPortalApi, customerId) {
    const http = await (0, configuration_1.client)(vendorPortalApi);
    // 2. Archive a customer
    console.log(`Archive Customer ...`);
    const archiveCustomerUri = `${vendorPortalApi.endpoint}/customer/${customerId}/archive`;
    const archiveCustomerRes = await http.post(archiveCustomerUri, undefined);
    if (archiveCustomerRes.message.statusCode != 204) {
        throw new Error(`Failed to archive customer: Server responded with ${archiveCustomerRes.message.statusCode}`);
    }
}
exports.archiveCustomer = archiveCustomer;
async function listCustomerClusters(vendorPortalApi, appSlug) {
    const http = await (0, configuration_1.client)(vendorPortalApi);
    // 1. get the app
    const app = await (0, applications_1.getApplicationDetails)(vendorPortalApi, appSlug);
    // 1. get the cluster usage
    const getClusterUsageUri = `${vendorPortalApi.endpoint}/app/${app.id}/clusters`;
    const getClusterUsageRes = await http.get(getClusterUsageUri);
    if (getClusterUsageRes.message.statusCode != 200) {
        throw new Error(`Failed to get Cluster Usage: Server responded with ${getClusterUsageRes.message.statusCode}`);
    }
    const getClusterUsageBody = JSON.parse(await getClusterUsageRes.readBody());
    // 2. Convert body into KubernetesDistribution
    let kubernetesDistributions = [];
    // check if getClusterUsageBody.customerClustersDetails is undefined
    if (!getClusterUsageBody.customerClustersDetails) {
        return kubernetesDistributions;
    }
    for (const cluster of getClusterUsageBody.customerClustersDetails) {
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
exports.listCustomerClusters = listCustomerClusters;
