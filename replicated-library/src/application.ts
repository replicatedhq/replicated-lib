import * as httpClient from '@actions/http-client';
import * as core from '@actions/core';

export class Application {
    name: string;
    id: string;
    slug: string;
}

export async function getApplicationDetails(appSlug: string): Promise<Application> {
    const http = new httpClient.HttpClient()
    const replicatedEndpoint= 'https://api.replicated.com/vendor/v3';
    http.requestOptions = {
      headers: {
        "Authorization": core.getInput('replicated-api-token'),
      }
    }
  
    // 1. get the app id from the app slug
    core.info('Getting app id from app slug...');
    const listAppsUri = `${replicatedEndpoint}/apps`;
    const listAppsRes = await http.get(listAppsUri);
    if (listAppsRes.message.statusCode != 200) {
      throw new Error(`Failed to list apps: Server responded with ${listAppsRes.message.statusCode}`);
    }
    const listAppsBody: any = JSON.parse(await listAppsRes.readBody());
    const app = await findApplicationDetailsInOutput(listAppsBody.apps, appSlug);
    core.info(`Found app id ${app.id} for app slug ${app.slug}`);
    return app;

}

export async function findApplicationDetailsInOutput(apps: any[], appSlug: string): Promise<Application> {
    for (const app of apps) {
        if (app.slug === appSlug) {
            return {name: app.name, id: app.id, slug: app.slug};
        }
    }
    return Promise.reject(`Could not find app with slug ${appSlug}`);
  }