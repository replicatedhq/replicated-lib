import { VendorPortalApi } from './configuration';
export declare class Channel {
    name: string;
    id: string;
    slug: string;
    releaseSequence?: number;
}
export declare function createChannel(vendorPortalApi: VendorPortalApi, appSlug: string, channelName: string): Promise<Channel>;
export declare function getChannelDetails(vendorPortalApi: VendorPortalApi, appSlug: string, channelName: string): Promise<Channel>;
export declare function archiveChannel(vendorPortalApi: VendorPortalApi, appSlug: string, channelName: string): Promise<void>;
export declare function findChannelDetailsInOutput(channels: any[], channelName: string): Promise<Channel>;
