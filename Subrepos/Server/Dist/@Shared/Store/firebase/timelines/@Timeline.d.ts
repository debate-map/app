export declare class Timeline {
    constructor(initialData: {
        name: string;
        creator: string;
    } & Partial<Timeline>);
    _key: string;
    mapID: string;
    name: string;
    creator: string;
    createdAt: number;
    videoID: string;
    videoStartTime: number;
    videoHeightVSWidthPercent: number;
    steps: string[];
}
