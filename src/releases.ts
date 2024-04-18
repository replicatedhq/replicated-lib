import { getApplicationDetails } from "./applications";
import { VendorPortalApi } from "./configuration";
import { gzip } from "pako";
import * as path from "path";
import * as fs from "fs";
import * as util from "util";
import * as base64 from "base64-js";

import { zonedTimeToUtc } from "date-fns-tz";

export interface Release {
  sequence: string;
  charts?: ReleaseChart[];
}

export interface ReleaseChart {
  name: string;
  version: string;
  status: string;
  error: string;
}

export interface KotsSingleSpec {
  name: string;
  path: string;
  content: string;
  children: KotsSingleSpec[];
}

export interface CompatibilityResult {
  distribution: string;
  version: string;
  successAt?: Date;
  successNotes?: string;
  failureAt?: Date;
  failureNotes?: string;
}

export const exportedForTesting = {
  areReleaseChartsPushed,
  getReleaseByAppId,
  isReleaseReadyForInstall,
  promoteReleaseByAppId,
  readChart,
  reportCompatibilityResultByAppId
};

export async function createRelease(vendorPortalApi: VendorPortalApi, appSlug: string, yamlDir: string): Promise<Release> {
  const http = await vendorPortalApi.client();

  // 1. get the app id from the app slug
  const app = await getApplicationDetails(vendorPortalApi, appSlug);

  // 2. create the release
  const createReleasePayload = await readYAMLDir(yamlDir);

  const reqBody = {
    spec_gzip: gzipData(createReleasePayload)
  };
  const createReleaseUri = `${vendorPortalApi.endpoint}/app/${app.id}/release`;
  const createReleaseRes = await http.post(createReleaseUri, JSON.stringify(reqBody));
  if (createReleaseRes.message.statusCode != 201) {
    throw new Error(`Failed to create release: Server responded with ${createReleaseRes.message.statusCode}`);
  }
  const createReleaseBody: any = JSON.parse(await createReleaseRes.readBody());

  console.log(`Created release with sequence number ${createReleaseBody.release.sequence}`);

  // 3. If contains charts, wait for charts to be ready
  // If there are charts, wait for them to be ready
  if (createReleaseBody.release.charts?.length > 0) {
    const isReleaseReady: boolean = await isReleaseReadyForInstall(vendorPortalApi, app.id, createReleaseBody.release.sequence);
    if (!isReleaseReady) {
      throw new Error(`Release ${createReleaseBody.release.sequence} is not ready`);
    }
  }
  return { sequence: createReleaseBody.release.sequence, charts: createReleaseBody.release.charts };
}

export async function createReleaseFromChart(vendorPortalApi: VendorPortalApi, appSlug: string, chart: string): Promise<Release> {
  const http = await vendorPortalApi.client();

  // 1. get the app id from the app slug
  const app = await getApplicationDetails(vendorPortalApi, appSlug);

  // 2. create the release
  const createReleasePayload = await readChart(chart);

  const reqBody = {
    spec_gzip: gzipData(createReleasePayload)
  };
  const createReleaseUri = `${vendorPortalApi.endpoint}/app/${app.id}/release`;
  const createReleaseRes = await http.post(createReleaseUri, JSON.stringify(reqBody));
  if (createReleaseRes.message.statusCode != 201) {
    throw new Error(`Failed to create release: Server responded with ${createReleaseRes.message.statusCode}`);
  }
  const createReleaseBody: any = JSON.parse(await createReleaseRes.readBody());

  console.log(`Created release with sequence number ${createReleaseBody.release.sequence}`);

  // 3. If contains charts, wait for charts to be ready
  // If there are charts, wait for them to be ready
  if (createReleaseBody.release.charts?.length > 0) {
    const isReleaseReady: boolean = await isReleaseReadyForInstall(vendorPortalApi, app.id, createReleaseBody.release.sequence);
    if (!isReleaseReady) {
      throw new Error(`Release ${createReleaseBody.release.sequence} is not ready`);
    }
  }
  return { sequence: createReleaseBody.release.sequence, charts: createReleaseBody.release.charts };
}

export const gzipData = (data: any) => {
  return Buffer.from(gzip(JSON.stringify(data))).toString("base64");
};

const stat = util.promisify(fs.stat);

async function encodeKotsFile(fullDir: string, file: string, prefix: string = ""): Promise<KotsSingleSpec | null> {
  const readFile = util.promisify(fs.readFile);
  const fullPath = path.join(fullDir, file);
  const stats = await stat(fullPath);
  if (stats.isDirectory()) {
    return null;
  }

  if (path.basename(file).startsWith(".")) {
    return null;
  }

  const ext = path.extname(file);
  if (!isSupportedExt(ext)) {
    return null;
  }

  const bytes = await readFile(fullPath);

  let content: string;
  switch (ext) {
    case ".tgz":
    case ".gz":
    case ".woff":
    case ".woff2":
    case ".ttf":
    case ".otf":
    case ".eot":
    case ".svg":
      content = base64.fromByteArray(bytes);
      break;
    default:
      content = bytes.toString();
  }

  const name = path.basename(file);
  const relPath = path.relative(fullDir, fullPath);
  const singlefile = relPath.split(path.sep).join("/");

  return {
    name: name,
    path: path.join(prefix, singlefile),
    content: content,
    children: []
  };
}

async function readYAMLDir(yamlDir: string, prefix: string = ""): Promise<KotsSingleSpec[]> {
  const allKotsReleaseSpecs: KotsSingleSpec[] = [];
  const readdir = util.promisify(fs.readdir);

  const files = await readdir(yamlDir);
  for (const file of files) {
    console.info(`Processing file ${file}`);
    if ((await stat(path.join(yamlDir, file))).isDirectory()) {
      const subdir = await readYAMLDir(path.join(yamlDir, file), path.join(prefix, file));
      if (subdir) {
        allKotsReleaseSpecs.push({ name: file, path: path.join(prefix, file), content: "", children: subdir });
      }
    } else {
      const spec = await encodeKotsFile(yamlDir, file, prefix);
      if (spec) {
        allKotsReleaseSpecs.push(spec);
      }
    }
  }

  return allKotsReleaseSpecs;
}

async function readChart(chart: string): Promise<KotsSingleSpec[]> {
  const allKotsReleaseSpecs: KotsSingleSpec[] = [];
  if ((await stat(chart)).isDirectory()) {
    throw new Error(`Chart ${chart} is a directory, not a file`);
  }

  const spec = await encodeKotsFile(path.dirname(chart), path.basename(chart));
  if (spec) {
    allKotsReleaseSpecs.push(spec);
  }

  return allKotsReleaseSpecs;
}

function isSupportedExt(ext: string): boolean {
  const supportedExts = [".tgz", ".gz", ".yaml", ".yml", ".css", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".svg"];
  return supportedExts.includes(ext);
}

export async function promoteRelease(vendorPortalApi: VendorPortalApi, appSlug: string, channelId: string, releaseSequence: number, version: string) {
  // 1. get the app id from the app slug
  const app = await getApplicationDetails(vendorPortalApi, appSlug);

  // 2. promote the release
  await promoteReleaseByAppId(vendorPortalApi, app.id, channelId, releaseSequence, version);
}

async function promoteReleaseByAppId(vendorPortalApi: VendorPortalApi, appId: string, channelId: string, releaseSequence: number, version: string) {
  const http = await vendorPortalApi.client();
  const reqBody = {
    versionLabel: version,
    channelIds: [channelId]
  };
  const uri = `${vendorPortalApi.endpoint}/app/${appId}/release/${releaseSequence}/promote`;
  const res = await http.post(uri, JSON.stringify(reqBody));
  if (res.message.statusCode != 200) {
    // If res has a body, read it and add it to the error message
    let body = "";
    try {
      body = await res.readBody();
    } catch (err) {
      // ignore
    }
    throw new Error(`Failed to promote release: Server responded with ${res.message.statusCode}: ${body}`);
  }
}

async function isReleaseReadyForInstall(vendorPortalApi: VendorPortalApi, appId: string, releaseSequence: number): Promise<boolean> {
  let release: Release = await getReleaseByAppId(vendorPortalApi, appId, releaseSequence);
  if (release.charts?.length === 0) {
    throw new Error(`Release ${releaseSequence} does not contain any charts`);
  }
  const sleeptime: number = 5;
  const timeout: number = 30 * release.charts.length;
  // iterate for timeout/sleeptime times
  for (let i = 0; i < timeout / sleeptime; i++) {
    release = await getReleaseByAppId(vendorPortalApi, appId, releaseSequence);
    const ready: boolean = areReleaseChartsPushed(release.charts);
    if (ready) {
      return true;
    }
    console.debug(`Release ${releaseSequence} is not ready, sleeping for ${sleeptime} seconds`);
    await new Promise(f => setTimeout(f, sleeptime * 1000));
  }
  return false;
}

function areReleaseChartsPushed(charts: ReleaseChart[]): boolean {
  let pushedChartsCount: number = 0;
  let chartsCount: number = 0;
  for (const chart of charts) {
    switch (chart.status) {
      case "pushed":
        pushedChartsCount++;
        chartsCount++;
        break;
      case "unknown":
      case "pushing":
        // wait for the chart to be pushed
        chartsCount++;
        continue;
      case "error":
        throw new Error(`chart ${chart.name} failed to push: ${chart.error}`);
    }
  }

  return pushedChartsCount == chartsCount;
}

async function getReleaseByAppId(vendorPortalApi: VendorPortalApi, appId: string, releaseSequence: number): Promise<Release> {
  const http = await vendorPortalApi.client();

  const uri = `${vendorPortalApi.endpoint}/app/${appId}/release/${releaseSequence}`;
  const res = await http.get(uri);
  if (res.message.statusCode != 200) {
    throw new Error(`Failed to get release: Server responded with ${res.message.statusCode}`);
  }

  const body: any = JSON.parse(await res.readBody());

  return { sequence: body.release.sequence, charts: body.release.charts };
}

export async function reportCompatibilityResult(vendorPortalApi: VendorPortalApi, appSlug: string, releaseSequence: number, compatibilityResult: CompatibilityResult) {
  // 1. get the app id from the app slug
  const app = await getApplicationDetails(vendorPortalApi, appSlug);

  // 2. promote the release
  await reportCompatibilityResultByAppId(vendorPortalApi, app.id, releaseSequence, compatibilityResult);
}

async function reportCompatibilityResultByAppId(vendorPortalApi: VendorPortalApi, appId: string, releaseSequence: number, compatibilityResult: CompatibilityResult) {
  const http = await vendorPortalApi.client();
  const reqBody = {
    distribution: compatibilityResult.distribution,
    version: compatibilityResult.version
  };
  if (compatibilityResult.successAt) {
    const successAt = zonedTimeToUtc(compatibilityResult.successAt, "UTC");
    reqBody["successAt"] = successAt.toISOString();
    reqBody["successNotes"] = compatibilityResult.successNotes;
  }
  if (compatibilityResult.failureAt) {
    const failureAt = zonedTimeToUtc(compatibilityResult.failureAt, "UTC");
    reqBody["failureAt"] = failureAt.toISOString();
    reqBody["failureNotes"] = compatibilityResult.failureNotes;
  }
  const uri = `${vendorPortalApi.endpoint}/app/${appId}/release/${releaseSequence}/compatibility`;
  const res = await http.post(uri, JSON.stringify(reqBody));
  if (res.message.statusCode != 201) {
    // If res has a body, read it and add it to the error message
    let body = "";
    try {
      body = await res.readBody();
    } catch (err) {
      // ignore
    }
    throw new Error(`Failed to report compatibility results: Server responded with ${res.message.statusCode}: ${body}`);
  }
}
