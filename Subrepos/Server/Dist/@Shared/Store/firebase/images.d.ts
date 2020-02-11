import { Image } from "./images/@Image";
export declare const GetImage: ((id: string) => Image) & {
    Wait: (id: string) => Image;
};
export declare const GetImages: (() => Image[]) & {
    Wait: () => Image[];
};
export declare const GetImagesByURL: ((url: string) => Image[]) & {
    Wait: (url: string) => Image[];
};
