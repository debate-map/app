import { ObservableMap } from "mobx";
export declare type RatingsRoot_ForDBTree = ObservableMap<string, RatingsSet_ForDBTree>;
export declare type RatingsSet_ForDBTree = ObservableMap<string, Rating>;
export declare type RatingsSet = {
    [key: string]: Rating;
};
export declare class Rating {
    constructor(value: number);
    _key?: string;
    updated: number;
    value: number;
}
