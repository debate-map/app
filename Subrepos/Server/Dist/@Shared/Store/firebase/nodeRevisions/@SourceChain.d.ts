export declare class SourceChain {
    constructor(sources?: Source[]);
    sources: Source[];
}
export declare enum SourceType {
    Speech = 10,
    Writing = 20,
    Webpage = 50
}
export declare const Source_linkURLPattern = "^https?://[^\\s/$.?#]+\\.[^\\s]+$";
export declare class Source {
    type: SourceType;
    name: string;
    author: string;
    link: string;
}
export declare function GetSourceNamePlaceholderText(sourceType: SourceType): "speech name" | "book/document name";
export declare function GetSourceAuthorPlaceholderText(sourceType: SourceType): "speaker" | "book/document author";
