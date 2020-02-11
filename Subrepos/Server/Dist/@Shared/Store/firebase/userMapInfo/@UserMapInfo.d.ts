import { ObservableMap } from "mobx";
export declare type UserMapInfoSet = {
    _key: string;
    maps: ObservableMap<string, UserMapInfo>;
};
export declare class UserMapInfo {
    _key: string;
    layerStates: LayerStatesMap;
}
export declare type LayerStatesMap = ObservableMap<string, boolean>;
