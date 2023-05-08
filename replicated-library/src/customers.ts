import * as core from '@actions/core';
import * as httpClient from '@actions/http-client';
import { getChannelDetails } from './channels';
import { getApplicationDetails } from './application';

export class Customer {
    name: string;
    customerId: string;
    licenseId: string;
}

export async function createCustomer(appSlug: string, name: string, email: string, licenseType: string, channelName: string): Promise<Customer> {
  try {
    const app = await getApplicationDetails(appSlug);
    const channel = await getChannelDetails(appSlug, channelName)

    core.info('Creating customer on appId ' + app.id + ' and channelId ' + channel.id);
    const http = new httpClient.HttpClient()
    const replicatedEndpoint= 'https://api.replicated.com/vendor/v3';
    http.requestOptions = {
      headers: {
        "Authorization": core.getInput('replicated-api-token'),
        "Content-Type": "application/json",
      }
    }

    // 1. create the customer
    const createCustomerUri = `${replicatedEndpoint}/customer`;
    const createCustomerReqBody = {
      name: name,
      email: email,
      type: licenseType,
      channel_id: channel.id,
      app_id: app.id,
    }

    const createCustomerRes = await http.post(createCustomerUri, JSON.stringify(createCustomerReqBody));
    if (createCustomerRes.message.statusCode != 201) {
      throw new Error(`Failed to create customer: Server responded with ${createCustomerRes.message.statusCode}`);
    }
    const createCustomerBody: any = JSON.parse(await createCustomerRes.readBody());

    // 2. download the license
    const downloadLicenseUri = `${replicatedEndpoint}/app/${app.id}/customer/${createCustomerBody.customer.id}/license-download`;
    const downloadLicenseRes = await http.get(downloadLicenseUri);
    if (downloadLicenseRes.message.statusCode != 200) {
      throw new Error(`Failed to download created license: Server responded with ${downloadLicenseRes.message.statusCode}`);
    }
    const downloadLicenseBody: any = JSON.parse(await downloadLicenseRes.readBody());

    return {name: name, customerId: createCustomerBody.customer.id, licenseId: downloadLicenseBody.spec.licenseID};

   
  } catch (error) {
    core.setFailed(error.message);
  }

}

export async function archiveCustomer(customerId: string) {
    const http = new httpClient.HttpClient()
    const replicatedEndpoint= 'https://api.replicated.com/vendor/v3';
    http.requestOptions = {
      headers: {
        "Authorization": core.getInput('replicated-api-token'),
      }
    }

    // 2. Archive a customer
    core.info(`Archive Customer ...`);
    const archiveCustomerUri = `${replicatedEndpoint}/customer/${customerId}/archive`;
    const archiveCustomerRes = await http.post(archiveCustomerUri, undefined);
    if (archiveCustomerRes.message.statusCode != 204) {
      throw new Error(`Failed to archive customer: Server responded with ${archiveCustomerRes.message.statusCode}`);
    }
}