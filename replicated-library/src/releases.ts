import { getApplicationDetails } from "./applications";
import { VendorPortalApi, client } from "./configuration";


export async function promoteRelease(vendorPortalApi: VendorPortalApi, appSlug: string, channelId: string, releaseSequence: number, version: string) {
    const http = await client(vendorPortalApi);

    // 1. get the app id from the app slug
    const app = await getApplicationDetails(vendorPortalApi, appSlug);
    
    // 2. promote the release
    const reqBody = {
        "versionLabel": version,
        "channelIds": [channelId],
    }
    const uri = `${vendorPortalApi.endpoint}/app/${app.id}/release/${releaseSequence}/promote`;
    const res = await http.post(uri, JSON.stringify(reqBody));
    if (res.message.statusCode != 200) {
       throw new Error(`Failed to promote release: Server responded with ${res.message.statusCode}`);
    }
}