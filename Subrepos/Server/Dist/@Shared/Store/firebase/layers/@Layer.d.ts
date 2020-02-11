import { ObservableMap } from "mobx";
export declare class Layer {
    constructor(initialData: {
        name: string;
        creator: string;
    } & Partial<Layer>);
    _key: string;
    name: string;
    creator: string;
    createdAt: number;
    mapsWhereEnabled: ObservableMap<string, boolean>;
    nodeSubnodes: ObservableMap<string, LayerNodeSubnodes>;
}
export declare type LayerNodeSubnodes = ObservableMap<string, boolean>;
