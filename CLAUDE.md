# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript SDK library for interacting with the Replicated Vendor Portal API. Published as `replicated-lib` on npm. Used by GitHub Actions and other automation tools to manage applications, releases, channels, customers, and test clusters in the Replicated platform.

## Development Commands

**Build**
```bash
npm run build              # Compile TypeScript to dist/
```

**Testing**
```bash
npm test                   # Run all tests with coverage
```

**Code Formatting**
```bash
npm run prettier           # Format all TypeScript files
```

**Running Examples**
Examples demonstrate SDK usage and are in `examples/`. They compile to JS and run:
```bash
npm run create-object-store        # Create object store addon on cluster
npm run create-postgres            # Create postgres addon
npm run expose-port                # Expose cluster port
npm run poll-airgap                # Poll for airgap build status
npm run test-list-customers        # Test customer listing
```

Examples require `REPLICATED_API_TOKEN` environment variable and command-line arguments (e.g., cluster ID).

## Architecture

### Core Configuration (`src/configuration.ts`)

**VendorPortalApi** - Central configuration class for all API interactions:
- `endpoint`: API base URL (default: `https://api.replicated.com/vendor/v3`)
- `apiToken`: Authentication token (required)
- `client()`: Returns configured HTTP client with headers

All API modules receive a `VendorPortalApi` instance as their first parameter. The client automatically adds GitHub Actions metadata headers when running in CI.

### Module Organization

Each domain has its own file in `src/` with:
- Type definitions and classes
- Async functions that take `VendorPortalApi` as first param
- Error handling with descriptive messages

**applications.ts** - Application management
- `getApplicationDetails()`: Get app ID from slug

**channels.ts** - Release channel operations
- `createChannel()`, `getChannelDetails()`, `archiveChannel()`
- `pollForAirgapReleaseStatus()`, `getDownloadUrlAirgapBuildRelease()`

**clusters.ts** - Test cluster lifecycle
- `createCluster()`, `createClusterWithLicense()`, `removeCluster()`, `upgradeCluster()`
- `pollForStatus()`: Wait for cluster readiness
- `getKubeconfig()`: Download cluster kubeconfig
- `createAddonObjectStore()`, `exposeClusterPort()`: Cluster addons
- `getClusterVersions()`: List available versions

**customers.ts** - Customer and license management
- `createCustomer()`, `archiveCustomer()`
- `listCustomersByName()`, `listCustomersByEmail()`
- `getUsedKubernetesDistributions()`: Analytics data

**releases.ts** - Release management
- `createRelease()`, `createReleaseFromChart()`: Create releases
- `promoteRelease()`: Promote to channel
- `reportCompatibilityResult()`: Report cluster compatibility

All exports are re-exported through `src/index.ts`.

### Testing Approach

**Unit Tests** - Co-located with source (`*.spec.ts`)
- Use Jest with esbuild-jest for fast TypeScript compilation
- Run with `npm test`

**Contract Tests** - Pact framework in `pacts/`
- Consumer: `npm_consumer`
- Provider: `vp_service`
- Configuration in `pacts/configuration.ts` sets up global provider
- Contract file: `pacts/npm_consumer-vp_service.json`

Tests run with `--setupFiles ./pacts/configuration.ts` to initialize Pact globally.

### Common Patterns

**API Call Pattern**:
```typescript
export async function someFunction(vendorPortalApi: VendorPortalApi, ...args): Promise<ReturnType> {
  const http = await vendorPortalApi.client();
  const uri = `${vendorPortalApi.endpoint}/some/path`;
  const res = await http.get(uri);

  if (res.message.statusCode != 200) {
    await res.readBody(); // discard body
    throw new Error(`Failed to ...: Server responded with ${res.message.statusCode}`);
  }

  const body = JSON.parse(await res.readBody());
  return body;
}
```

**Polling Pattern**:
Functions like `pollForStatus()` and `pollForAddonStatus()` use async loops with delays to wait for resource readiness. They throw errors on timeout or failure states.

## Key Details

- **Node Version**: Requires Node.js >=20.0.0
- **HTTP Client**: Uses `@actions/http-client` (GitHub Actions toolkit)
- **Output**: CommonJS modules in `dist/` directory
- **Entry Point**: `dist/index.js` with types at `dist/index.d.ts`
- **Prettier Config**: 300 char line width, 2 space tabs, no trailing commas
- **TypeScript**: ES2017 target, CommonJS modules, declaration files generated
