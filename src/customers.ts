import { VendorPortalApi, client } from './configuration';
import { getChannelDetails } from './channels';
import { getApplicationDetails } from './applications';

import { parse } from 'yaml'

export class Customer {
    name: string;
    customerId: string;
    licenseId: string;
    license: string;
}

interface entitlementValue {
  name: string;
  value: string;
}

export async function createCustomer(vendorPortalApi: VendorPortalApi, appSlug: string, name: string, email: string, licenseType: string, channelSlug: string, 
                                     entitlementValues?: entitlementValue[]): Promise<Customer> {
  try {
    const app = await getApplicationDetails(vendorPortalApi, appSlug);
    const channel = await getChannelDetails(vendorPortalApi, appSlug, {slug: channelSlug})

    console.log('Creating customer on appId ' + app.id + ' and channelId ' + channel.id);
    
    const http = await client(vendorPortalApi);

    // 1. create the customer
    const createCustomerUri = `${vendorPortalApi.endpoint}/customer`;
    let createCustomerReqBody = {
      name: name,
      email: email,
      type: licenseType,
      channel_id: channel.id,
      app_id: app.id,
    }
    if (entitlementValues) {
      createCustomerReqBody['entitlementValues'] = entitlementValues
    }

    const createCustomerRes = await http.post(createCustomerUri, JSON.stringify(createCustomerReqBody));
    if (createCustomerRes.message.statusCode != 201) {
      throw new Error(`Failed to create customer: Server responded with ${createCustomerRes.message.statusCode}`);
    }
    const createCustomerBody: any = JSON.parse(await createCustomerRes.readBody());

    // 2. download the license
    const downloadLicenseUri = `${vendorPortalApi.endpoint}/app/${app.id}/customer/${createCustomerBody.customer.id}/license-download`;
    const downloadLicenseRes = await http.get(downloadLicenseUri);
    if (downloadLicenseRes.message.statusCode != 200) {
      throw new Error(`Failed to download created license: Server responded with ${downloadLicenseRes.message.statusCode}`);
    }
    const downloadLicenseBody: any = await downloadLicenseRes.readBody();
    const licenseYAML = parse(downloadLicenseBody)

    return {name: name, customerId: createCustomerBody.customer.id, licenseId: licenseYAML.spec.licenseID, license: downloadLicenseBody};

   
  } catch (error) {
    console.error(error.message);
    throw error
  }

}

export async function archiveCustomer(vendorPortalApi: VendorPortalApi, customerId: string) {
    const http = await client(vendorPortalApi);

    // 2. Archive a customer
    console.log(`Archive Customer ...`);
    const archiveCustomerUri = `${vendorPortalApi.endpoint}/customer/${customerId}/archive`;
    const archiveCustomerRes = await http.post(archiveCustomerUri, undefined);
    if (archiveCustomerRes.message.statusCode != 204) {
      throw new Error(`Failed to archive customer: Server responded with ${archiveCustomerRes.message.statusCode}`);
    }
}