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
export declare const gzipData: (data: any) => string;
export declare function promoteRelease(vendorPortalApi: VendorPortalApi, appSlug: string, channelId: string, releaseSequence: number, version: string): Promise<void>;
export declare function promoteReleaseByAppId(vendorPortalApi: VendorPortalApi, appId: string, channelId: string, releaseSequence: number, version: string): Promise<void>;
export declare function areReleaseChartsPushed(charts: ReleaseChart[]): boolean;
export declare function getRelease(vendorPortalApi: VendorPortalApi, appSlug: string, releaseSequence: number): Promise<Release>;
export declare function getReleaseByAppId(vendorPortalApi: VendorPortalApi, appId: string, releaseSequence: number): Promise<Release>;
