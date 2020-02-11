export declare class MapNodePhrasing {
    constructor(initialData: {
        node: string;
    } & Partial<MapNodePhrasing>);
    _key?: string;
    node: string;
    type: MapNodePhrasingType;
    text: string;
    description: string;
    creator: string;
    createdAt: number;
}
export declare enum MapNodePhrasingType {
    Precise = 10,
    Natural = 20
}
