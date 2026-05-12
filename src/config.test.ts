import * as path from "path";
import * as fs from "fs-extra";
import * as os from "os";
import { findAndParseConfig, parseConfigFile, ReplicatedConfig } from "./config";

describe("findAndParseConfig", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "replicated-config-test-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("returns null when no config file exists", () => {
    const result = findAndParseConfig(tmpDir);
    expect(result).toBeNull();
  });

  it("parses .replicated in current directory", async () => {
    const configPath = path.join(tmpDir, ".replicated");
    await fs.writeFile(configPath, "appSlug: my-app\ncharts:\n  - path: ./chart\nmanifests:\n  - ./manifest.yaml\n");

    const result = findAndParseConfig(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.appSlug).toBe("my-app");
    expect(result!.charts).toHaveLength(1);
    expect(result!.charts![0].path).toBe(path.resolve(tmpDir, "chart"));
    expect(result!.manifests).toHaveLength(1);
    expect(result!.manifests![0]).toBe(path.resolve(tmpDir, "manifest.yaml"));
  });

  it("falls back to .replicated.yaml", async () => {
    const configPath = path.join(tmpDir, ".replicated.yaml");
    await fs.writeFile(configPath, "appSlug: fallback-app\n");

    const result = findAndParseConfig(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.appSlug).toBe("fallback-app");
  });

  it("prefers .replicated over .replicated.yaml", async () => {
    await fs.writeFile(path.join(tmpDir, ".replicated"), "appSlug: primary\n");
    await fs.writeFile(path.join(tmpDir, ".replicated.yaml"), "appSlug: secondary\n");

    const result = findAndParseConfig(tmpDir);
    expect(result!.appSlug).toBe("primary");
  });

  it("resolves relative paths to absolute", async () => {
    const subDir = path.join(tmpDir, "subdir");
    await fs.ensureDir(subDir);
    const configPath = path.join(subDir, ".replicated");
    await fs.writeFile(configPath, "charts:\n  - path: ../chart\nmanifests:\n  - ../manifests/*.yaml\n");

    const result = findAndParseConfig(subDir);
    expect(result!.charts![0].path).toBe(path.resolve(tmpDir, "chart"));
    expect(result!.manifests![0]).toBe(path.resolve(tmpDir, "manifests", "*.yaml"));
  });

  it("merges parent and child configs in monorepo walk", async () => {
    const parentDir = tmpDir;
    const childDir = path.join(tmpDir, "child", "grandchild");
    await fs.ensureDir(childDir);

    await fs.writeFile(path.join(parentDir, ".replicated"), "appSlug: parent-app\ncharts:\n  - path: ./parent-chart\nmanifests:\n  - ./parent-manifest.yaml\npromoteToChannelNames:\n  - parent-channel\n");

    await fs.writeFile(path.join(childDir, ".replicated"), "appSlug: child-app\ncharts:\n  - path: ./child-chart\npromoteToChannelNames:\n  - child-channel\n");

    const result = findAndParseConfig(childDir);
    expect(result).not.toBeNull();
    expect(result!.appSlug).toBe("child-app");
    expect(result!.charts).toHaveLength(2);
    expect(result!.charts![0].path).toBe(path.resolve(parentDir, "parent-chart"));
    expect(result!.charts![1].path).toBe(path.resolve(childDir, "child-chart"));
    expect(result!.manifests).toHaveLength(1);
    expect(result!.manifests![0]).toBe(path.resolve(parentDir, "parent-manifest.yaml"));
    expect(result!.promoteToChannelNames).toEqual(["child-channel"]);
  });

  it("deduplicates merged resources by absolute path", async () => {
    const parentDir = tmpDir;
    const childDir = path.join(tmpDir, "child");
    await fs.ensureDir(childDir);

    await fs.writeFile(path.join(parentDir, ".replicated"), "charts:\n  - path: ./chart\n");
    await fs.writeFile(path.join(childDir, ".replicated"), "charts:\n  - path: ../chart\n");

    const result = findAndParseConfig(childDir);
    expect(result!.charts).toHaveLength(1);
  });

  it("parses a file directly when startPath is a file", async () => {
    const configPath = path.join(tmpDir, "custom.replicated");
    await fs.writeFile(configPath, "appSlug: file-app\n");

    const result = findAndParseConfig(configPath);
    expect(result).not.toBeNull();
    expect(result!.appSlug).toBe("file-app");
  });
});

describe("parseConfigFile", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "replicated-parse-test-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("parses valid YAML", async () => {
    const configPath = path.join(tmpDir, ".replicated");
    await fs.writeFile(configPath, "appSlug: test\ncharts:\n  - path: ./chart\n");

    const result = parseConfigFile(configPath);
    expect(result.appSlug).toBe("test");
    expect(result.charts).toHaveLength(1);
    expect(result.charts![0].path).toBe(path.resolve(tmpDir, "chart"));
  });

  it("throws on invalid YAML", async () => {
    const configPath = path.join(tmpDir, ".replicated");
    await fs.writeFile(configPath, "appSlug: [invalid");

    expect(() => parseConfigFile(configPath)).toThrow("Failed to parse config file");
  });

  it("throws on empty chart path", async () => {
    const configPath = path.join(tmpDir, ".replicated");
    await fs.writeFile(configPath, 'charts:\n  - path: ""\n');

    expect(() => parseConfigFile(configPath)).toThrow("chart[0]: path is required");
  });

  it("throws on empty manifest string", async () => {
    const configPath = path.join(tmpDir, ".replicated");
    await fs.writeFile(configPath, 'manifests:\n  - ""\n');

    expect(() => parseConfigFile(configPath)).toThrow("manifest[0]: path cannot be empty string");
  });

  it("throws on preflight missing chartVersion when chartName is set", async () => {
    const configPath = path.join(tmpDir, ".replicated");
    await fs.writeFile(configPath, "preflights:\n  - path: ./preflight.yaml\n    chartName: my-chart\n");

    expect(() => parseConfigFile(configPath)).toThrow("preflight[0]: chartVersion is required when chartName is specified");
  });

  it("throws on preflight missing chartName when chartVersion is set", async () => {
    const configPath = path.join(tmpDir, ".replicated");
    await fs.writeFile(configPath, "preflights:\n  - path: ./preflight.yaml\n    chartVersion: 1.0.0\n");

    expect(() => parseConfigFile(configPath)).toThrow("preflight[0]: chartName is required when chartVersion is specified");
  });

  it("parses repl-lint config", async () => {
    const configPath = path.join(tmpDir, ".replicated");
    await fs.writeFile(configPath, "repl-lint:\n  version: 1\n  tools:\n    helm: latest\n");

    const result = parseConfigFile(configPath);
    expect(result.replLint).toEqual({ version: 1, tools: { helm: "latest" } });
  });

  it("throws on invalid glob pattern with unbalanced braces", async () => {
    const configPath = path.join(tmpDir, ".replicated");
    await fs.writeFile(configPath, "manifests:\n  - ./manifests/{a,b.yaml\n");

    expect(() => parseConfigFile(configPath)).toThrow("invalid glob pattern");
  });
});
