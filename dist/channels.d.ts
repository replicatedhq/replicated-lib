import { VendorPortalApi } from './configuration';
export declare class Channel {
    name: string;
    id: string;
    slug: string;
    releaseSequence?: number;
}
export declare const exportedForTesting: {
    getChannelByApplicationId: typeof getChannelByApplicationId;
    findChannelDetailsInOutput: typeof findChannelDetailsInOutput;
};
export declare function createChannel(vendorPortalApi: VendorPortalApi, appSlug: string, channelName: string): Promise<Channel>;
interface ChannelIdentifier {
    slug?: string;
    name?: string;
}
export declare function getChannelDetails(vendorPortalApi: VendorPortalApi, appSlug: string, { slug, name }: ChannelIdentifier): Promise<Channel>;
declare function getChannelByApplicationId(vendorPortalApi: VendorPortalApi, appid: string, { slug, name }: ChannelIdentifier): Promise<Channel>;
export declare function archiveChannel(vendorPortalApi: VendorPortalApi, appSlug: string, channelSlug: string): Promise<void>;
declare function findChannelDetailsInOutput(channels: any[], { slug, name }: ChannelIdentifier): Promise<Channel>;
export {};
