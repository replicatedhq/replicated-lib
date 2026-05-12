import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import * as picomatch from "picomatch";

export interface ChartConfig {
  path: string;
  chartVersion?: string;
  appVersion?: string;
}

export interface PreflightConfig {
  path: string;
  chartName?: string;
  chartVersion?: string;
}

export interface ReplLintConfig {
  version?: number;
  tools?: Record<string, string>;
  linters?: {
    helm?: { disabled?: boolean };
  };
}

export interface ReplicatedConfig {
  appId?: string;
  appSlug?: string;
  charts?: ChartConfig[];
  manifests?: string[];
  preflights?: PreflightConfig[];
  promoteToChannelIds?: string[];
  promoteToChannelNames?: string[];
  releaseLabel?: string;
  replLint?: ReplLintConfig;
}

export function findAndParseConfig(startPath: string): ReplicatedConfig | null {
  const absPath = path.resolve(startPath);
  const stats = fs.statSync(absPath);

  if (stats.isFile()) {
    return parseConfigFile(absPath);
  }

  const configs: ReplicatedConfig[] = [];
  let currentDir = absPath;

  while (true) {
    const candidates = [path.join(currentDir, ".replicated"), path.join(currentDir, ".replicated.yaml")];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        configs.push(parseConfigFile(candidate));
        break;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  if (configs.length === 0) {
    return null;
  }

  const rootToLeaf = [...configs].reverse();
  let merged: ReplicatedConfig = {};
  for (const config of rootToLeaf) {
    merged = mergeConfigs(merged, config);
  }

  return merged;
}

export function parseConfigFile(filePath: string): ReplicatedConfig {
  const content = fs.readFileSync(filePath, "utf-8");
  let parsed: any;
  try {
    parsed = yaml.parse(content);
  } catch (err: any) {
    throw new Error(`Failed to parse config file ${filePath}: ${err.message}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid config file ${filePath}: expected YAML object`);
  }

  const config: ReplicatedConfig = {
    appId: parsed.appId,
    appSlug: parsed.appSlug,
    releaseLabel: parsed.releaseLabel,
    charts: parsed.charts,
    manifests: parsed.manifests,
    preflights: parsed.preflights,
    promoteToChannelIds: parsed.promoteToChannelIds,
    promoteToChannelNames: parsed.promoteToChannelNames,
    replLint: parsed["repl-lint"] || parsed.replLint
  };

  validateConfig(config);
  resolvePaths(config, filePath);
  return config;
}

function validateConfig(config: ReplicatedConfig): void {
  if (config.charts) {
    if (!Array.isArray(config.charts)) {
      throw new Error("Invalid config: charts must be an array");
    }
    for (let i = 0; i < config.charts.length; i++) {
      if (!config.charts[i] || typeof config.charts[i] !== "object") {
        throw new Error(`Invalid config: chart[${i}] must be an object`);
      }
      if (!config.charts[i].path || typeof config.charts[i].path !== "string" || config.charts[i].path.trim() === "") {
        throw new Error(`chart[${i}]: path is required`);
      }
    }
  }

  if (config.preflights) {
    if (!Array.isArray(config.preflights)) {
      throw new Error("Invalid config: preflights must be an array");
    }
    for (let i = 0; i < config.preflights.length; i++) {
      if (!config.preflights[i] || typeof config.preflights[i] !== "object") {
        throw new Error(`Invalid config: preflight[${i}] must be an object`);
      }
      if (!config.preflights[i].path || typeof config.preflights[i].path !== "string" || config.preflights[i].path.trim() === "") {
        throw new Error(`preflight[${i}]: path is required`);
      }
      if (config.preflights[i].chartName && !config.preflights[i].chartVersion) {
        throw new Error(`preflight[${i}]: chartVersion is required when chartName is specified`);
      }
      if (config.preflights[i].chartVersion && !config.preflights[i].chartName) {
        throw new Error(`preflight[${i}]: chartName is required when chartVersion is specified`);
      }
    }
  }

  if (config.manifests) {
    if (!Array.isArray(config.manifests)) {
      throw new Error("Invalid config: manifests must be an array");
    }
    for (let i = 0; i < config.manifests.length; i++) {
      if (config.manifests[i] === "") {
        throw new Error(`manifest[${i}]: path cannot be empty string`);
      }
      if (typeof config.manifests[i] !== "string") {
        throw new Error(`manifest[${i}]: must be a string`);
      }
    }
  }

  if (config.promoteToChannelIds && !Array.isArray(config.promoteToChannelIds)) {
    throw new Error("Invalid config: promoteToChannelIds must be an array");
  }
  if (config.promoteToChannelNames && !Array.isArray(config.promoteToChannelNames)) {
    throw new Error("Invalid config: promoteToChannelNames must be an array");
  }

  validateGlobPatterns(config);
}

function validateGlobPatterns(config: ReplicatedConfig): void {
  const paths: string[] = [];
  if (config.charts) {
    paths.push(...config.charts.map(c => c.path));
  }
  if (config.preflights) {
    paths.push(...config.preflights.map(p => p.path));
  }
  if (config.manifests) {
    paths.push(...config.manifests);
  }

  for (const p of paths) {
    if (/[*?[{]/.test(p)) {
      if (!isValidGlob(p)) {
        throw new Error(`invalid glob pattern: ${p}`);
      }
    }
  }
}

function isValidGlob(pattern: string): boolean {
  let braceDepth = 0;
  for (const char of pattern) {
    if (char === "{") braceDepth++;
    if (char === "}") braceDepth--;
    if (braceDepth < 0) return false;
  }
  if (braceDepth !== 0) return false;
  if (pattern.includes("{}")) return false;
  return true;
}

function resolvePaths(config: ReplicatedConfig, configFilePath: string): void {
  const configDir = path.dirname(configFilePath);

  if (config.charts) {
    for (let i = 0; i < config.charts.length; i++) {
      if (!path.isAbsolute(config.charts[i].path)) {
        config.charts[i].path = path.resolve(configDir, config.charts[i].path);
      }
    }
  }

  if (config.preflights) {
    for (let i = 0; i < config.preflights.length; i++) {
      if (config.preflights[i].path && !path.isAbsolute(config.preflights[i].path)) {
        config.preflights[i].path = path.resolve(configDir, config.preflights[i].path);
      }
    }
  }

  if (config.manifests) {
    for (let i = 0; i < config.manifests.length; i++) {
      if (!path.isAbsolute(config.manifests[i])) {
        config.manifests[i] = path.resolve(configDir, config.manifests[i]);
      }
    }
  }
}

function mergeConfigs(parent: ReplicatedConfig, child: ReplicatedConfig): ReplicatedConfig {
  const merged: ReplicatedConfig = { ...parent };

  if (child.appId !== undefined) merged.appId = child.appId;
  if (child.appSlug !== undefined) merged.appSlug = child.appSlug;
  if (child.releaseLabel !== undefined) merged.releaseLabel = child.releaseLabel;
  if (child.replLint !== undefined) merged.replLint = child.replLint;

  if (child.promoteToChannelIds !== undefined) merged.promoteToChannelIds = child.promoteToChannelIds;
  if (child.promoteToChannelNames !== undefined) merged.promoteToChannelNames = child.promoteToChannelNames;

  if (child.charts !== undefined) {
    merged.charts = [...(merged.charts || []), ...child.charts];
    const seen = new Set<string>();
    merged.charts = merged.charts.filter(chart => {
      if (seen.has(chart.path)) return false;
      seen.add(chart.path);
      return true;
    });
  }

  if (child.manifests !== undefined) {
    merged.manifests = [...(merged.manifests || []), ...child.manifests];
    const seen = new Set<string>();
    merged.manifests = merged.manifests.filter(m => {
      if (seen.has(m)) return false;
      seen.add(m);
      return true;
    });
  }

  if (child.preflights !== undefined) {
    merged.preflights = [...(merged.preflights || []), ...child.preflights];
    const seen = new Set<string>();
    merged.preflights = merged.preflights.filter(p => {
      if (seen.has(p.path)) return false;
      seen.add(p.path);
      return true;
    });
  }

  return merged;
}
