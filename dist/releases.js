"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportCompatibilityResult = exports.promoteRelease = exports.gzipData = exports.createReleaseFromChart = exports.createRelease = exports.exportedForTesting = void 0;
const applications_1 = require("./applications");
const pako_1 = require("pako");
const path = require("path");
const fs = require("fs");
const util = require("util");
const base64 = require("base64-js");
const date_fns_tz_1 = require("date-fns-tz");
exports.exportedForTesting = {
    areReleaseChartsPushed,
    getReleaseByAppId,
    isReleaseReadyForInstall,
    promoteReleaseByAppId,
    readChart,
    reportCompatibilityResultByAppId
};
async function createRelease(vendorPortalApi, appSlug, yamlDir) {
    var _a;
    const http = await vendorPortalApi.client();
    // 1. get the app id from the app slug
    const app = await (0, applications_1.getApplicationDetails)(vendorPortalApi, appSlug);
    // 2. create the release
    const createReleasePayload = await readYAMLDir(yamlDir);
    const reqBody = {
        spec_gzip: (0, exports.gzipData)(createReleasePayload)
    };
    const createReleaseUri = `${vendorPortalApi.endpoint}/app/${app.id}/release`;
    const createReleaseRes = await http.post(createReleaseUri, JSON.stringify(reqBody));
    if (createReleaseRes.message.statusCode != 201) {
        // discard the response body
        await createReleaseRes.readBody();
        throw new Error(`Failed to create release: Server responded with ${createReleaseRes.message.statusCode}`);
    }
    const createReleaseBody = JSON.parse(await createReleaseRes.readBody());
    console.log(`Created release with sequence number ${createReleaseBody.release.sequence}`);
    // 3. If contains charts, wait for charts to be ready
    // If there are charts, wait for them to be ready
    if (((_a = createReleaseBody.release.charts) === null || _a === void 0 ? void 0 : _a.length) > 0) {
        const isReleaseReady = await isReleaseReadyForInstall(vendorPortalApi, app.id, createReleaseBody.release.sequence);
        if (!isReleaseReady) {
            throw new Error(`Release ${createReleaseBody.release.sequence} is not ready`);
        }
    }
    return { sequence: createReleaseBody.release.sequence, charts: createReleaseBody.release.charts };
}
exports.createRelease = createRelease;
async function createReleaseFromChart(vendorPortalApi, appSlug, chart) {
    var _a;
    const http = await vendorPortalApi.client();
    // 1. get the app id from the app slug
    const app = await (0, applications_1.getApplicationDetails)(vendorPortalApi, appSlug);
    // 2. create the release
    const createReleasePayload = await readChart(chart);
    const reqBody = {
        spec_gzip: (0, exports.gzipData)(createReleasePayload)
    };
    const createReleaseUri = `${vendorPortalApi.endpoint}/app/${app.id}/release`;
    const createReleaseRes = await http.post(createReleaseUri, JSON.stringify(reqBody));
    if (createReleaseRes.message.statusCode != 201) {
        // discard the response body
        await createReleaseRes.readBody();
        throw new Error(`Failed to create release: Server responded with ${createReleaseRes.message.statusCode}`);
    }
    const createReleaseBody = JSON.parse(await createReleaseRes.readBody());
    console.log(`Created release with sequence number ${createReleaseBody.release.sequence}`);
    // 3. If contains charts, wait for charts to be ready
    // If there are charts, wait for them to be ready
    if (((_a = createReleaseBody.release.charts) === null || _a === void 0 ? void 0 : _a.length) > 0) {
        const isReleaseReady = await isReleaseReadyForInstall(vendorPortalApi, app.id, createReleaseBody.release.sequence);
        if (!isReleaseReady) {
            throw new Error(`Release ${createReleaseBody.release.sequence} is not ready`);
        }
    }
    return { sequence: createReleaseBody.release.sequence, charts: createReleaseBody.release.charts };
}
exports.createReleaseFromChart = createReleaseFromChart;
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
                allKotsReleaseSpecs.push({
                    name: file,
                    path: path.join(prefix, file),
                    content: "",
                    children: subdir
                });
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
async function readChart(chart) {
    const allKotsReleaseSpecs = [];
    if ((await stat(chart)).isDirectory()) {
        throw new Error(`Chart ${chart} is a directory, not a file`);
    }
    const spec = await encodeKotsFile(path.dirname(chart), path.basename(chart));
    if (spec) {
        allKotsReleaseSpecs.push(spec);
    }
    return allKotsReleaseSpecs;
}
function isSupportedExt(ext) {
    const supportedExts = [".tgz", ".gz", ".yaml", ".yml", ".css", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".svg"];
    return supportedExts.includes(ext);
}
async function promoteRelease(vendorPortalApi, appSlug, channelId, releaseSequence, version) {
    // 1. get the app id from the app slug
    const app = await (0, applications_1.getApplicationDetails)(vendorPortalApi, appSlug);
    // 2. promote the release
    await promoteReleaseByAppId(vendorPortalApi, app.id, channelId, releaseSequence, version);
}
exports.promoteRelease = promoteRelease;
async function promoteReleaseByAppId(vendorPortalApi, appId, channelId, releaseSequence, version) {
    const http = await vendorPortalApi.client();
    const reqBody = {
        versionLabel: version,
        channelIds: [channelId]
    };
    const uri = `${vendorPortalApi.endpoint}/app/${appId}/release/${releaseSequence}/promote`;
    const res = await http.post(uri, JSON.stringify(reqBody));
    if (res.message.statusCode != 200) {
        let body = "";
        try {
            body = await res.readBody();
        }
        catch (err) {
            // ignore
        }
        throw new Error(`Failed to promote release: Server responded with ${res.message.statusCode}: ${body}`);
    }
    // discard the response body
    await res.readBody();
}
async function isReleaseReadyForInstall(vendorPortalApi, appId, releaseSequence) {
    var _a;
    let release = await getReleaseByAppId(vendorPortalApi, appId, releaseSequence);
    if (((_a = release.charts) === null || _a === void 0 ? void 0 : _a.length) === 0) {
        throw new Error(`Release ${releaseSequence} does not contain any charts`);
    }
    const sleeptime = 5;
    const timeout = 30 * release.charts.length;
    // iterate for timeout/sleeptime times
    for (let i = 0; i < timeout / sleeptime; i++) {
        release = await getReleaseByAppId(vendorPortalApi, appId, releaseSequence);
        const ready = areReleaseChartsPushed(release.charts);
        if (ready) {
            return true;
        }
        console.debug(`Release ${releaseSequence} is not ready, sleeping for ${sleeptime} seconds`);
        await new Promise(f => setTimeout(f, sleeptime * 1000));
    }
    return false;
}
function areReleaseChartsPushed(charts) {
    let pushedChartsCount = 0;
    let chartsCount = 0;
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
async function getReleaseByAppId(vendorPortalApi, appId, releaseSequence) {
    const http = await vendorPortalApi.client();
    const uri = `${vendorPortalApi.endpoint}/app/${appId}/release/${releaseSequence}`;
    const res = await http.get(uri);
    if (res.message.statusCode != 200) {
        // discard the response body
        await res.readBody();
        throw new Error(`Failed to get release: Server responded with ${res.message.statusCode}`);
    }
    const body = JSON.parse(await res.readBody());
    return { sequence: body.release.sequence, charts: body.release.charts };
}
async function reportCompatibilityResult(vendorPortalApi, appSlug, releaseSequence, compatibilityResult) {
    // 1. get the app id from the app slug
    const app = await (0, applications_1.getApplicationDetails)(vendorPortalApi, appSlug);
    // 2. promote the release
    await reportCompatibilityResultByAppId(vendorPortalApi, app.id, releaseSequence, compatibilityResult);
}
exports.reportCompatibilityResult = reportCompatibilityResult;
async function reportCompatibilityResultByAppId(vendorPortalApi, appId, releaseSequence, compatibilityResult) {
    const http = await vendorPortalApi.client();
    const reqBody = {
        distribution: compatibilityResult.distribution,
        version: compatibilityResult.version
    };
    if (compatibilityResult.successAt) {
        const successAt = (0, date_fns_tz_1.zonedTimeToUtc)(compatibilityResult.successAt, "UTC");
        reqBody["successAt"] = successAt.toISOString();
        reqBody["successNotes"] = compatibilityResult.successNotes;
    }
    if (compatibilityResult.failureAt) {
        const failureAt = (0, date_fns_tz_1.zonedTimeToUtc)(compatibilityResult.failureAt, "UTC");
        reqBody["failureAt"] = failureAt.toISOString();
        reqBody["failureNotes"] = compatibilityResult.failureNotes;
    }
    const uri = `${vendorPortalApi.endpoint}/app/${appId}/release/${releaseSequence}/compatibility`;
    const res = await http.post(uri, JSON.stringify(reqBody));
    if (res.message.statusCode != 201) {
        let body = "";
        try {
            body = await res.readBody();
        }
        catch (err) {
            // ignore
        }
        throw new Error(`Failed to report compatibility results: Server responded with ${res.message.statusCode}: ${body}`);
    }
    // discard the response body
    await res.readBody();
}
