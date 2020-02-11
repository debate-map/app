export declare class TimelineStep {
    constructor(initialData: Partial<TimelineStep>);
    _key: string;
    timelineID: string;
    title: string;
    groupID: number;
    videoTime: number;
    message: string;
    nodeReveals: NodeReveal[];
}
export declare class NodeReveal {
    path: string;
    show: boolean;
    show_revealDepth: number;
    hide: boolean;
}
