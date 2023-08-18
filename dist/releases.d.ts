import { VendorPortalApi } from "./configuration";
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
export declare function createRelease(vendorPortalApi: VendorPortalApi, appSlug: string, yamlDir: string): Promise<Release>;
export declare function createReleaseFromChart(vendorPortalApi: VendorPortalApi, appSlug: string, chart: string): Promise<Release>;
export declare const gzipData: (data: any) => string;
export declare const exportedForTesting: {
    areReleaseChartsPushed: typeof areReleaseChartsPushed;
    getReleaseByAppId: typeof getReleaseByAppId;
    isReleaseReadyForInstall: typeof isReleaseReadyForInstall;
    promoteReleaseByAppId: typeof promoteReleaseByAppId;
    readChart: typeof readChart;
};
declare function readChart(chart: string): Promise<KotsSingleSpec[]>;
export declare function promoteRelease(vendorPortalApi: VendorPortalApi, appSlug: string, channelId: string, releaseSequence: number, version: string): Promise<void>;
declare function promoteReleaseByAppId(vendorPortalApi: VendorPortalApi, appId: string, channelId: string, releaseSequence: number, version: string): Promise<void>;
declare function isReleaseReadyForInstall(vendorPortalApi: VendorPortalApi, appId: string, releaseSequence: number): Promise<boolean>;
declare function areReleaseChartsPushed(charts: ReleaseChart[]): boolean;
declare function getReleaseByAppId(vendorPortalApi: VendorPortalApi, appId: string, releaseSequence: number): Promise<Release>;
export {};
