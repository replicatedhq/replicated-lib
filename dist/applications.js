"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findApplicationDetailsInOutput = exports.getApplicationDetails = exports.Application = void 0;
class Application {
}
exports.Application = Application;
async function getApplicationDetails(vendorPortalApi, appSlug) {
    const http = await vendorPortalApi.client();
    // 1. get the app id from the app slug
    console.log('Getting app id from app slug...');
    const listAppsUri = `${vendorPortalApi.endpoint}/apps`;
    const listAppsRes = await http.get(listAppsUri);
    if (listAppsRes.message.statusCode != 200) {
        throw new Error(`Failed to list apps: Server responded with ${listAppsRes.message.statusCode}`);
    }
    const listAppsBody = JSON.parse(await listAppsRes.readBody());
    const app = await findApplicationDetailsInOutput(listAppsBody.apps, appSlug);
    console.log(`Found app id ${app.id} for app slug ${app.slug}`);
    return app;
}
exports.getApplicationDetails = getApplicationDetails;
async function findApplicationDetailsInOutput(apps, appSlug) {
    for (const app of apps) {
        if (app.slug === appSlug) {
            return { name: app.name, id: app.id, slug: app.slug };
        }
    }
    return Promise.reject(`Could not find app with slug ${appSlug}`);
}
exports.findApplicationDetailsInOutput = findApplicationDetailsInOutput;
