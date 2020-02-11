import { SourceChain } from "../nodeRevisions/@SourceChain";
export declare enum ImageType {
    Photo = 10,
    Illustration = 20
}
export declare function GetNiceNameForImageType(type: ImageType): string;
export declare class Image {
    constructor(initialData: {
        name: string;
        type: ImageType;
    } & Partial<Image>);
    _key: string;
    name: string;
    type: ImageType;
    url: string;
    description: string;
    previewWidth: number;
    sourceChains: SourceChain[];
    creator: string;
    createdAt: number;
}
export declare const Image_namePattern = "^[a-zA-Z0-9 ,'\"%\\-()\\/]+$";
export declare const Image_urlPattern = "^https?://[^\\s/$.?#]+\\.[^\\s]+\\.(jpg|jpeg|gif|png)$";
