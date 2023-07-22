"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReleaseByAppId = exports.getRelease = exports.promoteReleaseByAppId = exports.promoteRelease = exports.gzipData = exports.createRelease = void 0;
const applications_1 = require("./applications");
const configuration_1 = require("./configuration");
const pako_1 = require("pako");
const path = require("path");
const fs = require("fs");
const util = require("util");
const base64 = require("base64-js");
async function createRelease(vendorPortalApi, appSlug, yamlDir) {
    const http = await (0, configuration_1.client)(vendorPortalApi);
    // 1. get the app id from the app slug
    const app = await (0, applications_1.getApplicationDetails)(vendorPortalApi, appSlug);
    // 2. create the release
    const createReleasePayload = await readYAMLDir(yamlDir);
    const reqBody = {
        "spec_gzip": (0, exports.gzipData)(createReleasePayload),
    };
    const createReleaseUri = `${vendorPortalApi.endpoint}/app/${app.id}/release`;
    const createReleaseRes = await http.post(createReleaseUri, JSON.stringify(reqBody));
    if (createReleaseRes.message.statusCode != 201) {
        throw new Error(`Failed to create release: Server responded with ${createReleaseRes.message.statusCode}`);
    }
    const createReleaseBody = JSON.parse(await createReleaseRes.readBody());
    console.log(`Created release with sequence number ${createReleaseBody.release.sequence}`);
    return { sequence: createReleaseBody.release.sequence, charts: createReleaseBody.release.charts };
}
exports.createRelease = createRelease;
const gzipData = (data) => {
    return Buffer.from((0, pako_1.gzip)(JSON.stringify(data))).toString("base64");
};
exports.gzipData = gzipData;
const stat = util.promisify(fs.stat);
async function encodeKotsFile(fullDir, file, prefix = "") {
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
    let content;
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
async function readYAMLDir(yamlDir, prefix = "") {
    const allKotsReleaseSpecs = [];
    const readdir = util.promisify(fs.readdir);
    const files = await readdir(yamlDir);
    for (const file of files) {
        console.info(`Processing file ${file}`);
        if ((await stat(path.join(yamlDir, file))).isDirectory()) {
            const subdir = await readYAMLDir(path.join(yamlDir, file), path.join(prefix, file));
            if (subdir) {
                allKotsReleaseSpecs.push({ name: file, path: path.join(prefix, file), content: "", children: subdir });
            }
        }
        else {
            const spec = await encodeKotsFile(yamlDir, file, prefix);
            if (spec) {
                allKotsReleaseSpecs.push(spec);
            }
        }
    }
    return allKotsReleaseSpecs;
}
function isSupportedExt(ext) {
    const supportedExts = [".tgz", ".gz", ".yaml", ".yml", ".css", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".svg",];
    return supportedExts.includes(ext);
}
async function promoteRelease(vendorPortalApi, appSlug, channelId, releaseSequence, version) {
    const http = await (0, configuration_1.client)(vendorPortalApi);
    // 1. get the app id from the app slug
    const app = await (0, applications_1.getApplicationDetails)(vendorPortalApi, appSlug);
    // 2. promote the release
    await promoteReleaseByAppId(vendorPortalApi, app.id, channelId, releaseSequence, version);
}
exports.promoteRelease = promoteRelease;
async function promoteReleaseByAppId(vendorPortalApi, appId, channelId, releaseSequence, version) {
    const http = await (0, configuration_1.client)(vendorPortalApi);
    const reqBody = {
        "versionLabel": version,
        "channelIds": [channelId],
    };
    const uri = `${vendorPortalApi.endpoint}/app/${appId}/release/${releaseSequence}/promote`;
    const res = await http.post(uri, JSON.stringify(reqBody));
    if (res.message.statusCode != 200) {
        // If res has a body, read it and add it to the error message
        let body = "";
        try {
            body = await res.readBody();
        }
        catch (err) {
            // ignore
        }
        throw new Error(`Failed to promote release: Server responded with ${res.message.statusCode}: ${body}`);
    }
}
exports.promoteReleaseByAppId = promoteReleaseByAppId;
async function getRelease(vendorPortalApi, appSlug, releaseSequence) {
    const http = await (0, configuration_1.client)(vendorPortalApi);
    // 1. get the app id from the app slug
    const app = await (0, applications_1.getApplicationDetails)(vendorPortalApi, appSlug);
    // 2. get the release by app Id
    return getReleaseByAppId(vendorPortalApi, app.id, releaseSequence);
}
exports.getRelease = getRelease;
async function getReleaseByAppId(vendorPortalApi, appId, releaseSequence) {
    const http = await (0, configuration_1.client)(vendorPortalApi);
    const uri = `${vendorPortalApi.endpoint}/app/${appId}/release/${releaseSequence}`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
        throw new Error(`Failed to get release: Server responded with ${res.message.statusCode}`);
    }
    const body = JSON.parse(await res.readBody());
    return { sequence: body.release.sequence, charts: body.release.charts };
}
exports.getReleaseByAppId = getReleaseByAppId;
