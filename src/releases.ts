import { getApplicationDetails } from "./applications";
import { VendorPortalApi, client } from "./configuration";
import { gzip } from "pako";
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import * as base64 from 'base64-js';

export interface Release {
  sequence: string;
}

export interface KotsSingleSpec {
  name: string;
  path: string;
  content: string;
  children: KotsSingleSpec[];
}

export async function createRelease(vendorPortalApi: VendorPortalApi, appSlug: string, yamlDir: string): Promise<Release> {
  const http = await client(vendorPortalApi);

  // 1. get the app id from the app slug
  const app = await getApplicationDetails(vendorPortalApi, appSlug);

  // 2. create the release
  const createReleasePayload = await readYAMLDir(yamlDir);

  const reqBody = {
    "spec_gzip": gzipData(createReleasePayload),
  }
  const createReleaseUri = `${vendorPortalApi.endpoint}/app/${app.id}/release`;
  const createReleaseRes = await http.post(createReleaseUri, JSON.stringify(reqBody));
  if (createReleaseRes.message.statusCode != 201) {
    throw new Error(`Failed to create release: Server responded with ${createReleaseRes.message.statusCode}`);
  }
  const createReleaseBody: any = JSON.parse(await createReleaseRes.readBody());

  console.log(`Created release with sequence nunmber ${createReleaseBody.release.sequence}`);
  return { sequence: createReleaseBody.release.sequence };

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
    console.info(`Processing file ${file}`)
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



function isSupportedExt(ext: string): boolean {
  const supportedExts = [".tgz", ".gz", ".yaml", ".yml", ".css", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".svg",];
  return supportedExts.includes(ext);
}


export async function promoteRelease(vendorPortalApi: VendorPortalApi, appSlug: string, channelId: string, releaseSequence: number, version: string) {
  const http = await client(vendorPortalApi);

  // 1. get the app id from the app slug
  const app = await getApplicationDetails(vendorPortalApi, appSlug);

  // 2. promote the release
  await promoteReleaseByAppId(vendorPortalApi, app.id, channelId, releaseSequence, version);
}

export async function promoteReleaseByAppId(vendorPortalApi: VendorPortalApi, appId: string, channelId: string, releaseSequence: number, version: string) {
  const http = await client(vendorPortalApi);
  const reqBody = {
    "versionLabel": version,
    "channelIds": [channelId],
  }
  const uri = `${vendorPortalApi.endpoint}/app/${appId}/release/${releaseSequence}/promote`;
  const res = await http.post(uri, JSON.stringify(reqBody));
  if (res.message.statusCode != 200) {
    throw new Error(`Failed to promote release: Server responded with ${res.message.statusCode}`);
  }
}